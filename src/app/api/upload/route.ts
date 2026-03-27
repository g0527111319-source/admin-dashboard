export const dynamic = "force-dynamic";
import { txt } from "@/content/siteText";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { logAuditEvent } from "@/lib/audit-logger";

// ==========================================
// העלאת תמונות — Image Upload API (Hardened)
// ==========================================

// SVG removed — XSS vector
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

const MAX_SIZE = 15 * 1024 * 1024; // 15MB
const MAX_FILENAME_LENGTH = 255;

// Magic bytes for file type validation
const MAGIC_BYTES: Record<string, number[][]> = {
  "image/jpeg": [[0xFF, 0xD8, 0xFF]],
  "image/png": [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF header (WebP starts with RIFF....WEBP)
  "image/gif": [[0x47, 0x49, 0x46, 0x38]], // GIF8
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]], // %PDF
};

function validateMagicBytes(buffer: Buffer, declaredType: string): boolean {
  const signatures = MAGIC_BYTES[declaredType];
  if (!signatures) return false;

  return signatures.some((sig) => {
    if (buffer.length < sig.length) return false;
    return sig.every((byte, i) => buffer[i] === byte);
  });
}

/** Sanitize filename: remove path traversal, null bytes, and limit length */
function sanitizeFilename(filename: string): string {
  // Remove null bytes
  let clean = filename.replace(/\0/g, "");
  // Remove path separators and traversal
  clean = clean.replace(/[/\\]/g, "_");
  clean = clean.replace(/\.\./g, "_");
  // Remove leading dots (hidden files)
  clean = clean.replace(/^\.+/, "");
  // Limit length
  if (clean.length > MAX_FILENAME_LENGTH) {
    const ext = path.extname(clean);
    const base = clean.slice(0, MAX_FILENAME_LENGTH - ext.length);
    clean = base + ext;
  }
  // Fallback if empty
  if (!clean) clean = "upload";
  return clean;
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
        const folder = (formData.get("folder") as string) || "business-cards";
        if (!file) {
            return NextResponse.json({ error: txt("src/app/api/upload/route.ts::001", "\u05DC\u05D0 \u05E0\u05D1\u05D7\u05E8 \u05E7\u05D5\u05D1\u05E5") }, { status: 400 });
        }

        // Validate filename length
        if (file.name.length > MAX_FILENAME_LENGTH) {
            return NextResponse.json({ error: "Filename too long" }, { status: 400 });
        }

        // Validate Content-Type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ error: txt("src/app/api/upload/route.ts::002", "\u05E1\u05D5\u05D2 \u05E7\u05D5\u05D1\u05E5 \u05DC\u05D0 \u05E0\u05EA\u05DE\u05DA. \u05D9\u05E9 \u05DC\u05D4\u05E2\u05DC\u05D5\u05EA \u05EA\u05DE\u05D5\u05E0\u05D4 (JPG, PNG, WebP, GIF)") }, { status: 400 });
        }

        // Validate size
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: txt("src/app/api/upload/route.ts::003", "\u05D4\u05E7\u05D5\u05D1\u05E5 \u05D2\u05D3\u05D5\u05DC \u05DE\u05D3\u05D9. \u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD 5MB") }, { status: 400 });
        }

        // Read file bytes and validate magic bytes
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        if (!validateMagicBytes(buffer, file.type)) {
            return NextResponse.json({ error: "File content does not match declared type" }, { status: 400 });
        }

        // Sanitize filename and generate unique name
        const sanitized = sanitizeFilename(file.name);
        const ext = path.extname(sanitized).slice(1) || "bin";
        const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        // Sanitize folder name to prevent traversal
        const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "_");

        // Ensure upload directory exists
        const uploadDir = path.join(process.cwd(), "public", "uploads", safeFolder);
        await mkdir(uploadDir, { recursive: true });

        // Write file
        const filePath = path.join(uploadDir, uniqueName);
        await writeFile(filePath, buffer);

        // Audit log
        const userId = request.headers.get("x-user-id") || "unknown";
        logAuditEvent("FILE_UPLOAD", userId, {
            filename: uniqueName,
            originalName: sanitized,
            type: file.type,
            size: file.size,
            folder: safeFolder,
        }, ip);

        // Return public URL
        const url = `/uploads/${safeFolder}/${uniqueName}`;
        return NextResponse.json({ url, filename: uniqueName });
    }
    catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: txt("src/app/api/upload/route.ts::004", "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05E2\u05DC\u05D0\u05EA \u05D4\u05E7\u05D5\u05D1\u05E5") }, { status: 500 });
    }
}
