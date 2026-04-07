import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateCoupon, applyCouponToPrice } from "@/lib/coupons";

export const dynamic = "force-dynamic";

// POST /api/designer/coupons/validate
// Body: { code, planId, designerId }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, planId, designerId } = body || {};

    if (!code) {
      return NextResponse.json(
        { ok: false, reason: "חסר קוד קופון" },
        { status: 400 },
      );
    }

    const result = await validateCoupon(code, planId, designerId);

    if (!result.ok) {
      return NextResponse.json({ ok: false, reason: result.reason });
    }

    let previewPrice: number | null = null;
    if (planId) {
      try {
        const plan = await prisma.subscriptionPlan.findUnique({
          where: { id: planId },
        });
        if (plan) {
          const basePrice = Number(plan.price);
          previewPrice = applyCouponToPrice(
            basePrice,
            result.discountType,
            result.discountValue,
          );
        }
      } catch (innerErr) {
        console.error("Coupon preview price error:", innerErr);
      }
    }

    return NextResponse.json({
      ok: true,
      discount: {
        type: result.discountType,
        value: result.discountValue,
        description: result.description,
        previewPrice,
      },
    });
  } catch (error) {
    console.error("Coupon validate error:", error);
    return NextResponse.json(
      { ok: false, reason: "שגיאה באימות הקופון" },
      { status: 500 },
    );
  }
}
