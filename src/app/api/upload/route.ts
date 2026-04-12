export const dynamic = "force-dynamic";
export const maxDuration = 30; // Allow up to 30s for image processing
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import sharp from "sharp";
import { logAuditEvent } from "@/lib/audit-logger";
import { uploadToR2, generateFileKey, validateFile, getPublicUrl, type FileCategory } from "@/lib/r2";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limiter";

// ==========================================
// העלאת קבצים — File Upload API (R2)
// ==========================================

const MAX_FILENAME_LENGTH = 255;

// Image optimization threshold (500KB)
const IMAGE_OPTIMIZATION_THRESHOLD = 500 * 1024;
const IMAGE_MAX_DIMENSION = 2000;

// Types that can be converted to WebP
const CONVERTIBLE_TO_WEBP = ["image/jpeg", "image/png"];

// Types eligible for optimization and thumbnail generation
const IMAGE_TYPES_FOR_PROCESSING = ["image/jpeg", "image/png", "image/webp"];

/**
 * Calculate SHA-256 hash of a buffer
 */
function calculateHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Check if a file with the same hash already exists across image models.
 * Returns the existing record's URLs if found.
 */
async function findExistingByHash(
  fileHash: string
): Promise<{
  imageUrl: string;
  thumbnailUrl: string | null;
  mediumUrl: string | null;
  r2Key: string | null;
  fileHash: string | null;
} | null> {
  // Check DesignerProjectImage
  const designerImage = await prisma.designerProjectImage.findFirst({
    where: { fileHash },
    select: { imageUrl: true, thumbnailUrl: true, mediumUrl: true, r2Key: true, fileHash: true },
  });
  if (designerImage) return designerImage;

  // Check CrmProjectPhoto
  const crmPhoto = await prisma.crmProjectPhoto.findFirst({
    where: { fileHash },
    select: { imageUrl: true, thumbnailUrl: true, mediumUrl: true, r2Key: true, fileHash: true },
  });
  if (crmPhoto) return crmPhoto;

  // Check CrmClientUpload
  const clientUpload = await prisma.crmClientUpload.findFirst({
    where: { fileHash },
    select: { imageUrl: true, thumbnailUrl: true, mediumUrl: true, r2Key: true, fileHash: true },
  });
  if (clientUpload) return clientUpload;

  return null;
}

/**
 * Optimize an image buffer using sharp.
 * Returns the optimized buffer and (possibly updated) content type,
 * or the originals when optimization is skipped.
 */
async function optimizeImage(
  buffer: Buffer,
  contentType: string
): Promise<{ buffer: Buffer; contentType: string }> {
  // Only optimize JPEG, PNG, and WebP above the size threshold
  if (!IMAGE_TYPES_FOR_PROCESSING.includes(contentType)) return { buffer, contentType };
  if (buffer.length <= IMAGE_OPTIMIZATION_THRESHOLD) return { buffer, contentType };

  const originalSize = buffer.length;

  try {
    let pipeline = sharp(buffer).resize({
      width: IMAGE_MAX_DIMENSION,
      height: IMAGE_MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    });

    let optimizedBuffer: Buffer;

    switch (contentType) {
      case "image/jpeg":
        optimizedBuffer = await pipeline.jpeg({ quality: 85 }).toBuffer();
        break;
      case "image/png":
        optimizedBuffer = await pipeline.png({ compressionLevel: 9, quality: 85 }).toBuffer();
        break;
      case "image/webp":
        optimizedBuffer = await pipeline.webp({ quality: 85 }).toBuffer();
        break;
      default:
        return { buffer, contentType };
    }

    console.log(
      `[upload] Image optimized: ${(originalSize / 1024).toFixed(1)}KB → ${(optimizedBuffer.length / 1024).toFixed(1)}KB (${contentType})`
    );

    return { buffer: optimizedBuffer, contentType };
  } catch (err) {
    console.warn("[upload] Image optimization failed, using original:", err);
    return { buffer, contentType };
  }
}

/**
 * Convert JPEG/PNG to WebP format using sharp.
 * GIF and other formats are left as-is.
 */
async function convertToWebP(
  buffer: Buffer,
  contentType: string
): Promise<{ buffer: Buffer; contentType: string }> {
  if (!CONVERTIBLE_TO_WEBP.includes(contentType)) return { buffer, contentType };

  try {
    const webpBuffer = await sharp(buffer).webp({ quality: 85 }).toBuffer();
    console.log(
      `[upload] Converted ${contentType} → image/webp: ${(buffer.length / 1024).toFixed(1)}KB → ${(webpBuffer.length / 1024).toFixed(1)}KB`
    );
    return { buffer: webpBuffer, contentType: "image/webp" };
  } catch (err) {
    console.warn("[upload] WebP conversion failed, keeping original format:", err);
    return { buffer, contentType };
  }
}

