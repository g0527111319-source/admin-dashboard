import prisma from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

function fmtIls(n: number): string {
  return `₪${n.toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtInt(n: number): string {
  return n.toLocaleString("he-IL");
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function monthLabel(key: string): string {
  // key = "2025-11"
  const [y, m] = key.split("-");
  const months = ["ינו", "פבר", "מרץ", "אפר", "מאי", "יונ", "יול", "אוג", "ספט", "אוק", "נוב", "דצמ"];
  return `${months[Number(m) - 1]} ${y.slice(2)}`;
}

async function loadAnalytics() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

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

  let mrr = 0;
  const planMap = new Map<string, { planName: string; count: number; mrr: number }>();

  for (const sub of activeSubs) {
    const price = Number(sub.plan.price || 0);
    if (price <= 0) continue;
    let monthly = price;
    if (sub.plan.billingCycle === "yearly") monthly = price / 12;
    mrr += monthly;
    const existing = planMap.get(sub.plan.id);
    if (existing) {
      existing.count += 1;
      existing.mrr += monthly;
    } else {
      planMap.set(sub.plan.id, { planName: sub.plan.name, count: 1, mrr: monthly });
    }
  }

  const planBreakdown = Array.from(planMap.values()).sort((a, b) => b.mrr - a.mrr);
  const arr = mrr * 12;
  const activeCount = activeSubs.length;
  const trialCount = activeSubs.filter((s) => s.status === "trialing").length;

  const churned30d = await prisma.designerSubscription.count({
    where: { status: "cancelled", cancelledAt: { gte: thirtyDaysAgo } },
  });
  const churnedThisMonth = await prisma.designerSubscription.count({
    where: { status: "cancelled", cancelledAt: { gte: startOfMonth } },
  });
  const activeStart30d = activeCount + churned30d;
  const churnRate = activeStart30d > 0 ? (churned30d / activeStart30d) * 100 : 0;

  const newThisMonth = await prisma.designerSubscription.count({
    where: { createdAt: { gte: startOfMonth } },
  });

  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const successfulPayments = await prisma.subscriptionPayment.findMany({
    where: { status: "succeeded", paidAt: { gte: twelveMonthsAgo } },
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

  const atRisk = activeSubs
    .filter((s) => s.status === "past_due" || (s.failedPaymentCount || 0) > 0)
    .slice(0, 20);

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
      return { sub: s, daysSinceLogin };
    })
    .sort((a, b) => b.daysSinceLogin - a.daysSinceLogin)
    .slice(0, 20);

  const upcomingRenewalSubs = activeSubs.filter(
    (s) => s.currentPeriodEnd >= now && s.currentPeriodEnd <= sevenDaysFromNow,
  );
  let upcomingSum = 0;
  for (const s of upcomingRenewalSubs) {
    const price = Number(s.plan.price || 0);
    let monthly = price;
    if (s.plan.billingCycle === "yearly") monthly = price / 12;
    upcomingSum += monthly;
  }

  return {
    mrr,
    arr,
    activeCount,
    trialCount,
    churnedThisMonth,
    churnRate,
    newThisMonth,
    planBreakdown,
    revenueByMonth,
    atRisk,
    churnAtRisk,
    upcomingRenewals: { count: upcomingRenewalSubs.length, sum: upcomingSum, list: upcomingRenewalSubs.slice(0, 20) },
    generatedAt: now,
  };
}

export default async function AnalyticsPage() {
  const data = await loadAnalytics();

  const maxRevenue = Math.max(1, ...data.revenueByMonth.map((m) => m.revenue));

  return (
    <div className="min-h-screen bg-bg-dark text-white p-6">
      <div className="max-w-[1280px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-gold text-[32px] font-bold m-0">
            דשבורד הכנסות ומנויים
          </h1>
          <p className="text-white/55 text-sm mt-2">
            עודכן: {data.generatedAt.toLocaleString("he-IL")}
          </p>
        </div>

        {/* Quick links */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <Link
            href="/admin/subscriptions"
            className="px-4 py-2 bg-bg-dark-surface border border-white/[0.08] rounded-btn text-white text-sm no-underline"
          >
            ניהול מנויים
          </Link>
          <Link
            href="/admin/subscriptions/collaboration"
            className="px-4 py-2 bg-bg-dark-surface border border-gold rounded-btn text-gold text-sm no-underline"
          >
            דוח שיתופי פעולה
          </Link>
          <Link
            href="/admin/subscriptions/inactive"
            className="px-4 py-2 bg-bg-dark-surface border border-gold rounded-btn text-gold text-sm no-underline"
          >
            מעצבות לא פעילות
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 mb-8">
          <div className="bg-bg-dark-surface border border-white/[0.08] rounded-card p-5">
            <div className="text-white/55 text-[13px] mb-2">הכנסה חודשית (MRR)</div>
            <div className="text-gold text-[32px] font-bold">{fmtIls(data.mrr)}</div>
            <div className="text-white/55 text-xs mt-1.5">
              חדשים החודש: {fmtInt(data.newThisMonth)}
            </div>
          </div>
          <div className="bg-bg-dark-surface border border-white/[0.08] rounded-card p-5">
            <div className="text-white/55 text-[13px] mb-2">הכנסה שנתית (ARR)</div>
            <div className="text-gold text-[32px] font-bold">{fmtIls(data.arr)}</div>
            <div className="text-white/55 text-xs mt-1.5">צפי על בסיס MRR נוכחי</div>
          </div>
          <div className="bg-bg-dark-surface border border-white/[0.08] rounded-card p-5">
            <div className="text-white/55 text-[13px] mb-2">מנויים פעילים</div>
            <div className="text-gold text-[32px] font-bold">{fmtInt(data.activeCount)}</div>
            <div className="text-white/55 text-xs mt-1.5">
              מתוכם בניסיון: {fmtInt(data.trialCount)}
            </div>
          </div>
          <div className="bg-bg-dark-surface border border-white/[0.08] rounded-card p-5">
            <div className="text-white/55 text-[13px] mb-2">אחוז נטישה (30 ימים)</div>
            <div className="text-gold text-[32px] font-bold">{fmtPct(data.churnRate)}</div>
            <div className="text-white/55 text-xs mt-1.5">
              בוטלו החודש: {fmtInt(data.churnedThisMonth)}
            </div>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-bg-dark-surface border border-white/[0.08] rounded-card p-5 mb-8">
          <h2 className="text-gold text-[20px] font-bold mb-4">הכנסות 12 חודשים אחרונים</h2>
          <div className="flex items-end gap-2 h-[220px] py-4">
            {data.revenueByMonth.map((m) => {
              const heightPct = (m.revenue / maxRevenue) * 100;
              return (
                <div
                  key={m.month}
                  className="flex-1 flex flex-col items-center gap-1.5 min-w-0"
                  title={`${monthLabel(m.month)}: ${fmtIls(m.revenue)} (${m.count} תשלומים)`}
                >
                  <div className="text-gold text-[10px] whitespace-nowrap overflow-hidden">
                    {m.revenue > 0 ? `₪${Math.round(m.revenue).toLocaleString("he-IL")}` : ""}
                  </div>
                  <div
                    className="w-full rounded-t-[6px] min-h-[2px] bg-gradient-to-b from-gold to-gold/40"
                    style={{ height: `${Math.max(heightPct, 1)}%` }}
                  />
                  <div className="text-white/55 text-[11px] whitespace-nowrap">
                    {monthLabel(m.month)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Plan Breakdown */}
        <div className="bg-bg-dark-surface border border-white/[0.08] rounded-card p-5 mb-8">
          <h2 className="text-gold text-[20px] font-bold mb-4">פילוח לפי תוכנית</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-right p-3 text-gold font-semibold border-b border-white/[0.08] text-[13px]">תוכנית</th>
                <th className="text-right p-3 text-gold font-semibold border-b border-white/[0.08] text-[13px]">מנויים</th>
                <th className="text-right p-3 text-gold font-semibold border-b border-white/[0.08] text-[13px]">MRR</th>
                <th className="text-right p-3 text-gold font-semibold border-b border-white/[0.08] text-[13px]">חלק מהכנסה</th>
              </tr>
            </thead>
            <tbody>
              {data.planBreakdown.map((p) => (
                <tr key={p.planName}>
                  <td className="p-3 border-b border-white/[0.08] text-sm text-white">{p.planName}</td>
                  <td className="p-3 border-b border-white/[0.08] text-sm text-white">{fmtInt(p.count)}</td>
                  <td className="p-3 border-b border-white/[0.08] text-sm text-white">{fmtIls(p.mrr)}</td>
                  <td className="p-3 border-b border-white/[0.08] text-sm text-white">
                    {data.mrr > 0 ? fmtPct((p.mrr / data.mrr) * 100) : "—"}
                  </td>
                </tr>
              ))}
              {data.planBreakdown.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-3 border-b border-white/[0.08] text-sm text-white/55 text-center">
                    אין נתונים
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Upcoming Renewals */}
        <div className="bg-bg-dark-surface border border-white/[0.08] rounded-card p-5 mb-8">
          <h2 className="text-gold text-[20px] font-bold mb-4">חידושים קרובים (7 ימים)</h2>
          <div className="mb-3 text-white/55 text-sm">
            סה"כ {fmtInt(data.upcomingRenewals.count)} חידושים בסכום {fmtIls(data.upcomingRenewals.sum)}
          </div>
          {data.upcomingRenewals.list.length > 0 && (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-right p-3 text-gold font-semibold border-b border-white/[0.08] text-[13px]">שם</th>
                  <th className="text-right p-3 text-gold font-semibold border-b border-white/[0.08] text-[13px]">תוכנית</th>
                  <th className="text-right p-3 text-gold font-semibold border-b border-white/[0.08] text-[13px]">תאריך חידוש</th>
                </tr>
              </thead>
              <tbody>
                {data.upcomingRenewals.list.map((s) => (
                  <tr key={s.id}>
                    <td className="p-3 border-b border-white/[0.08] text-sm text-white">{s.designer.fullName}</td>
                    <td className="p-3 border-b border-white/[0.08] text-sm text-white">{s.plan.name}</td>
                    <td className="p-3 border-b border-white/[0.08] text-sm text-white">
                      {new Date(s.currentPeriodEnd).toLocaleDateString("he-IL")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* At Risk Payments */}
        <div className="bg-bg-dark-surface border border-white/[0.08] rounded-card p-5 mb-8">
          <h2 className="text-gold text-[20px] font-bold mb-4">בסיכון — תשלומים שנכשלו</h2>
          {data.atRisk.length === 0 ? (
            <p className="text-white/55">אין מנויים בסיכון</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-right p-3 text-gold font-semibold border-b border-white/[0.08] text-[13px]">שם</th>
                  <th className="text-right p-3 text-gold font-semibold border-b border-white/[0.08] text-[13px]">אימייל</th>
                  <th className="text-right p-3 text-gold font-semibold border-b border-white/[0.08] text-[13px]">תוכנית</th>
                  <th className="text-right p-3 text-gold font-semibold border-b border-white/[0.08] text-[13px]">סטטוס</th>
                  <th className="text-right p-3 text-gold font-semibold border-b border-white/[0.08] text-[13px]">כשלים</th>
                  <th className="text-right p-3 text-gold font-semibold border-b border-white/[0.08] text-[13px]">סוף תקופת חסד</th>
                </tr>
              </thead>
              <tbody>
                {data.atRisk.map((s) => (
                  <tr key={s.id}>
                    <td className="p-3 border-b border-white/[0.08] text-sm text-white">{s.designer.fullName}</td>
                    <td className="p-3 border-b border-white/[0.08] text-sm text-white">{s.designer.email || "—"}</td>
                    <td className="p-3 border-b border-white/[0.08] text-sm text-white">{s.plan.name}</td>
                    <td className="p-3 border-b border-white/[0.08] text-sm text-white">
                      <span className="px-2 py-[3px] bg-red-500/15 text-[#f88] rounded-[6px] text-xs">
                        {s.status}
                      </span>
                    </td>
                    <td className="p-3 border-b border-white/[0.08] text-sm text-white">{s.failedPaymentCount}</td>
                    <td className="p-3 border-b border-white/[0.08] text-sm text-white">
                      {s.gracePeriodEndsAt
                        ? new Date(s.gracePeriodEndsAt).toLocaleDateString("he-IL")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Churn at Risk — inactive 14d+ */}
        <div className="bg-bg-dark-surface border border-white/[0.08] rounded-card p-5 mb-8">
          <h2 className="text-gold text-[20px] font-bold mb-4">מעצבות בסיכון נטישה (לא נכנסו 14+ ימים)</h2>
          {data.churnAtRisk.length === 0 ? (
            <p className="text-white/55">אין מעצבות בסיכון נטישה</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-right p-3 text-gold font-semibold border-b border-white/[0.08] text-[13px]">שם</th>
                  <th className="text-right p-3 text-gold font-semibold border-b border-white/[0.08] text-[13px]">אימייל</th>
                  <th className="text-right p-3 text-gold font-semibold border-b border-white/[0.08] text-[13px]">טלפון</th>
                  <th className="text-right p-3 text-gold font-semibold border-b border-white/[0.08] text-[13px]">תוכנית</th>
                  <th className="text-right p-3 text-gold font-semibold border-b border-white/[0.08] text-[13px]">ימים ללא כניסה</th>
                </tr>
              </thead>
              <tbody>
                {data.churnAtRisk.map((row) => (
                  <tr key={row.sub.id}>
                    <td className="p-3 border-b border-white/[0.08] text-sm text-white">{row.sub.designer.fullName}</td>
                    <td className="p-3 border-b border-white/[0.08] text-sm text-white">{row.sub.designer.email || "—"}</td>
                    <td className="p-3 border-b border-white/[0.08] text-sm text-white">{row.sub.designer.phone}</td>
                    <td className="p-3 border-b border-white/[0.08] text-sm text-white">{row.sub.plan.name}</td>
                    <td className="p-3 border-b border-white/[0.08] text-sm text-white">
                      <span className={row.daysSinceLogin > 30 ? "text-[#f88]" : "text-gold"}>
                        {row.daysSinceLogin >= 999 ? "מעולם לא" : fmtInt(row.daysSinceLogin)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
