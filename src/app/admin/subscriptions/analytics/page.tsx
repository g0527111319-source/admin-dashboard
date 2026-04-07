import prisma from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

const GOLD = "#C9A84C";
const BG = "#050505";
const CARD_BG = "#0f0f0f";
const BORDER = "rgba(255,255,255,0.08)";
const MUTED = "rgba(255,255,255,0.55)";
const TEXT = "#ffffff";

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

  const cardStyle: React.CSSProperties = {
    background: CARD_BG,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    padding: 20,
  };
  const sectionTitle: React.CSSProperties = {
    color: GOLD,
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 16,
  };
  const thStyle: React.CSSProperties = {
    textAlign: "right",
    padding: 12,
    color: GOLD,
    fontWeight: 600,
    borderBottom: `1px solid ${BORDER}`,
    fontSize: 13,
  };
  const tdStyle: React.CSSProperties = {
    padding: 12,
    borderBottom: `1px solid ${BORDER}`,
    fontSize: 14,
    color: TEXT,
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, padding: 24 }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ color: GOLD, fontSize: 32, fontWeight: 700, margin: 0 }}>
            דשבורד הכנסות ומנויים
          </h1>
          <p style={{ color: MUTED, fontSize: 14, marginTop: 8 }}>
            עודכן: {data.generatedAt.toLocaleString("he-IL")}
          </p>
        </div>

        {/* Quick links */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <Link
            href="/admin/subscriptions"
            style={{
              padding: "8px 16px",
              background: CARD_BG,
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              color: TEXT,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            ניהול מנויים
          </Link>
          <Link
            href="/admin/subscriptions/collaboration"
            style={{
              padding: "8px 16px",
              background: CARD_BG,
              border: `1px solid ${GOLD}`,
              borderRadius: 8,
              color: GOLD,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            דוח שיתופי פעולה
          </Link>
          <Link
            href="/admin/subscriptions/inactive"
            style={{
              padding: "8px 16px",
              background: CARD_BG,
              border: `1px solid ${GOLD}`,
              borderRadius: 8,
              color: GOLD,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            מעצבות לא פעילות
          </Link>
        </div>

        {/* KPI Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <div style={cardStyle}>
            <div style={{ color: MUTED, fontSize: 13, marginBottom: 8 }}>הכנסה חודשית (MRR)</div>
            <div style={{ color: GOLD, fontSize: 32, fontWeight: 700 }}>{fmtIls(data.mrr)}</div>
            <div style={{ color: MUTED, fontSize: 12, marginTop: 6 }}>
              חדשים החודש: {fmtInt(data.newThisMonth)}
            </div>
          </div>
          <div style={cardStyle}>
            <div style={{ color: MUTED, fontSize: 13, marginBottom: 8 }}>הכנסה שנתית (ARR)</div>
            <div style={{ color: GOLD, fontSize: 32, fontWeight: 700 }}>{fmtIls(data.arr)}</div>
            <div style={{ color: MUTED, fontSize: 12, marginTop: 6 }}>צפי על בסיס MRR נוכחי</div>
          </div>
          <div style={cardStyle}>
            <div style={{ color: MUTED, fontSize: 13, marginBottom: 8 }}>מנויים פעילים</div>
            <div style={{ color: GOLD, fontSize: 32, fontWeight: 700 }}>{fmtInt(data.activeCount)}</div>
            <div style={{ color: MUTED, fontSize: 12, marginTop: 6 }}>
              מתוכם בניסיון: {fmtInt(data.trialCount)}
            </div>
          </div>
          <div style={cardStyle}>
            <div style={{ color: MUTED, fontSize: 13, marginBottom: 8 }}>אחוז נטישה (30 ימים)</div>
            <div style={{ color: GOLD, fontSize: 32, fontWeight: 700 }}>{fmtPct(data.churnRate)}</div>
            <div style={{ color: MUTED, fontSize: 12, marginTop: 6 }}>
              בוטלו החודש: {fmtInt(data.churnedThisMonth)}
            </div>
          </div>
        </div>

        {/* Revenue Chart */}
        <div style={{ ...cardStyle, marginBottom: 32 }}>
          <h2 style={sectionTitle}>הכנסות 12 חודשים אחרונים</h2>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
              height: 220,
              padding: "16px 0",
            }}
          >
            {data.revenueByMonth.map((m) => {
              const heightPct = (m.revenue / maxRevenue) * 100;
              return (
                <div
                  key={m.month}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    minWidth: 0,
                  }}
                  title={`${monthLabel(m.month)}: ${fmtIls(m.revenue)} (${m.count} תשלומים)`}
                >
                  <div
                    style={{
                      color: GOLD,
                      fontSize: 10,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                    }}
                  >
                    {m.revenue > 0 ? `₪${Math.round(m.revenue).toLocaleString("he-IL")}` : ""}
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: `${Math.max(heightPct, 1)}%`,
                      background: `linear-gradient(180deg, ${GOLD} 0%, rgba(201,168,76,0.4) 100%)`,
                      borderRadius: "6px 6px 0 0",
                      minHeight: 2,
                    }}
                  />
                  <div
                    style={{
                      color: MUTED,
                      fontSize: 11,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {monthLabel(m.month)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Plan Breakdown */}
        <div style={{ ...cardStyle, marginBottom: 32 }}>
          <h2 style={sectionTitle}>פילוח לפי תוכנית</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>תוכנית</th>
                <th style={thStyle}>מנויים</th>
                <th style={thStyle}>MRR</th>
                <th style={thStyle}>חלק מהכנסה</th>
              </tr>
            </thead>
            <tbody>
              {data.planBreakdown.map((p) => (
                <tr key={p.planName}>
                  <td style={tdStyle}>{p.planName}</td>
                  <td style={tdStyle}>{fmtInt(p.count)}</td>
                  <td style={tdStyle}>{fmtIls(p.mrr)}</td>
                  <td style={tdStyle}>
                    {data.mrr > 0 ? fmtPct((p.mrr / data.mrr) * 100) : "—"}
                  </td>
                </tr>
              ))}
              {data.planBreakdown.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ ...tdStyle, color: MUTED, textAlign: "center" }}>
                    אין נתונים
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Upcoming Renewals */}
        <div style={{ ...cardStyle, marginBottom: 32 }}>
          <h2 style={sectionTitle}>חידושים קרובים (7 ימים)</h2>
          <div style={{ marginBottom: 12, color: MUTED, fontSize: 14 }}>
            סה"כ {fmtInt(data.upcomingRenewals.count)} חידושים בסכום {fmtIls(data.upcomingRenewals.sum)}
          </div>
          {data.upcomingRenewals.list.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>שם</th>
                  <th style={thStyle}>תוכנית</th>
                  <th style={thStyle}>תאריך חידוש</th>
                </tr>
              </thead>
              <tbody>
                {data.upcomingRenewals.list.map((s) => (
                  <tr key={s.id}>
                    <td style={tdStyle}>{s.designer.fullName}</td>
                    <td style={tdStyle}>{s.plan.name}</td>
                    <td style={tdStyle}>
                      {new Date(s.currentPeriodEnd).toLocaleDateString("he-IL")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* At Risk Payments */}
        <div style={{ ...cardStyle, marginBottom: 32 }}>
          <h2 style={sectionTitle}>בסיכון — תשלומים שנכשלו</h2>
          {data.atRisk.length === 0 ? (
            <p style={{ color: MUTED }}>אין מנויים בסיכון</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>שם</th>
                  <th style={thStyle}>אימייל</th>
                  <th style={thStyle}>תוכנית</th>
                  <th style={thStyle}>סטטוס</th>
                  <th style={thStyle}>כשלים</th>
                  <th style={thStyle}>סוף תקופת חסד</th>
                </tr>
              </thead>
              <tbody>
                {data.atRisk.map((s) => (
                  <tr key={s.id}>
                    <td style={tdStyle}>{s.designer.fullName}</td>
                    <td style={tdStyle}>{s.designer.email || "—"}</td>
                    <td style={tdStyle}>{s.plan.name}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          padding: "3px 8px",
                          background: "rgba(220,80,80,0.15)",
                          color: "#f88",
                          borderRadius: 6,
                          fontSize: 12,
                        }}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td style={tdStyle}>{s.failedPaymentCount}</td>
                    <td style={tdStyle}>
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
        <div style={{ ...cardStyle, marginBottom: 32 }}>
          <h2 style={sectionTitle}>מעצבות בסיכון נטישה (לא נכנסו 14+ ימים)</h2>
          {data.churnAtRisk.length === 0 ? (
            <p style={{ color: MUTED }}>אין מעצבות בסיכון נטישה</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>שם</th>
                  <th style={thStyle}>אימייל</th>
                  <th style={thStyle}>טלפון</th>
                  <th style={thStyle}>תוכנית</th>
                  <th style={thStyle}>ימים ללא כניסה</th>
                </tr>
              </thead>
              <tbody>
                {data.churnAtRisk.map((row) => (
                  <tr key={row.sub.id}>
                    <td style={tdStyle}>{row.sub.designer.fullName}</td>
                    <td style={tdStyle}>{row.sub.designer.email || "—"}</td>
                    <td style={tdStyle}>{row.sub.designer.phone}</td>
                    <td style={tdStyle}>{row.sub.plan.name}</td>
                    <td style={tdStyle}>
                      <span style={{ color: row.daysSinceLogin > 30 ? "#f88" : GOLD }}>
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
