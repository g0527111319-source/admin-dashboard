export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { generateFileKey, getPublicUrl, generatePresignedUploadUrl } from "@/lib/r2";
import { checkRateLimit } from "@/lib/rate-limiter";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

// ==========================================
// Pre-signed Upload URL for 3D models
// POST /api/designer/crm/models/presign
// ==========================================

const ALLOWED_EXTENSIONS = ["ifc", "glb", "gltf", "obj", "fbx", "dae"];
const MAX_SIZE_BYTES = 500 * 1024 * 1024; // 500MB ceiling for raw IFC

interface PresignBody {
  filename: string;
  contentType: string;
  size: number;
  projectId: string;
}

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  const designerId = auth.userId;

  const ip = getClientIp(request);
  const { allowed, remaining, resetAt } = checkRateLimit(
    `presign-3d:${designerId}`,
    10,
    10 * 60 * 1000
  );
  if (!allowed) {
    const minutesLeft = Math.max(1, Math.ceil((resetAt - Date.now()) / 60_000));
    return NextResponse.json(
      { error: `הגעת למגבלת ההעלאות. נסה שוב בעוד ${minutesLeft} דקות` },
      { status: 429 }
    );
  }

  try {
    const body: PresignBody = await request.json();
    const { filename, contentType, size, projectId } = body;

    if (!filename || !contentType || !size || !projectId) {
      return NextResponse.json(
        { error: "חסרים שדות חובה: filename, contentType, size, projectId" },
        { status: 400 }
      );
    }

    const ext = filename.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `פורמט לא נתמך. פורמטים מותרים: ${ALLOWED_EXTENSIONS.join(", ")}` },
        { status: 400 }
      );
    }

    if (size > MAX_SIZE_BYTES) {
      const maxMB = Math.round(MAX_SIZE_BYTES / 1024 / 1024);
      return NextResponse.json(
        { error: `הקובץ גדול מדי. מקסימום ${maxMB}MB` },
        { status: 400 }
      );
    }

    const key = generateFileKey("models-3d", filename, designerId);
    const uploadUrl = await generatePresignedUploadUrl(key, contentType, 900);
    const publicUrl = getPublicUrl(key);

    const response = NextResponse.json({
      uploadUrl,
      key,
      publicUrl,
      format: ext,
    });
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    response.headers.set("X-RateLimit-Reset", String(resetAt));
    return response;
  } catch (error) {
    console.error("[models/presign] error:", error);
    return NextResponse.json(
      { error: "שגיאה ביצירת קישור העלאה" },
      { status: 500 }
    );
  }
}
