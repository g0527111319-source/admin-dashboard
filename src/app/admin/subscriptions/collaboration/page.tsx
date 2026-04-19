import prisma from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

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
            דוח שיתופי פעולה
          </h1>
          <p className="text-white/55 text-sm mt-2">
            ספקים ייחודיים, סכומי עסקאות וזכאות להנחה לכל מעצבת
          </p>
        </div>

        <div className="bg-[#0f0f0f] border border-white/[0.08] rounded-card p-5 mb-4">
          <form method="GET" className="flex gap-2">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="חיפוש לפי שם או אימייל..."
              className="flex-1 bg-bg-dark border border-white/[0.08] rounded-btn px-3.5 py-2.5 text-white text-sm"
            />
            <button
              type="submit"
              className="btn-gold !px-5 !py-2.5 !text-sm"
            >
              חפש
            </button>
            {q && (
              <Link
                href="/admin/subscriptions/collaboration"
                className="px-5 py-2.5 bg-[#0f0f0f] text-white border border-white/[0.08] rounded-btn no-underline text-sm"
              >
                נקה
              </Link>
            )}
          </form>
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
                  <th className="text-right p-3 text-gold font-semibold border-b border-white/[0.08] text-[13px]">תוכנית נוכחית</th>
                  <th className="text-right p-3 text-gold font-semibold border-b border-white/[0.08] text-[13px]">ספקים (30 ימים)</th>
                  <th className="text-right p-3 text-gold font-semibold border-b border-white/[0.08] text-[13px]">ספקים (כל הזמן)</th>
                  <th className="text-right p-3 text-gold font-semibold border-b border-white/[0.08] text-[13px]">סכום עסקאות</th>
                  <th className="text-right p-3 text-gold font-semibold border-b border-white/[0.08] text-[13px]">זכאית להנחה</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="p-3 border-b border-white/[0.08] text-sm text-white">{r.fullName}</td>
                    <td className="p-3 border-b border-white/[0.08] text-sm text-white">{r.email || "—"}</td>
                    <td className="p-3 border-b border-white/[0.08] text-sm text-white">{r.phone}</td>
                    <td className="p-3 border-b border-white/[0.08] text-sm text-white">{r.planName}</td>
                    <td className={`p-3 border-b border-white/[0.08] text-sm font-semibold ${r.suppliers30d > 0 ? "text-gold" : "text-white/55"}`}>
                      {r.suppliers30d}
                    </td>
                    <td className="p-3 border-b border-white/[0.08] text-sm text-white">{r.suppliersAllTime}</td>
                    <td className="p-3 border-b border-white/[0.08] text-sm text-white">{fmtIls(r.totalVolume)}</td>
                    <td className="p-3 border-b border-white/[0.08] text-sm text-white">
                      {r.eligibleForDiscount ? (
                        <span className="px-2.5 py-[3px] bg-gold/[0.18] text-gold rounded-[6px] text-[13px] font-bold">
                          ✓
                        </span>
                      ) : (
                        <span className="px-2.5 py-[3px] bg-white/5 text-white/55 rounded-[6px] text-[13px]">
                          ✗
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 border-b border-white/[0.08] text-sm text-white/55 text-center">
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
