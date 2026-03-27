export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/client-portal/[token]/verify-otp
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const { code } = body;

    if (!code?.trim()) {
      return NextResponse.json({ error: "קוד אימות הוא שדה חובה" }, { status: 400 });
    }

    // Find active portal token
    const portalToken = await prisma.clientPortalToken.findUnique({
      where: { token },
      include: { client: true },
    });

    if (!portalToken || !portalToken.isActive) {
      return NextResponse.json({ error: "קישור לא תקין או לא פעיל" }, { status: 404 });
    }

    // Find valid OTP (not expired, not used)
    const otp = await prisma.clientPortalOtp.findFirst({
      where: {
        tokenId: portalToken.id,
        code: code.trim(),
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otp) {
      return NextResponse.json({ error: "קוד אימות שגוי או שפג תוקפו" }, { status: 400 });
    }

    // Mark OTP as used
    await prisma.clientPortalOtp.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    });

    // Update last used timestamp
    await prisma.clientPortalToken.update({
      where: { id: portalToken.id },
      data: { lastUsedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      client: {
        id: portalToken.client.id,
        name: portalToken.client.name,
        email: portalToken.client.email,
        phone: portalToken.client.phone,
      },
    });
  } catch (error) {
    console.error("Portal verify OTP error:", error);
    return NextResponse.json({ error: "שגיאה באימות קוד" }, { status: 500 });
  }
}
