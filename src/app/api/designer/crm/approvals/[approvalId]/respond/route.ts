import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/designer/crm/approvals/[approvalId]/respond — תגובת לקוח לבקשת אישור (ציבורי, מאומת בטוקן)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ approvalId: string }> }
) {
  try {
    const { approvalId } = await params;
    const body = await req.json();
    const { token, status, comment, selectedOptionId } = body;

    if (!token) {
      return NextResponse.json({ error: "טוקן חסר" }, { status: 400 });
    }

    if (!status || !["APPROVED", "CHANGES_REQUESTED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "סטטוס לא תקין" }, { status: 400 });
    }

    // Verify token matches the approval
    const approval = await prisma.crmApprovalRequest.findFirst({
      where: { id: approvalId, token },
      include: {
        options: true,
      },
    });

    if (!approval) {
      return NextResponse.json({ error: "בקשת אישור לא נמצאה או טוקן לא תקין" }, { status: 404 });
    }

    // Update option selection if provided
    if (selectedOptionId) {
      const option = approval.options.find((o) => o.id === selectedOptionId);
      if (!option) {
        return NextResponse.json({ error: "אפשרות לא נמצאה" }, { status: 404 });
      }

      // Set all options to not selected, then select the chosen one
      await prisma.crmApprovalOption.updateMany({
        where: { approvalId },
        data: { isSelected: false },
      });

      await prisma.crmApprovalOption.update({
        where: { id: selectedOptionId },
        data: { isSelected: true },
      });
    }

    // Update approval status
    const updatedApproval = await prisma.crmApprovalRequest.update({
      where: { id: approvalId },
      data: {
        status,
        clientComment: comment?.trim() || null,
        respondedAt: new Date(),
      },
      include: {
        options: { orderBy: { sortOrder: "asc" } },
      },
    });

    // Create activity log
    const action = status === "APPROVED" ? "client_approved" : "client_changes_requested";
    await prisma.crmActivityLog.create({
      data: {
        designerId: approval.designerId,
        projectId: approval.projectId,
        clientId: approval.clientId,
        action,
        entityType: "approval",
        entityId: approval.id,
        actorType: "client",
      },
    });

    return NextResponse.json(updatedApproval);
  } catch (error) {
    console.error("CRM approval respond error:", error);
    return NextResponse.json({ error: "שגיאה בשליחת תגובה" }, { status: 500 });
  }
}
