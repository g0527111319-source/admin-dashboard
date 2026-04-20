import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// PATCH /api/supplier/reviews/[reviewId] — supplier updates their private ratings
// Only the supplier who created the review can edit. Ratings are private.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { reviewId: string } }
) {
  try {
    const supplierId = req.headers.get("x-user-id");
    const role = req.headers.get("x-user-role");
    if (!supplierId || (role !== "supplier" && role !== "admin")) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const { reviewId } = params;
    const review = await prisma.supplierDesignerReview.findUnique({
      where: { id: reviewId },
      select: { supplierId: true },
    });
    if (!review) {
      return NextResponse.json({ error: "ביקורת לא נמצאה" }, { status: 404 });
    }
    if (review.supplierId !== supplierId && role !== "admin") {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const body = await req.json();
    const allowed: Record<string, unknown> = {};
    if (body.availabilityScore !== undefined) {
      const v = Number(body.availabilityScore);
      allowed.availabilityScore = Number.isFinite(v) && v >= 1 && v <= 5 ? v : null;
    }
    if (body.reliabilityScore !== undefined) {
      const v = Number(body.reliabilityScore);
      allowed.reliabilityScore = Number.isFinite(v) && v >= 1 && v <= 5 ? v : null;
    }
    if (body.priceScore !== undefined) {
      const v = Number(body.priceScore);
      allowed.priceScore = Number.isFinite(v) && v >= 1 && v <= 5 ? v : null;
    }

    const updated = await prisma.supplierDesignerReview.update({
      where: { id: reviewId },
      data: allowed,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Supplier review update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון ביקורת" }, { status: 500 });
  }
}

// DELETE /api/supplier/reviews/[reviewId] — supplier deletes their own review
export async function DELETE(
  req: NextRequest,
  { params }: { params: { reviewId: string } }
) {
  try {
    const supplierId = req.headers.get("x-user-id");
    const role = req.headers.get("x-user-role");
    if (!supplierId || (role !== "supplier" && role !== "admin")) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const { reviewId } = params;
    const review = await prisma.supplierDesignerReview.findUnique({
      where: { id: reviewId },
      select: { supplierId: true },
    });
    if (!review) {
      return NextResponse.json({ error: "ביקורת לא נמצאה" }, { status: 404 });
    }
    if (review.supplierId !== supplierId && role !== "admin") {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    await prisma.supplierDesignerReview.delete({ where: { id: reviewId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Supplier review delete error:", error);
    return NextResponse.json({ error: "שגיאה במחיקת ביקורת" }, { status: 500 });
  }
}
