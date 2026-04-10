export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

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

    // Send OTP via email
    if (portalToken.client.email) {
      try {
        await sendEmail({
          to: portalToken.client.email,
          subject: "קוד אימות — זירת האדריכלות",
          html: `
            <div dir="rtl" style="font-family: Heebo, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; padding: 40px; border-radius: 12px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #C9A84C; font-size: 28px; margin: 0;">זירת האדריכלות</h1>
              </div>
              <p style="text-align: center;">קוד האימות שלך:</p>
              <div style="text-align: center; margin: 24px 0;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #C9A84C; background: #1a1a1a; padding: 16px 32px; border-radius: 8px; display: inline-block;">${code}</span>
              </div>
              <p style="text-align: center; color: #888; font-size: 14px;">הקוד תקף ל-10 דקות.</p>
              <p style="color: #666; font-size: 12px; text-align: center; margin-top: 40px;">
                אם לא ביקשת קוד אימות, ניתן להתעלם מהודעה זו.
              </p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send OTP email:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "קוד אימות נשלח",
    });
  } catch (error) {
    console.error("Portal send OTP error:", error);
    return NextResponse.json({ error: "שגיאה בשליחת קוד אימות" }, { status: 500 });
  }
}
