export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/designer/crm/approvals/[approvalId]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ approvalId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { approvalId } = await params;

    const approval = await prisma.crmApprovalRequest.findFirst({
      where: { id: approvalId, designerId },
      include: {
        options: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!approval) {
      return NextResponse.json({ error: "בקשת אישור לא נמצאה" }, { status: 404 });
    }

    return NextResponse.json(approval);
  } catch (error) {
    console.error("CRM approval get error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת בקשת אישור" }, { status: 500 });
  }
}

// PATCH /api/designer/crm/approvals/[approvalId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ approvalId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { approvalId } = await params;
    const body = await req.json();

    const existing = await prisma.crmApprovalRequest.findFirst({
      where: { id: approvalId, designerId },
    });
    if (!existing) {
      return NextResponse.json({ error: "בקשת אישור לא נמצאה" }, { status: 404 });
    }

    const { title, description, status } = body;

    const approval = await prisma.crmApprovalRequest.update({
      where: { id: approvalId },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(status !== undefined && { status }),
      },
      include: {
        options: { orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json(approval);
  } catch (error) {
    console.error("CRM approval update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון בקשת אישור" }, { status: 500 });
  }
}

// DELETE /api/designer/crm/approvals/[approvalId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ approvalId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { approvalId } = await params;

    const existing = await prisma.crmApprovalRequest.findFirst({
      where: { id: approvalId, designerId },
    });
    if (!existing) {
      return NextResponse.json({ error: "בקשת אישור לא נמצאה" }, { status: 404 });
    }

    await prisma.crmApprovalRequest.delete({
      where: { id: approvalId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CRM approval delete error:", error);
    return NextResponse.json({ error: "שגיאה במחיקת בקשת אישור" }, { status: 500 });
  }
}
