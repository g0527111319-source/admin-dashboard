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

async function loadReport() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const rules = await prisma.subscriptionRule.findMany({ where: { isActive: true } });

  const designers = await prisma.designer.findMany({
    where: { isActive: true },
    include: {
      subscription: { include: { plan: true } },
      deals: {
        select: {
          supplierId: true,
          amount: true,
          dealDate: true,
          reportedAt: true,
        },
      },
    },
  });

  const rows = designers.map((d) => {
    const allSuppliers = new Set<string>();
    const recentSuppliers = new Set<string>();
    let totalVolume = 0;
    for (const deal of d.deals) {
      allSuppliers.add(deal.supplierId);
      totalVolume += Number(deal.amount || 0);
      const when = deal.dealDate || deal.reportedAt;
      if (when && when >= thirtyDaysAgo) recentSuppliers.add(deal.supplierId);
    }

    let eligibleForDiscount = false;
    for (const rule of rules) {
      const windowStart = new Date(now.getTime() - rule.timeWindowDays * 24 * 60 * 60 * 1000);
      const ws = new Set<string>();
      for (const deal of d.deals) {
        const when = deal.dealDate || deal.reportedAt;
        if (when && when >= windowStart) ws.add(deal.supplierId);
      }
      if (ws.size >= rule.minSupplierCount) {
        eligibleForDiscount = true;
        break;
      }
    }

    return {
      id: d.id,
      fullName: d.fullName,
      email: d.email,
      phone: d.phone,
      planName: d.subscription?.plan?.name || "—",
      suppliers30d: recentSuppliers.size,
      suppliersAllTime: allSuppliers.size,
      totalVolume,
      eligibleForDiscount,
    };
  });

  rows.sort((a, b) => b.suppliers30d - a.suppliers30d);
  return rows;
}

export default async function CollaborationReportPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const allRows = await loadReport();
  const q = (searchParams.q || "").trim().toLowerCase();
  const rows = q
    ? allRows.filter(
        (r) =>
          r.fullName.toLowerCase().includes(q) ||
          (r.email || "").toLowerCase().includes(q),
      )
    : allRows;

  const cardStyle: React.CSSProperties = {
    background: CARD_BG,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    padding: 20,
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
        <div style={{ marginBottom: 24 }}>
          <Link
            href="/admin/subscriptions/analytics"
            style={{
              color: MUTED,
              fontSize: 13,
              textDecoration: "none",
              marginBottom: 8,
              display: "inline-block",
            }}
          >
            &larr; חזרה לדשבורד
          </Link>
          <h1 style={{ color: GOLD, fontSize: 30, fontWeight: 700, margin: 0 }}>
            דוח שיתופי פעולה
          </h1>
          <p style={{ color: MUTED, fontSize: 14, marginTop: 8 }}>
            ספקים ייחודיים, סכומי עסקאות וזכאות להנחה לכל מעצבת
          </p>
        </div>

        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <form method="GET" style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="חיפוש לפי שם או אימייל..."
              style={{
                flex: 1,
                background: BG,
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                padding: "10px 14px",
                color: TEXT,
                fontSize: 14,
              }}
            />
            <button
              type="submit"
              style={{
                padding: "10px 20px",
                background: GOLD,
                color: "#000",
                border: "none",
                borderRadius: 8,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              חפש
            </button>
            {q && (
              <Link
                href="/admin/subscriptions/collaboration"
                style={{
                  padding: "10px 20px",
                  background: CARD_BG,
                  color: TEXT,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 8,
                  textDecoration: "none",
                  fontSize: 14,
                }}
              >
                נקה
              </Link>
            )}
          </form>
        </div>

        <div style={cardStyle}>
          <div style={{ marginBottom: 12, color: MUTED, fontSize: 14 }}>
            סה"כ {rows.length.toLocaleString("he-IL")} מעצבות
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>שם</th>
                  <th style={thStyle}>אימייל</th>
                  <th style={thStyle}>טלפון</th>
                  <th style={thStyle}>תוכנית נוכחית</th>
                  <th style={thStyle}>ספקים (30 ימים)</th>
                  <th style={thStyle}>ספקים (כל הזמן)</th>
                  <th style={thStyle}>סכום עסקאות</th>
                  <th style={thStyle}>זכאית להנחה</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={tdStyle}>{r.fullName}</td>
                    <td style={tdStyle}>{r.email || "—"}</td>
                    <td style={tdStyle}>{r.phone}</td>
                    <td style={tdStyle}>{r.planName}</td>
                    <td style={{ ...tdStyle, color: r.suppliers30d > 0 ? GOLD : MUTED, fontWeight: 600 }}>
                      {r.suppliers30d}
                    </td>
                    <td style={tdStyle}>{r.suppliersAllTime}</td>
                    <td style={tdStyle}>{fmtIls(r.totalVolume)}</td>
                    <td style={tdStyle}>
                      {r.eligibleForDiscount ? (
                        <span
                          style={{
                            padding: "3px 10px",
                            background: "rgba(201,168,76,0.18)",
                            color: GOLD,
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          ✓
                        </span>
                      ) : (
                        <span
                          style={{
                            padding: "3px 10px",
                            background: "rgba(255,255,255,0.05)",
                            color: MUTED,
                            borderRadius: 6,
                            fontSize: 13,
                          }}
                        >
                          ✗
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ ...tdStyle, color: MUTED, textAlign: "center", padding: 24 }}>
                      אין תוצאות
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
