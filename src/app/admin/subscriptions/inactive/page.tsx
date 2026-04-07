import prisma from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

const GOLD = "#C9A84C";
const BG = "#050505";
const CARD_BG = "#0f0f0f";
const BORDER = "rgba(255,255,255,0.08)";
const MUTED = "rgba(255,255,255,0.55)";
const TEXT = "#ffffff";

async function loadInactive() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const subs = await prisma.designerSubscription.findMany({
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

  const rows = subs
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

  return rows;
}

export default async function InactivePaidPage() {
  const rows = await loadInactive();

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
            מעצבות משלמות לא פעילות
          </h1>
          <p style={{ color: MUTED, fontSize: 14, marginTop: 8 }}>
            מעצבות עם מנוי בתשלום שלא נכנסו למערכת מעל 30 ימים — להתקשר אליהן ולברר
          </p>
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
                  <th style={thStyle}>תוכנית</th>
                  <th style={thStyle}>הצטרפות</th>
                  <th style={thStyle}>התחברות אחרונה</th>
                  <th style={thStyle}>ימים ללא כניסה</th>
                  <th style={thStyle}>פעולה</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={tdStyle}>{r.fullName}</td>
                    <td style={tdStyle}>{r.email || "—"}</td>
                    <td style={tdStyle}>{r.phone}</td>
                    <td style={tdStyle}>{r.planName}</td>
                    <td style={tdStyle}>
                      {new Date(r.joinDate).toLocaleDateString("he-IL")}
                    </td>
                    <td style={tdStyle}>
                      {r.lastLoginAt
                        ? new Date(r.lastLoginAt).toLocaleDateString("he-IL")
                        : "מעולם לא"}
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          color: r.daysSinceLogin > 60 ? "#f88" : GOLD,
                          fontWeight: 600,
                        }}
                      >
                        {r.daysSinceLogin >= 999 ? "—" : r.daysSinceLogin.toLocaleString("he-IL")}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <a
                        href={`tel:${r.phone}`}
                        style={{
                          padding: "6px 14px",
                          background: GOLD,
                          color: "#000",
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 700,
                          textDecoration: "none",
                          display: "inline-block",
                        }}
                      >
                        התקשרי אליה
                      </a>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ ...tdStyle, color: MUTED, textAlign: "center", padding: 24 }}>
                      אין מעצבות לא פעילות
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
