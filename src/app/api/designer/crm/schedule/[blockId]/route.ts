export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

// PATCH /api/designer/crm/schedule/[blockId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ blockId: string }> }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const { blockId } = await params;
    const body = await req.json();

    const existing = await prisma.crmScheduleBlock.findFirst({
      where: { id: blockId, designerId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "בלוק לוח זמנים לא נמצא" },
        { status: 404 }
      );
    }

    const {
      title,
      startDate,
      endDate,
      durationDays,
      color,
      dependsOn,
      supplierName,
      supplierPhone,
      status,
      delayReason,
      notes,
      sortOrder,
    } = body;

    const block = await prisma.crmScheduleBlock.update({
      where: { id: blockId },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(startDate !== undefined && {
          startDate: startDate ? new Date(startDate) : null,
        }),
        ...(endDate !== undefined && {
          endDate: endDate ? new Date(endDate) : null,
        }),
        ...(durationDays !== undefined && { durationDays }),
        ...(color !== undefined && { color }),
        ...(dependsOn !== undefined && { dependsOn }),
        ...(supplierName !== undefined && {
          supplierName: supplierName?.trim() || null,
        }),
        ...(supplierPhone !== undefined && {
          supplierPhone: supplierPhone?.trim() || null,
        }),
        ...(status !== undefined && { status }),
        ...(delayReason !== undefined && {
          delayReason: delayReason?.trim() || null,
        }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return NextResponse.json(block);
  } catch (error) {
    console.error("CRM schedule block update error:", error);
    return NextResponse.json(
      { error: "שגיאה בעדכון בלוק בלוח הזמנים" },
      { status: 500 }
    );
  }
}

// DELETE /api/designer/crm/schedule/[blockId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ blockId: string }> }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const { blockId } = await params;

    const existing = await prisma.crmScheduleBlock.findFirst({
      where: { id: blockId, designerId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "בלוק לוח זמנים לא נמצא" },
        { status: 404 }
      );
    }

    await prisma.crmScheduleBlock.delete({
      where: { id: blockId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CRM schedule block delete error:", error);
    return NextResponse.json(
      { error: "שגיאה במחיקת בלוק מלוח הזמנים" },
      { status: 500 }
    );
  }
}
