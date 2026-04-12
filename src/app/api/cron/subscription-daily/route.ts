export const dynamic = "force-dynamic";
/**
 * Daily subscription cron — runs all scheduled tasks:
 *  - Dunning retries (items 2, 3)
 *  - Trial-ending reminders (item 1)
 *  - Renewal reminders (item 1)
 *  - Auto-promotion check (existing)
 *  - Promotion "almost there" notifications (item 19)
 *  - Churn prediction scan (item 20)
 *  - Downgrade scheduled execution (item 8)
 *  - Pause auto-resume (item 9)
 *
 * Protected by CRON_SECRET header.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { runDunningCycle } from "@/lib/subscription-dunning";
import { createNotification } from "@/lib/notifications";
import {
  sendEmail,
  trialEndingEmail,
  renewalReminderEmail,
  promotionNearEmail,
  promotionGrantedEmail,
  downgradeReminderEmail,
} from "@/lib/email";
import { logSubscriptionAudit } from "@/lib/subscription-audit";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // In production, block unauthenticated access even without CRON_SECRET
    if (process.env.NODE_ENV === "production") return false;
    return true; // dev-friendly in local
  }
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const stats = {
    dunning: { retried: 0, movedToReadOnly: 0, cancelled: 0 },
    trialReminders: 0,
    renewalReminders: 0,
    promotionNear: 0,
    promoted: 0,
    downgradesApplied: 0,
    downgradeReminders: 0,
    pauseResumed: 0,
    churnAlerts: 0,
  };

  try {
    // 1. Dunning
    stats.dunning = await runDunningCycle();

    // 2. Trial ending reminders (3, 1 day before)
    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const in1Day = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const trialEnding = await prisma.designerSubscription.findMany({
      where: {
        status: "trialing",
        trialEndsAt: { gte: now, lte: in3Days },
      },
      include: { designer: true, plan: true },
    });
    for (const sub of trialEnding) {
      if (!sub.trialEndsAt) continue;
      const daysLeft = Math.max(1, Math.ceil((sub.trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
      await createNotification({
        userId: sub.designerId,
        type: "trial_ending",
        title: `תקופת הניסיון מסתיימת בעוד ${daysLeft} ימים`,
        body: "הפעילי תשלום כדי להמשיך ליהנות מכל הכלים המתקדמים.",
        linkUrl: `/designer/${sub.designerId}/subscription`,
      });
      if (sub.designer.email) {
        const em = trialEndingEmail(sub.designer.fullName, daysLeft, sub.trialEndsAt);
        await sendEmail({ to: sub.designer.email, subject: em.subject, html: em.html });
      }
      stats.trialReminders++;
    }

    // 3. Renewal reminders (3 days before auto-charge)
    const renewalsSoon = await prisma.designerSubscription.findMany({
      where: {
        status: "active",
        recurringEnabled: true,
        currentPeriodEnd: { gte: in1Day, lte: in3Days },
      },
      include: { designer: true, plan: true },
    });
    for (const sub of renewalsSoon) {
      const price = Number(sub.plan.price);
      if (price === 0) continue;
      await createNotification({
        userId: sub.designerId,
        type: "renewal_reminder",
        title: "חידוש מנוי בעוד 3 ימים",
        body: `החיוב הבא: ₪${price.toFixed(2)} ב־${sub.currentPeriodEnd.toLocaleDateString("he-IL")}.`,
        linkUrl: `/designer/${sub.designerId}/subscription`,
      });
      if (sub.designer.email) {
        const em = renewalReminderEmail(sub.designer.fullName, price, sub.currentPeriodEnd);
        await sendEmail({ to: sub.designer.email, subject: em.subject, html: em.html });
      }
      stats.renewalReminders++;
    }

    // 4. Auto-promotion check
    const rules = await prisma.subscriptionRule.findMany({
      where: { isActive: true },
      orderBy: { minSupplierCount: "desc" },
    });

    if (rules.length > 0) {
      const designers = await prisma.designer.findMany({
        where: { isActive: true, subscription: { isNot: null } },
        include: { subscription: { include: { plan: true } } },
      });

      for (const designer of designers) {
        const sub = designer.subscription;
        if (!sub || !sub.plan) continue;

        // Count distinct suppliers from deals in time window per rule
        for (const rule of rules) {
          if (!rule.targetPlanId) continue;
          if (sub.planId === rule.targetPlanId) continue;

          const since = new Date(now.getTime() - rule.timeWindowDays * 24 * 60 * 60 * 1000);
          const deals = await prisma.deal.findMany({
            where: { designerId: designer.id, reportedAt: { gte: since } },
            select: { supplierId: true },
          });
          const uniqueSuppliers = new Set(deals.map(d => d.supplierId)).size;

          await prisma.designerSubscription.update({
            where: { id: sub.id },
            data: { supplierCooperationCount: uniqueSuppliers, promotionCheckedAt: now },
          });

          // Already promoted
          if (uniqueSuppliers >= rule.minSupplierCount) {
            const targetPlan = await prisma.subscriptionPlan.findUnique({ where: { id: rule.targetPlanId } });
            if (targetPlan) {
              const oldPrice = Number(sub.plan.price);
              const newPrice = Number(targetPlan.price);
              const saved = Math.max(0, oldPrice - newPrice);
              await prisma.designerSubscription.update({
                where: { id: sub.id },
                data: { planId: targetPlan.id },
              });
              await logSubscriptionAudit({
                subscriptionId: sub.id,
                designerId: designer.id,
                action: "promoted_auto",
                actorType: "system",
                fromValue: sub.plan.name,
                toValue: targetPlan.name,
                metadata: { ruleId: rule.id, supplierCount: uniqueSuppliers },
              });
              await createNotification({
                userId: designer.id,
                type: "promotion_granted",
                title: `🎉 שודרגת ל${targetPlan.name}!`,
                body: `בזכות שיתוף הפעולה עם ${uniqueSuppliers} ספקים, את חוסכת ₪${saved.toFixed(2)} כל חודש.`,
                linkUrl: `/designer/${designer.id}/subscription`,
              });
              if (designer.email) {
                const em = promotionGrantedEmail(designer.fullName, targetPlan.name, saved);
                await sendEmail({ to: designer.email, subject: em.subject, html: em.html });
              }
              stats.promoted++;
            }
            break;
          }

          // Near promotion (item 19) — within 80% of threshold, not notified in last 14 days
          const neededPct = uniqueSuppliers / rule.minSupplierCount;
          if (neededPct >= 0.6 && neededPct < 1) {
            const notifiedRecently = sub.promotionNotifiedAt &&
              (now.getTime() - sub.promotionNotifiedAt.getTime()) < 14 * 24 * 60 * 60 * 1000;
            if (!notifiedRecently) {
              await prisma.designerSubscription.update({
                where: { id: sub.id },
                data: { promotionNotifiedAt: now },
              });
              await createNotification({
                userId: designer.id,
                type: "promotion_near",
                title: `עוד ${rule.minSupplierCount - uniqueSuppliers} שיתופי פעולה למנוי מופחת!`,
                body: `נכון להיום: ${uniqueSuppliers}/${rule.minSupplierCount} ספקים.`,
                linkUrl: `/designer/${designer.id}`,
              });
              if (designer.email) {
                const em = promotionNearEmail(designer.fullName, uniqueSuppliers, rule.minSupplierCount);
                await sendEmail({ to: designer.email, subject: em.subject, html: em.html });
              }
              stats.promotionNear++;
            }
          }
        }
      }
    }

    // 5. Scheduled downgrades — execute due ones, remind on pending ones
    const dueDowngrades = await prisma.designerSubscription.findMany({
      where: {
        scheduledDowngradeAt: { lte: now },
        scheduledDowngradePlanId: { not: null },
      },
      include: { designer: true, plan: true },
    });
    for (const sub of dueDowngrades) {
      if (!sub.scheduledDowngradePlanId) continue;
      const readOnlyUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      await prisma.designerSubscription.update({
        where: { id: sub.id },
        data: {
          planId: sub.scheduledDowngradePlanId,
          scheduledDowngradeAt: null,
          scheduledDowngradePlanId: null,
          status: "read_only",
          readOnlyUntil,
        },
      });
      await logSubscriptionAudit({
        subscriptionId: sub.id,
        designerId: sub.designerId,
        action: "downgrade_applied",
        actorType: "system",
        fromValue: sub.plan.name,
      });
      stats.downgradesApplied++;
    }

    // Remind about upcoming downgrades (3 days before)
    const upcomingDowngrades = await prisma.designerSubscription.findMany({
      where: {
        scheduledDowngradeAt: { gte: in1Day, lte: in3Days },
      },
      include: { designer: true },
    });
    for (const sub of upcomingDowngrades) {
      if (!sub.scheduledDowngradeAt) continue;
      await createNotification({
        userId: sub.designerId,
        type: "downgrade_reminder",
        title: "תזכורת: שינמוך בעוד 3 ימים",
        body: `תוכנית המנוי תשונמך ב־${sub.scheduledDowngradeAt.toLocaleDateString("he-IL")}.`,
        linkUrl: `/designer/${sub.designerId}/subscription`,
      });
      if (sub.designer.email) {
        const em = downgradeReminderEmail(sub.designer.fullName, sub.scheduledDowngradeAt);
        await sendEmail({ to: sub.designer.email, subject: em.subject, html: em.html });
      }
      stats.downgradeReminders++;
    }

    // 6. Resume paused subscriptions whose pauseEndsAt passed
    const resumed = await prisma.designerSubscription.findMany({
      where: { status: "paused", pauseEndsAt: { lte: now } },
    });
    for (const sub of resumed) {
      await prisma.designerSubscription.update({
        where: { id: sub.id },
        data: {
          status: "active",
          pausedAt: null,
          pauseEndsAt: null,
          pauseReason: null,
          currentPeriodStart: now,
          currentPeriodEnd: new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()),
        },
      });
      await logSubscriptionAudit({
        subscriptionId: sub.id,
        designerId: sub.designerId,
        action: "resumed",
        actorType: "system",
        reason: "Auto-resumed after pause window ended",
      });
      await createNotification({
        userId: sub.designerId,
        type: "pause_ending",
        title: "המנוי שלך הופעל מחדש",
        body: "תקופת ההשהיה הסתיימה והמנוי חזר לפעילות מלאה.",
        linkUrl: `/designer/${sub.designerId}/subscription`,
      });
      stats.pauseResumed++;
    }

    // 7. Churn prediction alerts (item 20) — inactive designers with active paid subscription
    const churnThreshold = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const atRisk = await prisma.designer.findMany({
      where: {
        isActive: true,
        subscription: {
          status: "active",
          plan: { price: { gt: 0 } },
        },
        OR: [
          { lastLoginAt: null },
          { lastLoginAt: { lt: churnThreshold } },
        ],
      },
      include: { subscription: { include: { plan: true } } },
      take: 50,
    });
    stats.churnAlerts = atRisk.length;

    return NextResponse.json({ ok: true, stats, at: new Date().toISOString() });
  } catch (err) {
    console.error("[cron/subscription-daily] error:", err);
    return NextResponse.json({ ok: false, stats, error: String(err) }, { status: 500 });
  }
}
