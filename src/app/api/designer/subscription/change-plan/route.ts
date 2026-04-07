/**
 * POST /api/designer/subscription/change-plan
 *
 * Change a designer's subscription plan mid-cycle.
 * - Upgrade  -> immediate switch with prorated charge for remaining days.
 * - Downgrade -> scheduled at the end of the current period (no immediate change).
 *
 * Body: { designerId: string, newPlanId: string, couponCode?: string }
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logSubscriptionAudit } from "@/lib/subscription-audit";
import { calculateProration, prorationDescription } from "@/lib/subscription-proration";
import { validateCoupon, redeemCoupon } from "@/lib/coupons";
import { createNotification } from "@/lib/notifications";
import { sendEmail, subscriptionPausedEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { designerId, newPlanId, couponCode } = body as {
      designerId?: string;
      newPlanId?: string;
      couponCode?: string;
    };

    if (!designerId || !newPlanId) {
      return NextResponse.json(
        { error: "חסרים פרטים: מזהה מעצבת או תוכנית חדשה" },
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

    const newPlan = await prisma.subscriptionPlan.findUnique({
      where: { id: newPlanId },
    });
    if (!newPlan || !newPlan.isActive) {
      return NextResponse.json(
        { error: "התוכנית החדשה לא נמצאה או אינה פעילה" },
        { status: 404 }
      );
    }

    if (subscription.planId === newPlanId) {
      return NextResponse.json(
        { error: "המנוי כבר משויך לתוכנית זו" },
        { status: 400 }
      );
    }

    const currentPrice = Number(subscription.plan.price);
    const newPrice = Number(newPlan.price);
    const isUpgrade = newPrice > currentPrice;
    const now = new Date();

    // Validate coupon if provided
    let couponInfo: { ok: true; couponId: string; discountType: string; discountValue: number; durationMonths: number; description: string } | null = null;
    if (couponCode) {
      const validation = await validateCoupon(couponCode, newPlanId, designerId);
      if (!validation.ok) {
        return NextResponse.json({ error: validation.reason }, { status: 400 });
      }
      couponInfo = validation;
    }

    const designer = await prisma.designer.findUnique({
      where: { id: designerId },
      select: { fullName: true, email: true },
    });

    if (isUpgrade) {
      // Calculate proration on the upgrade
      const proration = calculateProration(
        currentPrice,
        newPrice,
        subscription.currentPeriodStart,
        subscription.currentPeriodEnd,
        now
      );

      // Record pending charge for net due now
      if (proration.netDueNow > 0) {
        await prisma.subscriptionPayment.create({
          data: {
            subscriptionId: subscription.id,
            amount: proration.netDueNow,
            currency: newPlan.currency,
            status: "pending",
            failureReason: null,
            paymentMethod: "proration",
          },
        });
      }

      const updated = await prisma.designerSubscription.update({
        where: { id: subscription.id },
        data: {
          planId: newPlan.id,
          currentPeriodStart: now,
          // keep same period end
        },
        include: { plan: true },
      });

      if (couponInfo) {
        await redeemCoupon(couponInfo.couponId, designerId, subscription.id);
      }

      await logSubscriptionAudit({
        subscriptionId: subscription.id,
        designerId,
        action: "plan_changed",
        actorType: "designer",
        fromValue: subscription.plan.name,
        toValue: newPlan.name,
        metadata: {
          proration,
          couponApplied: couponInfo?.couponId || null,
        },
        reason: "Mid-cycle upgrade",
      });

      const description = prorationDescription(
        proration,
        subscription.plan.name,
        newPlan.name
      );

      await createNotification({
        userId: designerId,
        type: "payment_success",
        title: "המנוי שודרג",
        body: description,
        linkUrl: "/designer",
      });

      if (designer?.email) {
        await sendEmail({
          to: designer.email,
          subject: `המנוי שודרג ל־${newPlan.name}`,
          html: `<div dir="rtl"><p>שלום ${designer.fullName || ""},</p><p>${description}</p></div>`,
        });
      }

      return NextResponse.json({
        success: true,
        type: "upgrade",
        message: description,
        proration,
        subscription: updated,
      });
    }

    // Downgrade — schedule for end of period
    const updated = await prisma.designerSubscription.update({
      where: { id: subscription.id },
      data: {
        scheduledDowngradeAt: subscription.currentPeriodEnd,
        scheduledDowngradePlanId: newPlan.id,
      },
      include: { plan: true },
    });

    if (couponInfo) {
      await redeemCoupon(couponInfo.couponId, designerId, subscription.id);
    }

    await logSubscriptionAudit({
      subscriptionId: subscription.id,
      designerId,
      action: "downgrade_scheduled",
      actorType: "designer",
      fromValue: subscription.plan.name,
      toValue: newPlan.name,
      metadata: {
        scheduledFor: subscription.currentPeriodEnd.toISOString(),
        couponApplied: couponInfo?.couponId || null,
      },
      reason: "Designer requested downgrade",
    });

    const message = `שינמוך מ־${subscription.plan.name} ל־${newPlan.name} מתוזמן ל־${subscription.currentPeriodEnd.toLocaleDateString("he-IL")}. עד אז תמשיכי ליהנות מכל יתרונות המנוי הנוכחי.`;

    await createNotification({
      userId: designerId,
      type: "downgrade_reminder",
      title: "שינמוך מתוזמן",
      body: message,
      linkUrl: "/designer",
    });

    if (designer?.email) {
      const tpl = subscriptionPausedEmail(
        designer.fullName || "",
        subscription.currentPeriodEnd
      );
      // reuse the simple paused-style template wrapper, but with a downgrade subject
      await sendEmail({
        to: designer.email,
        subject: `שינמוך תוכנית מתוזמן ל־${subscription.currentPeriodEnd.toLocaleDateString("he-IL")}`,
        html: tpl.html,
      });
    }

    return NextResponse.json({
      success: true,
      type: "downgrade_scheduled",
      message,
      scheduledFor: subscription.currentPeriodEnd,
      subscription: updated,
    });
  } catch (error) {
    console.error("[change-plan] error:", error);
    return NextResponse.json(
      { error: "שגיאה בשינוי תוכנית המנוי" },
      { status: 500 }
    );
  }
}
