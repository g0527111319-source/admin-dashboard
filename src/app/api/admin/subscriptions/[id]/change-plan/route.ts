/**
 * POST /api/admin/subscriptions/[id]/change-plan
 *
 * Admin force-change of a subscription plan.
 * - immediate=true  -> apply now, no proration recorded.
 * - immediate=false -> schedule downgrade for end of period.
 *
 * Body: { newPlanId: string, immediate?: boolean, reason?: string }
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logSubscriptionAudit } from "@/lib/subscription-audit";
import { createNotification } from "@/lib/notifications";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "חסר מזהה מנוי" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { newPlanId, immediate, reason } = body as {
      newPlanId?: string;
      immediate?: boolean;
      reason?: string;
    };

    if (!newPlanId) {
      return NextResponse.json(
        { error: "חסר מזהה תוכנית חדשה" },
        { status: 400 }
      );
    }

    const subscription = await prisma.designerSubscription.findUnique({
      where: { id },
      include: { plan: true },
    });
    if (!subscription) {
      return NextResponse.json({ error: "מנוי לא נמצא" }, { status: 404 });
    }

    const newPlan = await prisma.subscriptionPlan.findUnique({
      where: { id: newPlanId },
    });
    if (!newPlan) {
      return NextResponse.json(
        { error: "התוכנית החדשה לא נמצאה" },
        { status: 404 }
      );
    }

    const adminId = req.headers.get("x-admin-id") || undefined;
    const adminName = req.headers.get("x-admin-name") || undefined;

    if (immediate) {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const updated = await prisma.designerSubscription.update({
        where: { id },
        data: {
          planId: newPlan.id,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          scheduledDowngradeAt: null,
          scheduledDowngradePlanId: null,
        },
        include: { plan: true },
      });

      await logSubscriptionAudit({
        subscriptionId: id,
        designerId: subscription.designerId,
        action: "plan_changed",
        actorType: "admin",
        actorId: adminId,
        actorName: adminName,
        fromValue: subscription.plan.name,
        toValue: newPlan.name,
        metadata: { immediate: true, noProration: true },
        reason: reason || "Admin force change",
      });

      await createNotification({
        userId: subscription.designerId,
        type: "payment_success",
        title: "תוכנית המנוי שונתה",
        body: `מנהל המערכת שינה את תוכנית המנוי שלך ל־${newPlan.name}.`,
        linkUrl: "/designer",
      });

      return NextResponse.json({
        success: true,
        type: "immediate",
        message: `התוכנית שונתה מיידית ל־${newPlan.name}`,
        subscription: updated,
      });
    }

    // Schedule downgrade
    const updated = await prisma.designerSubscription.update({
      where: { id },
      data: {
        scheduledDowngradeAt: subscription.currentPeriodEnd,
        scheduledDowngradePlanId: newPlan.id,
      },
      include: { plan: true },
    });

    await logSubscriptionAudit({
      subscriptionId: id,
      designerId: subscription.designerId,
      action: "downgrade_scheduled",
      actorType: "admin",
      actorId: adminId,
      actorName: adminName,
      fromValue: subscription.plan.name,
      toValue: newPlan.name,
      metadata: {
        scheduledFor: subscription.currentPeriodEnd.toISOString(),
      },
      reason: reason || "Admin scheduled downgrade",
    });

    await createNotification({
      userId: subscription.designerId,
      type: "downgrade_reminder",
      title: "שינוי תוכנית מתוזמן",
      body: `שינוי לתוכנית ${newPlan.name} יבוצע ב־${subscription.currentPeriodEnd.toLocaleDateString("he-IL")}.`,
      linkUrl: "/designer",
    });

    return NextResponse.json({
      success: true,
      type: "scheduled",
      message: `שינוי לתוכנית ${newPlan.name} מתוזמן ל־${subscription.currentPeriodEnd.toLocaleDateString("he-IL")}`,
      scheduledFor: subscription.currentPeriodEnd,
      subscription: updated,
    });
  } catch (error) {
    console.error("[admin change-plan] error:", error);
    return NextResponse.json(
      { error: "שגיאה בשינוי תוכנית המנוי" },
      { status: 500 }
    );
  }
}
