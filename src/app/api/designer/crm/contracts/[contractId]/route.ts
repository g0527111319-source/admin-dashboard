import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
      // TODO: Send actual email via transactional email service
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