/**
 * Generate a thumbnail or medium variant of an image using sharp.
 */
async function generateVariant(
  buffer: Buffer,
  maxSize: number,
  quality: number
): Promise<Buffer> {
  return sharp(buffer)
    .resize({
      width: maxSize,
      height: maxSize,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality })
    .toBuffer();
}

/**
 * Get image metadata (width, height, format) using sharp.
 */
async function getImageMetadata(
  buffer: Buffer
): Promise<{ width: number | undefined; height: number | undefined; format: string | undefined }> {
  try {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
    };
  } catch {
    return { width: undefined, height: undefined, format: undefined };
  }
}

/**
 * Derive variant keys from the main key by inserting a suffix before the extension.
 * e.g. "folder/id/123-abc-name.webp" → "folder/id/123-abc-name_thumb.webp"
 */
function deriveVariantKey(mainKey: string, suffix: string): string {
  const dotIndex = mainKey.lastIndexOf(".");
  if (dotIndex === -1) return `${mainKey}${suffix}`;
  return `${mainKey.substring(0, dotIndex)}${suffix}${mainKey.substring(dotIndex)}`;
}

/**
 * Replace the file extension in a key.
 * e.g. "folder/id/123-abc-name.jpg" → "folder/id/123-abc-name.webp"
 */
function replaceExtension(key: string, newExt: string): string {
  const dotIndex = key.lastIndexOf(".");
  if (dotIndex === -1) return `${key}.${newExt}`;
  return `${key.substring(0, dotIndex)}.${newExt}`;
}

// Magic bytes for file type validation
const MAGIC_BYTES: Record<string, number[][]> = {
  "image/jpeg": [[0xFF, 0xD8, 0xFF]],
  "image/png": [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
  "image/gif": [[0x47, 0x49, 0x46, 0x38]],
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]],
};

function validateMagicBytes(buffer: Buffer, declaredType: string): boolean {
  const signatures = MAGIC_BYTES[declaredType];
  if (!signatures) return true; // Allow types without magic byte checking (docs, etc.)
  return signatures.some((sig) => {
    if (buffer.length < sig.length) return false;
    return sig.every((byte, i) => buffer[i] === byte);
  });
}

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
}

/**
 * Check if a content type is an image type eligible for thumbnail generation
 */
