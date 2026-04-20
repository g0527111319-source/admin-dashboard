import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ALLOWED_CONSENT = ["ANONYMOUS", "FULL", "DECLINED"] as const;

// GET /api/supplier/reviews/token/[token] — public: load review by token
// Designer visits /supplier-review/[token] and fills out the form.
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const review = await prisma.supplierDesignerReview.findUnique({
      where: { token },
      include: {
        supplier: { select: { name: true, contactName: true } },
        designer: { select: { firstName: true, fullName: true } },
      },
    });

    if (!review) {
      return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
    }

    return NextResponse.json({
      completedAt: review.completedAt,
      supplierName: review.supplier?.name || review.supplier?.contactName || "הספק",
      designerFirstName: review.designer?.firstName || review.designer?.fullName || "",
    });
  } catch (error) {
    console.error("Public supplier-review GET error:", error);
    return NextResponse.json({ error: "שגיאה" }, { status: 500 });
  }
}

// PATCH /api/supplier/reviews/token/[token] — public: designer submits review
export async function PATCH(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const review = await prisma.supplierDesignerReview.findUnique({
      where: { token },
      select: { id: true, completedAt: true },
    });
    if (!review) {
      return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
    }
    if (review.completedAt) {
      return NextResponse.json({ error: "הביקורת כבר נשלחה" }, { status: 400 });
    }

    const body = await req.json();
    const freeTextComment = typeof body.freeTextComment === "string" ? body.freeTextComment.trim() : "";
    const publishConsent = body.publishConsent;

    if (!freeTextComment) {
      return NextResponse.json({ error: "נא להוסיף טקסט לביקורת" }, { status: 400 });
    }
    if (!ALLOWED_CONSENT.includes(publishConsent)) {
      return NextResponse.json({ error: "יש לבחור אפשרות פרסום" }, { status: 400 });
    }

    const updated = await prisma.supplierDesignerReview.update({
      where: { id: review.id },
      data: {
        freeTextComment,
        publishConsent,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, id: updated.id });
  } catch (error) {
    console.error("Public supplier-review PATCH error:", error);
    return NextResponse.json({ error: "שגיאה בשליחת הביקורת" }, { status: 500 });
  }
}
