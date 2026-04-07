/**
 * Coupons / discount codes (item 7).
 */
import prisma from "./prisma";
import { logSubscriptionAudit } from "./subscription-audit";

export type CouponValidation =
  | { ok: true; couponId: string; discountType: string; discountValue: number; durationMonths: number; description: string }
  | { ok: false; reason: string };

export async function validateCoupon(
  code: string,
  planId?: string,
  designerId?: string
): Promise<CouponValidation> {
  const normalizedCode = code.trim().toUpperCase();
  const coupon = await prisma.coupon.findUnique({
    where: { code: normalizedCode },
  });

  if (!coupon) return { ok: false, reason: "קוד קופון לא קיים" };
  if (!coupon.isActive) return { ok: false, reason: "הקופון אינו פעיל" };

  const now = new Date();
  if (coupon.validFrom > now) return { ok: false, reason: "הקופון עדיין לא פעיל" };
  if (coupon.validUntil && coupon.validUntil < now) return { ok: false, reason: "פג תוקף הקופון" };

  if (coupon.maxRedemptions && coupon.redemptionCount >= coupon.maxRedemptions) {
    return { ok: false, reason: "הקופון מומש במלואו" };
  }

  if (planId && coupon.applicablePlanIds.length > 0 && !coupon.applicablePlanIds.includes(planId)) {
    return { ok: false, reason: "הקופון אינו חל על התוכנית שנבחרה" };
  }

  if (designerId) {
    const already = await prisma.couponRedemption.findUnique({
      where: { couponId_designerId: { couponId: coupon.id, designerId } },
    });
    if (already) return { ok: false, reason: "כבר מימשת קופון זה בעבר" };
  }

  return {
    ok: true,
    couponId: coupon.id,
    discountType: coupon.discountType,
    discountValue: Number(coupon.discountValue),
    durationMonths: coupon.durationMonths,
    description: coupon.description || "",
  };
}

export function applyCouponToPrice(
  basePrice: number,
  discountType: string,
  discountValue: number
): number {
  if (discountType === "percent") {
    return Math.max(0, basePrice * (1 - discountValue / 100));
  }
  if (discountType === "fixed") {
    return Math.max(0, basePrice - discountValue);
  }
  if (discountType === "free_months") {
    return 0;
  }
  return basePrice;
}

export async function redeemCoupon(
  couponId: string,
  designerId: string,
  subscriptionId: string
): Promise<void> {
  const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
  if (!coupon) throw new Error("Coupon not found");

  await prisma.$transaction([
    prisma.couponRedemption.create({
      data: { couponId, designerId },
    }),
    prisma.coupon.update({
      where: { id: couponId },
      data: { redemptionCount: { increment: 1 } },
    }),
    prisma.designerSubscription.update({
      where: { id: subscriptionId },
      data: {
        appliedCouponId: couponId,
        couponDiscountPercent: coupon.discountType === "percent" ? Number(coupon.discountValue) : null,
        couponEndsAt: new Date(Date.now() + coupon.durationMonths * 30 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  await logSubscriptionAudit({
    subscriptionId,
    designerId,
    action: "coupon_applied",
    actorType: "designer",
    toValue: coupon.code,
    metadata: {
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      durationMonths: coupon.durationMonths,
    },
  });
}
