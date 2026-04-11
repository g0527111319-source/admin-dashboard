export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { sendEmail } from "@/lib/email";

// POST /api/designer/crm/clients/[clientId]/portal-token
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { clientId } = await params;

    // Verify designer ownership
    const client = await prisma.crmClient.findFirst({
      where: { id: clientId, designerId, deletedAt: null },
    });
    if (!client) {
      return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });
    }

    // Fetch designer name for the email
    const designer = await prisma.designer.findUnique({
      where: { id: designerId },
      select: { fullName: true },
    });

    // Deactivate any existing tokens for this client
    await prisma.clientPortalToken.updateMany({
      where: { clientId, isActive: true },
      data: { isActive: false },
    });

    // Create new portal token
    const token = crypto.randomUUID();
    const portalToken = await prisma.clientPortalToken.create({
      data: {
        clientId,
        token,
        isActive: true,
      },
    });

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://admin-dashboard-nu-mocha.vercel.app";
    const portalFullUrl = `${APP_URL}/client-portal/${portalToken.token}`;
    const designerName = designer?.fullName || "המעצבת";
    const clientDisplayName = client.firstName
      ? `${client.firstName} ${client.lastName || ""}`.trim()
      : client.name;

    // Send portal link email to client (and partner if they have email)
    const emailRecipients: string[] = [];
    if (client.email) emailRecipients.push(client.email);
    if (client.partner1Email) emailRecipients.push(client.partner1Email);

    if (emailRecipients.length > 0) {
      try {
        await sendEmail({
          to: emailRecipients,
          subject: `הגישה לאזור האישי שלך — ${designerName}`,
          html: `
            <div dir="rtl" style="font-family: Heebo, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; padding: 40px; border-radius: 12px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #C9A84C; font-size: 28px; margin: 0;">זירת האדריכלות</h1>
              </div>
              <h2 style="color: #fff;">שלום ${clientDisplayName},</h2>
              <p><strong>${designerName}</strong> שלחה לך קישור לאזור האישי שלך, שם תוכל/י לעקוב אחרי הפרויקט, לצפות במסמכים ולאשר שלבים.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${portalFullUrl}" style="display: inline-block; background: #C9A84C; color: #000; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">כניסה לאזור האישי</a>
              </div>
              <p style="color: #888; font-size: 13px;">לחצ/י על הכפתור למעלה כדי לגשת לאזור האישי שלך.</p>
              <p style="color: #666; font-size: 12px; text-align: center; margin-top: 40px;">זירת האדריכלות</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send portal link email:", emailError);
        // Don't fail the request — the token was created successfully
      }
    }

    return NextResponse.json({
      token: portalToken.token,
      url: `/client-portal/${portalToken.token}`,
      emailSent: emailRecipients.length > 0,
      emailRecipients,
    }, { status: 201 });
  } catch (error) {
    console.error("Portal token create error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת טוקן פורטל" }, { status: 500 });
  }
}
