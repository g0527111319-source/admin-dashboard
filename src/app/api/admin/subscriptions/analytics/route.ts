import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// GET /api/admin/subscriptions/analytics — Revenue & subscription analytics
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Pull all active/paid subs with plan + designer
    const activeSubs = await prisma.designerSubscription.findMany({
      where: {
        status: { in: ["active", "trialing", "past_due"] },
        deletedAt: null,
      },
      include: {
        plan: true,
        designer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            lastLoginAt: true,
            joinDate: true,
          },
        },
      },
    });

    // MRR — sum of monthly prices for active non-free
    let mrr = 0;
    const planMap = new Map<string, { planName: string; count: number; mrr: number }>();

    for (const sub of activeSubs) {
      const price = Number(sub.plan.price || 0);
      if (price <= 0) continue;
      // Normalize to monthly
      let monthly = price;
      if (sub.plan.billingCycle === "yearly") monthly = price / 12;
      mrr += monthly;

      const existing = planMap.get(sub.plan.id);
      if (existing) {
        existing.count += 1;
        existing.mrr += monthly;
      } else {
        planMap.set(sub.plan.id, {
          planName: sub.plan.name,
          count: 1,
          mrr: monthly,
        });
      }
    }

    const planBreakdown = Array.from(planMap.values()).sort((a, b) => b.mrr - a.mrr);

    const arr = mrr * 12;
    const activeCount = activeSubs.length;
    const trialCount = activeSubs.filter((s) => s.status === "trialing").length;

    // Churned this month
    const churnedThisMonth = await prisma.designerSubscription.count({
      where: {
        status: "cancelled",
        cancelledAt: { gte: startOfMonth },
      },
    });

    // Churn rate: cancelled in last 30d / active 30d ago
    const churned30d = await prisma.designerSubscription.count({
      where: {
        status: "cancelled",
        cancelledAt: { gte: thirtyDaysAgo },
      },
    });
    // Approximation: subs that existed 30 days ago = active now + churned in last 30d
    const activeStart30d = activeCount + churned30d;
    const churnRate = activeStart30d > 0 ? (churned30d / activeStart30d) * 100 : 0;

    // New this month
    const newThisMonth = await prisma.designerSubscription.count({
      where: {
        createdAt: { gte: startOfMonth },
      },
    });

    // Revenue by month — last 12 months from successful payments
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const successfulPayments = await prisma.subscriptionPayment.findMany({
      where: {
        status: "succeeded",
        paidAt: { gte: twelveMonthsAgo },
      },
      select: { amount: true, paidAt: true },
    });

    const monthBuckets = new Map<string, { revenue: number; count: number }>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthBuckets.set(key, { revenue: 0, count: 0 });
    }
    for (const p of successfulPayments) {
      if (!p.paidAt) continue;
      const key = `${p.paidAt.getFullYear()}-${String(p.paidAt.getMonth() + 1).padStart(2, "0")}`;
      const bucket = monthBuckets.get(key);
      if (bucket) {
        bucket.revenue += Number(p.amount);
        bucket.count += 1;
      }
    }
    const revenueByMonth = Array.from(monthBuckets.entries()).map(([month, v]) => ({
      month,
      revenue: v.revenue,
      count: v.count,
    }));

    // At risk — past_due or failed payment count > 0
    const atRiskSubs = activeSubs
      .filter((s) => s.status === "past_due" || (s.failedPaymentCount || 0) > 0)
      .slice(0, 20)
      .map((s) => ({
        id: s.id,
        designerId: s.designerId,
        fullName: s.designer.fullName,
        email: s.designer.email,
        phone: s.designer.phone,
        planName: s.plan.name,
        status: s.status,
        failedPaymentCount: s.failedPaymentCount,
        lastFailedPaymentAt: s.lastFailedPaymentAt,
        gracePeriodEndsAt: s.gracePeriodEndsAt,
      }));

    // Churn at risk — paid + lastLoginAt < 14 days ago (or null)
    const churnAtRisk = activeSubs
      .filter((s) => {
        const price = Number(s.plan.price || 0);
        if (price <= 0) return false;
        const last = s.designer.lastLoginAt;
        if (!last) return true;
        return last < fourteenDaysAgo;
      })
      .map((s) => {
        const last = s.designer.lastLoginAt;
        const daysSinceLogin = last
          ? Math.floor((now.getTime() - last.getTime()) / (24 * 60 * 60 * 1000))
          : 999;
        return {
          id: s.id,
          designerId: s.designerId,
          fullName: s.designer.fullName,
          email: s.designer.email,
          phone: s.designer.phone,
          planName: s.plan.name,
          lastLoginAt: last,
          daysSinceLogin,
        };
      })
      .sort((a, b) => b.daysSinceLogin - a.daysSinceLogin)
      .slice(0, 20);

    // Upcoming renewals — next 7 days
    const upcomingRenewalSubs = activeSubs.filter(
      (s) => s.currentPeriodEnd >= now && s.currentPeriodEnd <= sevenDaysFromNow,
    );
    let upcomingRenewalsSum = 0;
    for (const s of upcomingRenewalSubs) {
      const price = Number(s.plan.price || 0);
      let monthly = price;
      if (s.plan.billingCycle === "yearly") monthly = price / 12;
      upcomingRenewalsSum += monthly;
    }
    const upcomingRenewals = {
      count: upcomingRenewalSubs.length,
      sum: upcomingRenewalsSum,
    };

    // Inactive paid — paid sub + lastLoginAt > 30 days ago (or null)
    const inactivePaid = activeSubs
      .filter((s) => {
        const price = Number(s.plan.price || 0);
        if (price <= 0) return false;
        const last = s.designer.lastLoginAt;
        if (!last) return true;
        return last < thirtyDaysAgo;
      })
      .map((s) => {
        const last = s.designer.lastLoginAt;
        const daysSinceLogin = last
          ? Math.floor((now.getTime() - last.getTime()) / (24 * 60 * 60 * 1000))
          : 999;
        return {
          id: s.id,
          designerId: s.designerId,
          fullName: s.designer.fullName,
          email: s.designer.email,
          phone: s.designer.phone,
          planName: s.plan.name,
          joinDate: s.designer.joinDate,
          lastLoginAt: last,
          daysSinceLogin,
        };
      })
      .sort((a, b) => b.daysSinceLogin - a.daysSinceLogin);

    return NextResponse.json({
      mrr,
      arr,
      activeCount,
      trialCount,
      churnedThisMonth,
      churnRate,
      newThisMonth,
      planBreakdown,
      revenueByMonth,
      atRisk: atRiskSubs,
      churnAtRisk,
      upcomingRenewals,
      inactivePaid,
      generatedAt: now.toISOString(),
    });
  } catch (err) {
    console.error("[analytics] error:", err);
    return NextResponse.json(
      { error: "Failed to compute analytics" },
      { status: 500 },
    );
  }
}
