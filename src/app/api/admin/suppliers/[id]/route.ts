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

// DELETE /api/admin/suppliers/[id]
//   default: soft delete (isActive=false) — supplier is hidden but the row +
//     all dependent data (posts, reviews, deals, reservations) stay intact.
//   ?hard=true: permanent delete — supplier row + all dependent data removed.
//     Caller must also send {confirmName: "<exact supplier name>"} in the body
//     to prevent accidental nukes.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "חסר מזהה ספק" }, { status: 400 });

    const url = new URL(req.url);
    const isHard = url.searchParams.get("hard") === "true";

    if (!isHard) {
      // Soft delete (legacy behaviour)
      const updated = await prisma.supplier.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json(updated);
    }

    // Hard delete — verify confirmName matches the supplier's name first.
    const body = await req.json().catch(() => ({})) as { confirmName?: string };
    const confirmName = (body.confirmName || "").trim();
    if (!confirmName) {
      return NextResponse.json(
        { error: "מחיקה לצמיתות דורשת אישור עם שם הספק" },
        { status: 400 },
      );
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!supplier) {
      return NextResponse.json({ error: "ספק לא נמצא" }, { status: 404 });
    }
    if (supplier.name.trim() !== confirmName) {
      return NextResponse.json(
        { error: "שם הספק לאישור אינו תואם" },
        { status: 400 },
      );
    }

    // Cascade-delete dependent rows that don't have ON DELETE CASCADE in the
    // schema (Post, SupplierDesignerReview, SupplierReservation, Deal). The
    // recommenders relation already cascades.
    const result = await prisma.$transaction(async (tx) => {
      const posts = await tx.post.deleteMany({ where: { supplierId: id } });
      const reviews = await tx.supplierDesignerReview.deleteMany({ where: { supplierId: id } });
      const reservations = await tx.supplierReservation.deleteMany({ where: { supplierId: id } });
      const deals = await tx.deal.deleteMany({ where: { supplierId: id } });
      await tx.supplier.delete({ where: { id } });
      return {
        posts: posts.count,
        reviews: reviews.count,
        reservations: reservations.count,
        deals: deals.count,
      };
    });

    return NextResponse.json({
      success: true,
      message: `${supplier.name} נמחק לצמיתות`,
      deleted: result,
    });
  } catch (error) {
    console.error("Admin supplier delete error:", error);
    return NextResponse.json({ error: "שגיאה במחיקת ספק" }, { status: 500 });
  }
}
