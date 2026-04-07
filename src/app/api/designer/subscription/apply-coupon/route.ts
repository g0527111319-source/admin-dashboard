/**
 * POST /api/designer/subscription/apply-coupon
 *
 * Validate and apply a coupon code to the designer's current subscription.
 *
 * Body: { designerId: string, code: string }
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateCoupon, redeemCoupon, applyCouponToPrice } from "@/lib/coupons";
import { createNotification } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { designerId, code } = body as { designerId?: string; code?: string };

    if (!designerId || !code) {
      return NextResponse.json(
        { error: "חסרים פרטים: מזהה מעצבת או קוד קופון" },
        { status: 400 }
      );
    }

    const subscription = await prisma.designerSubscription.findUnique({
      where: { designerId },
      include: { plan: true },
    });

    if (!subscription) {
      return NextResponse.json({ error: "לא נמצא מנוי פעיל" }, { status: 404 });
    }

    const validation = await validateCoupon(code, subscription.planId, designerId);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.reason }, { status: 400 });
    }

    await redeemCoupon(validation.couponId, designerId, subscription.id);

    const basePrice = Number(subscription.plan.price);
    const newPrice = applyCouponToPrice(
      basePrice,
      validation.discountType,
      validation.discountValue
    );
    const savings = Math.max(0, basePrice - newPrice);

    let discountLabel = "";
    if (validation.discountType === "percent") {
      discountLabel = `${validation.discountValue}% הנחה`;
    } else if (validation.discountType === "fixed") {
      discountLabel = `הנחה של ₪${validation.discountValue.toFixed(2)}`;
    } else if (validation.discountType === "free_months") {
      discountLabel = `${validation.durationMonths} חודשים חינם`;
    }

    const message = `הקופון הוחל בהצלחה: ${discountLabel}. את חוסכת ₪${savings.toFixed(2)} ל־${validation.durationMonths} חודשים.`;

    await createNotification({
      userId: designerId,
      type: "payment_success",
      title: "קופון הוחל",
      body: message,
      linkUrl: "/designer",
    });

    return NextResponse.json({
      success: true,
      message,
      discount: {
        type: validation.discountType,
        value: validation.discountValue,
        durationMonths: validation.durationMonths,
        basePrice,
        newPrice,
        savings,
        description: validation.description,
      },
    });
  } catch (error) {
    console.error("[apply-coupon] error:", error);
    return NextResponse.json(
      { error: "שגיאה בהחלת הקופון" },
      { status: 500 }
    );
  }
}
