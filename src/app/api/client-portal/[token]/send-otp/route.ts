export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/client-portal/[token]/send-otp
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find active portal token
    const portalToken = await prisma.clientPortalToken.findUnique({
      where: { token },
      include: { client: true },
    });

    if (!portalToken || !portalToken.isActive) {
      return NextResponse.json({ error: "קישור לא תקין או לא פעיל" }, { status: 404 });
    }

    if (portalToken.client.deletedAt) {
      return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });
    }

    // Generate 6-digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP with 10-minute expiry
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await prisma.clientPortalOtp.create({
      data: {
        tokenId: portalToken.id,
        code,
        expiresAt,
      },
    });

    // Update last used timestamp
    await prisma.clientPortalToken.update({
      where: { id: portalToken.id },
      data: { lastUsedAt: new Date() },
    });

    // TODO: In production, send OTP via email instead of returning it
    return NextResponse.json({
      success: true,
      message: "קוד אימות נשלח",
      // DEV ONLY - remove in production
      code,
    });
  } catch (error) {
    console.error("Portal send OTP error:", error);
    return NextResponse.json({ error: "שגיאה בשליחת קוד אימות" }, { status: 500 });
  }
}
