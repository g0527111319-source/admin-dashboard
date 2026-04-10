export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

// PATCH /api/designer/crm/contracts/[contractId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { contractId } = await params;
    const body = await req.json();

    // Verify ownership
    const existing = await prisma.crmContract.findFirst({
      where: { id: contractId, designerId },
    });
    if (!existing) {
      return NextResponse.json({ error: "חוזה לא נמצא" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.totalAmount !== undefined) updateData.totalAmount = body.totalAmount;
    if (body.pdfUrl !== undefined) updateData.pdfUrl = body.pdfUrl?.trim() || null;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.notesInternal !== undefined) updateData.notesInternal = body.notesInternal?.trim() || null;
    if (body.clientName !== undefined) updateData.clientName = body.clientName?.trim() || null;
    if (body.clientEmail !== undefined) updateData.clientEmail = body.clientEmail?.trim() || null;
    if (body.clientPhone !== undefined) updateData.clientPhone = body.clientPhone?.trim() || null;
    if (body.designerFieldValues !== undefined) updateData.designerFieldValues = body.designerFieldValues;
    if (body.clientFieldValues !== undefined) updateData.clientFieldValues = body.clientFieldValues;
    if (body.templateId !== undefined) updateData.templateId = body.templateId;

    // Designer signature
    if (body.designerSignatureData !== undefined) {
      updateData.designerSignatureData = body.designerSignatureData;
      updateData.designerSignedAt = new Date();

      // Add to audit log
      const auditLog = Array.isArray(existing.signatureAuditLog) ? [...(existing.signatureAuditLog as unknown[])] : [];
      auditLog.push({
        action: "designer_signed",
        timestamp: new Date().toISOString(),
        ip: req.headers.get("x-forwarded-for") || "unknown",
      });
      updateData.signatureAuditLog = auditLog;
    }

    // Client signature
    if (body.clientSignatureData !== undefined) {
      updateData.clientSignatureData = body.clientSignatureData;
      updateData.clientSignedAt = new Date();
      updateData.signatureIp = body.signatureIp || req.headers.get("x-forwarded-for") || null;

      const auditLog = Array.isArray(existing.signatureAuditLog) ? [...(existing.signatureAuditLog as unknown[])] : [];
      auditLog.push({
        action: "client_signed",
        timestamp: new Date().toISOString(),
        ip: body.signatureIp || req.headers.get("x-forwarded-for") || "unknown",
      });
      updateData.signatureAuditLog = auditLog;
    }

    // Auto-mark as SIGNED when both parties signed
    const bothSigned =
      (body.clientSignatureData && existing.designerSignedAt) ||
      (body.designerSignatureData && existing.clientSignedAt);
    if (bothSigned) {
      updateData.status = "SIGNED";
    }

    // Send to client
    if (body.sendEmail && body.status === "SENT_FOR_SIGNATURE") {
      updateData.sentToClientAt = new Date();
      const emailsSent = Array.isArray(existing.emailsSent) ? [...(existing.emailsSent as unknown[])] : [];
      emailsSent.push({
        type: "sent_for_signature",
        to: existing.clientEmail,
        timestamp: new Date().toISOString(),
      });
      updateData.emailsSent = emailsSent;

      // Send contract signing invitation email to client
      if (existing.clientEmail) {
        try {
          const designer = await prisma.designer.findUnique({
            where: { id: designerId },
            select: { fullName: true },
          });
          const contractTitle = (body.title || existing.title || `חוזה ${existing.contractNumber}`).trim();
          const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://admin-dashboard-nu-mocha.vercel.app";
          const signUrl = `${APP_URL}/contract/sign/${existing.signToken}`;

          await sendEmail({
            to: existing.clientEmail,
            subject: `חוזה לחתימה — ${contractTitle}`,
            html: `
              <div dir="rtl" style="font-family: Heebo, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; padding: 40px; border-radius: 12px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #C9A84C; font-size: 28px; margin: 0;">זירת האדריכלות</h1>
                </div>
                <h2 style="color: #fff;">חוזה ממתין לחתימתך</h2>
                <p>שלום ${existing.clientName || ""},</p>
                <p><strong>${designer?.fullName || "המעצבת"}</strong> שלחה לך חוזה <strong>${contractTitle}</strong> לעיון ולחתימה.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${signUrl}" style="background: #C9A84C; color: #000; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">לצפייה ולחתימה</a>
                </div>
                <p style="color: #888; font-size: 13px;">לחצ/י על הכפתור למעלה כדי לצפות בחוזה ולחתום עליו דיגיטלית.</p>
                <p style="color: #666; font-size: 12px; text-align: center; margin-top: 40px;">זירת האדריכלות</p>
              </div>
            `,
          });
        } catch (emailError) {
          console.error("Failed to send contract signing email to client:", emailError);
        }
      }
    }

    const contract = await prisma.crmContract.update({
      where: { id: contractId },
      data: updateData,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            client: { select: { id: true, name: true, email: true, phone: true, address: true } },
          },
        },
        template: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(contract);
  } catch (error) {
    console.error("Contract update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון חוזה" }, { status: 500 });
  }
}

// DELETE /api/designer/crm/contracts/[contractId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { contractId } = await params;

    const existing = await prisma.crmContract.findFirst({
      where: { id: contractId, designerId },
    });
    if (!existing) {
      return NextResponse.json({ error: "חוזה לא נמצא" }, { status: 404 });
    }

    await prisma.crmContract.delete({ where: { id: contractId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contract delete error:", error);
    return NextResponse.json({ error: "שגיאה במחיקת חוזה" }, { status: 500 });
  }
}
