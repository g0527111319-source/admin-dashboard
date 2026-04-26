import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// PATCH /api/admin/suppliers/[id] — update mutable fields on a supplier
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "חסר מזהה ספק" }, { status: 400 });

    const body = await req.json();
    const data: Record<string, unknown> = {};

    const stringFields = ["name", "contactName", "phone", "email", "category", "city", "area", "website", "description", "notes"] as const;
    for (const f of stringFields) {
      if (body[f] !== undefined) data[f] = body[f] === null ? null : String(body[f]);
    }
    if (body.monthlyFee !== undefined) {
      data.monthlyFee = body.monthlyFee === null || body.monthlyFee === "" ? null : Number(body.monthlyFee);
    }
    if (body.isActive !== undefined) data.isActive = !!body.isActive;
    if (body.isHidden !== undefined) data.isHidden = !!body.isHidden;
    if (body.paymentStatus !== undefined) data.paymentStatus = body.paymentStatus;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "אין שדות לעדכון" }, { status: 400 });
    }

    const updated = await prisma.supplier.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Admin supplier update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון ספק" }, { status: 500 });
  }
}

// DELETE /api/admin/suppliers/[id] — soft delete (isActive=false)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "חסר מזהה ספק" }, { status: 400 });

    const updated = await prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Admin supplier delete error:", error);
    return NextResponse.json({ error: "שגיאה בהשבתת ספק" }, { status: 500 });
  }
}
