export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

// PATCH /api/designer/crm/budget/[itemId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const { itemId } = await params;
    const body = await req.json();

    // Verify ownership
    const existing = await prisma.crmBudgetItem.findFirst({
      where: { id: itemId, designerId },
    });
    if (!existing) {
      return NextResponse.json({ error: "פריט תקציב לא נמצא" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.category !== undefined) updateData.category = body.category.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;
    if (body.plannedAmount !== undefined) updateData.plannedAmount = body.plannedAmount;
    if (body.actualAmount !== undefined) updateData.actualAmount = body.actualAmount;
    if (body.supplierName !== undefined) updateData.supplierName = body.supplierName?.trim() || null;
    if (body.quoteId !== undefined) updateData.quoteId = body.quoteId;
    if (body.contractId !== undefined) updateData.contractId = body.contractId;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null;

    const item = await prisma.crmBudgetItem.update({
      where: { id: itemId },
      data: updateData,
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Budget item update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון פריט תקציב" }, { status: 500 });
  }
}

// DELETE /api/designer/crm/budget/[itemId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const { itemId } = await params;

    const existing = await prisma.crmBudgetItem.findFirst({
      where: { id: itemId, designerId },
    });
    if (!existing) {
      return NextResponse.json({ error: "פריט תקציב לא נמצא" }, { status: 404 });
    }

    await prisma.crmBudgetItem.delete({ where: { id: itemId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Budget item delete error:", error);
    return NextResponse.json({ error: "שגיאה במחיקת פריט תקציב" }, { status: 500 });
  }
}
