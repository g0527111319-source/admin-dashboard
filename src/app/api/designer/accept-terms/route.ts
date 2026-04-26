export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

// POST /api/designer/accept-terms
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    // Get IP and User-Agent
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor
      ? forwardedFor.split(",")[0].trim()
      : req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Update the designer with consent info
    const designer = await prisma.designer.update({
      where: { id: designerId },
      data: {
        termsAcceptedAt: new Date(),
        termsAcceptedIp: ipAddress,
        termsAcceptedAgent: userAgent,
      },
      select: {
        id: true,
        termsAcceptedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      acceptedAt: designer.termsAcceptedAt,
    });
  } catch (error) {
    console.error("Accept terms error:", error);
    return NextResponse.json(
      { error: "שגיאה בשמירת ההסכמה" },
      { status: 500 }
    );
  }
}

// GET /api/designer/accept-terms - check if terms accepted
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const designer = await prisma.designer.findUnique({
      where: { id: designerId },
      select: {
        termsAcceptedAt: true,
      },
    });

    if (!designer) {
      return NextResponse.json({ error: "משתמש לא נמצא" }, { status: 404 });
    }

    return NextResponse.json({
      accepted: !!designer.termsAcceptedAt,
      acceptedAt: designer.termsAcceptedAt,
    });
  } catch (error) {
    console.error("Check terms error:", error);
    return NextResponse.json(
      { error: "שגיאה בבדיקת הסכמה" },
      { status: 500 }
    );
  }
}
