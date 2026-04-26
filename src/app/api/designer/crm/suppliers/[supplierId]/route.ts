export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

// PATCH /api/designer/crm/suppliers/[supplierId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ supplierId: string }> }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const { supplierId } = await params;
    const body = await req.json();

    const existing = await prisma.crmSupplier.findFirst({
      where: { id: supplierId, designerId, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: "ספק לא נמצא" }, { status: 404 });
    }

    const { name, category, contactName, phone, email, website, notes } = body;

    const supplier = await prisma.crmSupplier.update({
      where: { id: supplierId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(category !== undefined && { category: category.trim() }),
        ...(contactName !== undefined && {
          contactName: contactName?.trim() || null,
        }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(website !== undefined && { website: website?.trim() || null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
      },
    });

    return NextResponse.json(supplier);
  } catch (error) {
    console.error("CRM supplier update error:", error);
    return NextResponse.json(
      { error: "שגיאה בעדכון ספק" },
      { status: 500 }
    );
  }
}

// DELETE /api/designer/crm/suppliers/[supplierId] — soft delete
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ supplierId: string }> }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const { supplierId } = await params;

    const existing = await prisma.crmSupplier.findFirst({
      where: { id: supplierId, designerId, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: "ספק לא נמצא" }, { status: 404 });
    }

    await prisma.crmSupplier.update({
      where: { id: supplierId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CRM supplier delete error:", error);
    return NextResponse.json(
      { error: "שגיאה במחיקת ספק" },
      { status: 500 }
    );
  }
}
