export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { logAuditEvent } from "@/lib/audit-logger";
import { validateFile, generateFileKey, getPublicUrl, generatePresignedUploadUrl, type FileCategory } from "@/lib/r2";
import { checkRateLimit } from "@/lib/rate-limiter";

// ==========================================
// Pre-signed Upload URL — /api/upload/presign
// ==========================================

interface PresignRequestBody {
  filename: string;
  contentType: string;
  folder?: string;
  designerId?: string;
  category?: FileCategory;
}

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // ── Rate limiting ────────────────────────────────────────
  const rateLimitId = request.headers.get("x-user-id") || ip;
  const { allowed, remaining, resetAt } = checkRateLimit(
    `presign:${rateLimitId}`,
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
    const body: PresignRequestBody = await request.json();
    const { filename, contentType, folder, designerId, category } = body;

    // Validate required fields
    if (!filename || !contentType) {
      const response = NextResponse.json(
        { error: "חסרים שדות חובה: filename, contentType" },
        { status: 400 }
      );
      response.headers.set("X-RateLimit-Remaining", String(remaining));
      response.headers.set("X-RateLimit-Reset", String(resetAt));
      return response;
    }

    // Validate file type and size limits (size = 0 because actual upload
    // happens directly to R2; the browser enforces the real size)
    const fileCategory: FileCategory = category || "any";
    const validation = validateFile(filename, 0, contentType, fileCategory);
    if (!validation.valid) {
      const response = NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
      response.headers.set("X-RateLimit-Remaining", String(remaining));
      response.headers.set("X-RateLimit-Reset", String(resetAt));
      return response;
    }

    // Build the R2 object key
    const safeFolder = (folder || "general").replace(/[^a-zA-Z0-9_-]/g, "_");
    const key = generateFileKey(safeFolder, filename, designerId || undefined);

    // Generate the pre-signed PUT URL (default 15-minute expiry)
    const uploadUrl = await generatePresignedUploadUrl(key, contentType, 900);
    const publicUrl = getPublicUrl(key);

    // Audit log
    const userId = request.headers.get("x-user-id") || designerId || "unknown";
    logAuditEvent("FILE_UPLOAD", userId, {
      action: "PRESIGN_GENERATED",
      key,
      originalName: filename,
      contentType,
      folder: safeFolder,
    }, ip);

    const response = NextResponse.json({
      uploadUrl,
      key,
      publicUrl,
    });
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    response.headers.set("X-RateLimit-Reset", String(resetAt));
    return response;
  } catch (error) {
    console.error("[presign] Error generating pre-signed URL:", error);
    const errorResponse = NextResponse.json(
      { error: "שגיאה ביצירת קישור העלאה" },
      { status: 500 }
    );
    errorResponse.headers.set("X-RateLimit-Remaining", String(remaining));
    errorResponse.headers.set("X-RateLimit-Reset", String(resetAt));
    return errorResponse;
  }
}
