export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { logAuditEvent } from "@/lib/audit-logger";
import { uploadToR2, generateFileKey, validateFile, type FileCategory } from "@/lib/r2";

// ==========================================
// העלאת קבצים — File Upload API (R2)
// ==========================================

const MAX_FILENAME_LENGTH = 255;

// Image optimization threshold (500KB)
const IMAGE_OPTIMIZATION_THRESHOLD = 500 * 1024;
const IMAGE_MAX_DIMENSION = 2000;

// Attempt to load sharp for image optimization
let sharp: typeof import("sharp") | null = null;
try {
  sharp = require("sharp");
} catch {
  // sharp not available — image optimization will be skipped
}

/**
 * Optimize an image buffer using sharp (if available).
 * Returns the optimized buffer and (possibly updated) content type,
 * or the originals when optimization is skipped.
 */
async function optimizeImage(
  buffer: Buffer,
  contentType: string
): Promise<{ buffer: Buffer; contentType: string }> {
  if (!sharp) return { buffer, contentType };

  // Only optimize JPEG, PNG, and WebP above the size threshold
  const optimizableTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!optimizableTypes.includes(contentType)) return { buffer, contentType };
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

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
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

    // Optimize image if applicable (resize + compress large images)
    const optimized = await optimizeImage(buffer, file.type);
    const finalBuffer = optimized.buffer;
    const finalContentType = optimized.contentType;

    // Sanitize folder name
    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "_");

    // Generate unique key and upload to R2
    const key = generateFileKey(safeFolder, file.name, designerId || undefined);
    const result = await uploadToR2(finalBuffer, key, finalContentType);

    // Audit log
    const userId = request.headers.get("x-user-id") || designerId || "unknown";
    logAuditEvent("FILE_UPLOAD", userId, {
      key: result.key,
      originalName: file.name,
      type: file.type,
      size: file.size,
      folder: safeFolder,
      url: result.url,
    }, ip);

    return NextResponse.json({
      url: result.url,
      key: result.key,
      filename: file.name,
      size: result.size,
      contentType: result.contentType,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "שגיאה בהעלאת הקובץ" },
      { status: 500 }
    );
  }
}
