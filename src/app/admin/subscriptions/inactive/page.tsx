import prisma from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

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

  return (
    <div className="min-h-screen bg-bg-dark text-white p-6">
      <div className="max-w-[1280px] mx-auto">
        <div className="mb-6">
          <Link
            href="/admin/subscriptions/analytics"
            className="text-white/55 text-[13px] no-underline mb-2 inline-block"
          >
            &larr; חזרה לדשבורד
          </Link>
          <h1 className="text-gold text-[30px] font-bold m-0">
            מעצבות משלמות לא פעילות
          </h1>
          <p className="text-white/55 text-sm mt-2">
            מעצבות עם מנוי בתשלום שלא נכנסו למערכת מעל 30 ימים — להתקשר אליהן ולברר
          </p>
        </div>

        <div className="bg-[#0f0f0f] border border-white/[0.08] rounded-card p-5">
          <div className="mb-3 text-white/55 text-sm">
            סה"כ {rows.length.toLocaleString("he-IL")} מעצבות
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-right p-3 text-gold font-semibold border-b border-white/[0.08] text-[13px]">שם</th>
                  <th className="text-right p-3 text-gold font-semibold border-b border-white/[0.08] text-[13px]">אימייל</th>
                  <th className="text-right p-3 text-gold font-semibold border-b border-white/[0.08] text-[13px]">טלפון</th>
                  <th className="text-right p-3 text-gold font-semibold border-b border-white/[0.08] text-[13px]">תוכנית</th>
                  <th className="text-right p-3 text-gold font-semibold border-b border-white/[0.08] text-[13px]">הצטרפות</th>
                  <th className="text-right p-3 text-gold font-semibold border-b border-white/[0.08] text-[13px]">התחברות אחרונה</th>
                  <th className="text-right p-3 text-gold font-semibold border-b border-white/[0.08] text-[13px]">ימים ללא כניסה</th>
                  <th className="text-right p-3 text-gold font-semibold border-b border-white/[0.08] text-[13px]">פעולה</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="p-3 border-b border-white/[0.08] text-sm text-white">{r.fullName}</td>
                    <td className="p-3 border-b border-white/[0.08] text-sm text-white">{r.email || "—"}</td>
                    <td className="p-3 border-b border-white/[0.08] text-sm text-white">{r.phone}</td>
                    <td className="p-3 border-b border-white/[0.08] text-sm text-white">{r.planName}</td>
                    <td className="p-3 border-b border-white/[0.08] text-sm text-white">
                      {new Date(r.joinDate).toLocaleDateString("he-IL")}
                    </td>
                    <td className="p-3 border-b border-white/[0.08] text-sm text-white">
                      {r.lastLoginAt
                        ? new Date(r.lastLoginAt).toLocaleDateString("he-IL")
                        : "מעולם לא"}
                    </td>
                    <td className="p-3 border-b border-white/[0.08] text-sm text-white">
                      <span
                        className={`font-semibold ${r.daysSinceLogin > 60 ? "text-[#f88]" : "text-gold"}`}
                      >
                        {r.daysSinceLogin >= 999 ? "—" : r.daysSinceLogin.toLocaleString("he-IL")}
                      </span>
                    </td>
                    <td className="p-3 border-b border-white/[0.08] text-sm text-white">
                      <a
                        href={`tel:${r.phone}`}
                        className="px-3.5 py-1.5 bg-gold text-black rounded-btn text-[13px] font-bold no-underline inline-block"
                      >
                        התקשרי אליה
                      </a>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 border-b border-white/[0.08] text-sm text-white/55 text-center">
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
