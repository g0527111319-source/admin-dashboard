export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit-logger";
import { sendEmail } from "@/lib/email";

// GET /api/contract/sign/[token] — public: client views the contract
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const contract = await prisma.crmContract.findUnique({
      where: { signToken: token },
      include: {
        project: { select: { id: true, name: true } },
        template: {
          select: {
            name: true,
            contentBlocks: true,
            fields: true,
          },
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ error: "חוזה לא נמצא" }, { status: 404 });
    }

    if (contract.status === "CANCELLED") {
      return NextResponse.json({ error: "חוזה זה בוטל" }, { status: 410 });
    }

    // Mark as viewed (first time)
    if (!contract.clientViewedAt) {
      await prisma.crmContract.update({
        where: { id: contract.id },
        data: { clientViewedAt: new Date() },
      });
    }

    // Get designer name
    const designer = await prisma.designer.findUnique({
      where: { id: contract.designerId },
      select: { fullName: true },
    });

    // Return sanitized data (don't expose internal notes etc)
    return NextResponse.json({
      id: contract.id,
      title: contract.title,
      contractNumber: contract.contractNumber,
      totalAmount: contract.totalAmount,
      status: contract.status,
      clientName: contract.clientName,
      clientEmail: contract.clientEmail,
      designerFieldValues: contract.designerFieldValues,
      clientFieldValues: contract.clientFieldValues,
      designerSignatureData: contract.designerSignatureData,
      designerSignedAt: contract.designerSignedAt,
      clientSignatureData: contract.clientSignatureData,
      clientSignedAt: contract.clientSignedAt,
      clientViewedAt: contract.clientViewedAt,
      createdAt: contract.createdAt,
      template: contract.template,
      designer: designer ? { fullName: designer.fullName } : null,
    });
  } catch (error) {
    console.error("Contract sign view error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת החוזה" }, { status: 500 });
  }
}

// POST /api/contract/sign/[token] — public: client signs the contract
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const { clientSignatureData, clientFieldValues } = body;

    if (!clientSignatureData) {
      return NextResponse.json({ error: "חתימה נדרשת" }, { status: 400 });
    }

    const contract = await prisma.crmContract.findUnique({
      where: { signToken: token },
    });

    if (!contract) {
      return NextResponse.json({ error: "חוזה לא נמצא" }, { status: 404 });
    }

    if (contract.status === "CANCELLED") {
      return NextResponse.json({ error: "חוזה זה בוטל" }, { status: 410 });
    }

    if (contract.clientSignedAt) {
      return NextResponse.json({ error: "החוזה כבר נחתם" }, { status: 409 });
    }

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    // Build audit log
    const auditLog = Array.isArray(contract.signatureAuditLog)
      ? [...(contract.signatureAuditLog as Record<string, unknown>[])]
      : [];
    auditLog.push({
      action: "client_signed",
      timestamp: new Date().toISOString(),
      ip: clientIp,
      userAgent: req.headers.get("user-agent") || "unknown",
    });

    // Check if both parties will have signed
    const bothSigned = !!contract.designerSignedAt;

    // Build email log
    const emailsSent = Array.isArray(contract.emailsSent)
      ? [...(contract.emailsSent as Record<string, unknown>[])]
      : [];

    // Log confirmation emails
    if (contract.clientEmail) {
      emailsSent.push({
        type: "client_signed_confirmation",
        to: contract.clientEmail,
        timestamp: new Date().toISOString(),
      });
    }
    // Also notify designer
    emailsSent.push({
      type: "designer_notification_client_signed",
      to: "designer",
      timestamp: new Date().toISOString(),
    });

    // If both signed, add final signed copy emails to both parties
    if (bothSigned) {
      if (contract.clientEmail) {
        emailsSent.push({
          type: "signed_copy_to_client",
          to: contract.clientEmail,
          timestamp: new Date().toISOString(),
        });
      }
      emailsSent.push({
        type: "signed_copy_to_designer",
        to: "designer",
        timestamp: new Date().toISOString(),
      });
    }

    const updated = await prisma.crmContract.update({
      where: { id: contract.id },
      data: {
        clientSignatureData,
        clientSignedAt: new Date(),
        signatureIp: clientIp,
        signatureAuditLog: JSON.parse(JSON.stringify(auditLog)),
        clientFieldValues: JSON.parse(JSON.stringify(clientFieldValues || contract.clientFieldValues)),
        status: bothSigned ? "SIGNED" : contract.status,
        emailsSent: JSON.parse(JSON.stringify(emailsSent)),
      },
    });

    // Send contract notification emails via Resend
    try {
      const designer = await prisma.designer.findUnique({
        where: { id: contract.designerId },
        select: { fullName: true, email: true },
      });

      const contractTitle = contract.title || `חוזה ${contract.contractNumber}`;
      const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://zirat-design.vercel.app";

      // Send confirmation to client
      if (contract.clientEmail) {
        await sendEmail({
          to: contract.clientEmail,
          subject: `אישור חתימה — ${contractTitle}`,
          html: `
            <div dir="rtl" style="font-family: Heebo, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; padding: 40px; border-radius: 12px;">
              <h1 style="color: #C9A84C; text-align: center;">חתימתך התקבלה</h1>
              <p>שלום ${contract.clientName || ""},</p>
              <p>חתימתך על <strong>${contractTitle}</strong> התקבלה בהצלחה.</p>
              ${bothSigned
                ? '<p style="color: #4CAF50; font-weight: bold;">החוזה נחתם על ידי שני הצדדים ונכנס לתוקף.</p>'
                : "<p>ממתינים לחתימת המעצב/ת להשלמת התהליך.</p>"
              }
              <p style="color: #666; font-size: 12px; text-align: center; margin-top: 40px;">זירת האדריכלות</p>
            </div>
          `,
        });
      }

      // Notify designer that client signed
      if (designer?.email) {
        await sendEmail({
          to: designer.email,
          subject: `הלקוח/ה חתם/ה על ${contractTitle}`,
          html: `
            <div dir="rtl" style="font-family: Heebo, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; padding: 40px; border-radius: 12px;">
              <h1 style="color: #C9A84C; text-align: center;">חתימת לקוח/ה התקבלה</h1>
              <p>שלום ${designer.fullName},</p>
              <p><strong>${contract.clientName || "הלקוח/ה"}</strong> חתם/ה על <strong>${contractTitle}</strong>.</p>
              ${bothSigned
                ? '<p style="color: #4CAF50; font-weight: bold;">החוזה נחתם על ידי שני הצדדים ונכנס לתוקף.</p>'
                : "<p>החוזה ממתין לחתימתך.</p>"
              }
              <div style="text-align: center; margin-top: 24px;">
                <a href="${APP_URL}/designer" style="background: #C9A84C; color: #000; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">צפייה בחוזה</a>
              </div>
              <p style="color: #666; font-size: 12px; text-align: center; margin-top: 40px;">זירת האדריכלות</p>
            </div>
          `,
        });
      }
    } catch (emailError) {
      console.error("Failed to send contract signing emails:", emailError);
    }

    logAuditEvent("CONTRACT_SIGNED", contract.clientEmail || "unknown-client", {
      contractId: contract.id,
      contractNumber: contract.contractNumber,
      bothSigned,
    }, clientIp);

    return NextResponse.json({
      success: true,
      status: updated.status,
      clientSignedAt: updated.clientSignedAt,
    });
  } catch (error) {
    console.error("Contract sign error:", error);
    return NextResponse.json({ error: "שגיאה בחתימה" }, { status: 500 });
  }
}
