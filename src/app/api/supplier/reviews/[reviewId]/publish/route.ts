import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/supplier/reviews/[reviewId]/publish
// Toggles publishedAt. Preconditions:
//   - review must be completed (designer filled the form)
//   - freeTextComment must be non-empty
//   - publishConsent must be "FULL" or "ANONYMOUS"
export async function POST(
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
    });
    if (!review) {
      return NextResponse.json({ error: "ביקורת לא נמצאה" }, { status: 404 });
    }
    if (review.supplierId !== supplierId && role !== "admin") {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const unpublishing = !!review.publishedAt;

    if (!unpublishing) {
      if (!review.completedAt) {
        return NextResponse.json({ error: "המעצבת עוד לא מילאה את הביקורת" }, { status: 400 });
      }
      if (!review.freeTextComment || !review.freeTextComment.trim()) {
        return NextResponse.json({ error: "אין טקסט ביקורת לפרסום" }, { status: 400 });
      }
      if (review.publishConsent !== "FULL" && review.publishConsent !== "ANONYMOUS") {
        return NextResponse.json(
          { error: "המעצבת לא אישרה פרסום של הביקורת" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.supplierDesignerReview.update({
      where: { id: reviewId },
      data: { publishedAt: unpublishing ? null : new Date() },
    });

    return NextResponse.json({ success: true, publishedAt: updated.publishedAt });
  } catch (error) {
    console.error("Supplier review publish toggle error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון סטטוס פרסום" }, { status: 500 });
  }
}