function isProcessableImage(contentType: string): boolean {
  return IMAGE_TYPES_FOR_PROCESSING.includes(contentType) || contentType === "image/gif";
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // ── Rate limiting ────────────────────────────────────────
  const rateLimitId = request.headers.get("x-user-id") || ip;
  const { allowed, remaining, resetAt } = checkRateLimit(
    `upload:${rateLimitId}`,
    30,
    10 * 60 * 1000 // 10 minutes
  );

  if (!allowed) {
    const minutesLeft = Math.max(1, Math.ceil((resetAt - Date.now()) / 60_000));
    return NextResponse.json(
      { error: `הגעת למגבלת ההעלאות. נסה שוב בעוד ${minutesLeft} דקות` },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(resetAt),
        },
      }
    );
  }
  // ── End rate limiting ────────────────────────────────────

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "general";
    const designerId = formData.get("designerId") as string | null;
    const category = (formData.get("category") as FileCategory) || "any";

    if (!file) {
      return NextResponse.json({ error: "לא נבחר קובץ" }, { status: 400 });
    }

    // Validate filename length
    if (file.name.length > MAX_FILENAME_LENGTH) {
      return NextResponse.json({ error: "שם קובץ ארוך מדי" }, { status: 400 });
    }

    // Validate file type and size
    const validation = validateFile(file.name, file.size, file.type, category);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Read file bytes and validate magic bytes
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (!validateMagicBytes(buffer, file.type)) {
      return NextResponse.json(
        { error: "תוכן הקובץ לא תואם לסוג שהוצהר" },
        { status: 400 }
      );
    }

    // ---- Hash & folder setup ----
    const fileHash = calculateHash(buffer);
    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "_");

    // Fast path: folders that don't need heavy processing (logos, avatars, branding)
    const FAST_FOLDERS = ["business-cards", "logos", "avatars", "branding"];
    const isFastPath = FAST_FOLDERS.includes(safeFolder) || buffer.length < 200 * 1024; // < 200KB

    // ---- Hash deduplication (skip for fast-path to save DB queries) ----
    if (!isFastPath) {
      const existing = await findExistingByHash(fileHash);
      if (existing) {
        console.log(`[upload] Duplicate detected for hash ${fileHash.substring(0, 12)}…`);
        const userId = request.headers.get("x-user-id") || designerId || "unknown";
        logAuditEvent("FILE_UPLOAD", userId, {
          originalName: file.name, type: file.type, size: file.size,
          folder, deduplicated: true, existingKey: existing.r2Key,
        }, ip);

        const response = NextResponse.json({
          url: existing.imageUrl, key: existing.r2Key,
          filename: file.name, size: file.size, contentType: file.type,
          hash: existing.fileHash, thumbnailUrl: existing.thumbnailUrl,
          mediumUrl: existing.mediumUrl, deduplicated: true,
        });
        response.headers.set("X-RateLimit-Remaining", String(remaining));
        response.headers.set("X-RateLimit-Reset", String(resetAt));
        return response;
      }
    }

    // ---- Optimize & convert (skip for fast-path small files) ----
    let finalBuffer: Buffer<ArrayBuffer> = buffer;
    let finalContentType = file.type;

    if (!isFastPath) {
      const optimized = await optimizeImage(buffer, file.type);
      finalBuffer = optimized.buffer as Buffer<ArrayBuffer>;
      finalContentType = optimized.contentType;

      const converted = await convertToWebP(finalBuffer, finalContentType);
      finalBuffer = converted.buffer as Buffer<ArrayBuffer>;
      finalContentType = converted.contentType;
    }

    // ---- Generate key ----
    let key = generateFileKey(safeFolder, file.name, designerId || undefined);
    if (finalContentType === "image/webp" && CONVERTIBLE_TO_WEBP.includes(file.type)) {
      key = replaceExtension(key, "webp");
    }

    // ---- Get image metadata (quick, single sharp call) ----
    let width: number | undefined;
    let height: number | undefined;
    let format: string | undefined;

    if (isProcessableImage(finalContentType)) {
      const metadata = await getImageMetadata(finalBuffer);
      width = metadata.width;
      height = metadata.height;
      format = metadata.format;
    }

    // ---- Upload main file to R2 ----
    const result = await uploadToR2(finalBuffer, key, finalContentType);

    // ---- Generate thumbnails (skip for fast-path — logos/avatars don't need them) ----
    let thumbnailUrl: string | undefined;
    let mediumUrl: string | undefined;

    if (!isFastPath && IMAGE_TYPES_FOR_PROCESSING.includes(finalContentType)) {
      try {
        const [thumbBuffer, mediumBuffer] = await Promise.all([
          generateVariant(finalBuffer, 200, 75),
          generateVariant(finalBuffer, 800, 80),
        ]);

        const thumbKey = deriveVariantKey(key, "_thumb");
        const mediumKey = deriveVariantKey(key, "_medium");

        await Promise.all([
          uploadToR2(thumbBuffer, thumbKey, "image/webp"),
          uploadToR2(mediumBuffer, mediumKey, "image/webp"),
        ]);

        thumbnailUrl = getPublicUrl(thumbKey);
        mediumUrl = getPublicUrl(mediumKey);

        console.log(
          `[upload] Thumbnails: thumb=${(thumbBuffer.length / 1024).toFixed(1)}KB, medium=${(mediumBuffer.length / 1024).toFixed(1)}KB`
        );
      } catch (err) {
        console.warn("[upload] Thumbnail generation failed:", err);
      }
    }

    // ---- Audit log ----
    const userId = request.headers.get("x-user-id") || designerId || "unknown";
    logAuditEvent("FILE_UPLOAD", userId, {
      key: result.key, originalName: file.name, type: file.type,
      finalType: finalContentType, size: file.size, finalSize: result.size,
      folder: safeFolder, url: result.url, hash: fileHash,
      thumbnailUrl, mediumUrl, width, height,
    }, ip);

    const response = NextResponse.json({
      url: result.url, key: result.key, filename: file.name,
      size: result.size, contentType: finalContentType, hash: fileHash,
      thumbnailUrl, mediumUrl, width, height, format,
    });
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    response.headers.set("X-RateLimit-Reset", String(resetAt));
    return response;
  } catch (error) {
    console.error("Upload error:", error);
    const errorResponse = NextResponse.json(
      { error: "שגיאה בהעלאת הקובץ" },
      { status: 500 }
    );
    errorResponse.headers.set("X-RateLimit-Remaining", String(remaining));
    errorResponse.headers.set("X-RateLimit-Reset", String(resetAt));
    return errorResponse;
  }
}
