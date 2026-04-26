import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// GET /api/admin/subscriptions/collaboration-report
// For each active designer: count distinct suppliers, total deal volume,
// and check eligibility for discounted plan per active SubscriptionRule(s).
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Active rules — used to determine eligibility
    const rules = await prisma.subscriptionRule.findMany({
      where: { isActive: true },
    });

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
        if (when && when >= thirtyDaysAgo) {
          recentSuppliers.add(deal.supplierId);
        }
      }

      // Eligible if any active rule's threshold met within window
      let eligibleForDiscount = false;
      for (const rule of rules) {
        const windowStart = new Date(
          now.getTime() - rule.timeWindowDays * 24 * 60 * 60 * 1000,
        );
        const windowSuppliers = new Set<string>();
        for (const deal of d.deals) {
          const when = deal.dealDate || deal.reportedAt;
          if (when && when >= windowStart) {
            windowSuppliers.add(deal.supplierId);
          }
        }
        if (windowSuppliers.size >= rule.minSupplierCount) {
          eligibleForDiscount = true;
          break;
        }
      }

      return {
        designerId: d.id,
        fullName: d.fullName,
        email: d.email,
        phone: d.phone,
        currentPlanName: d.subscription?.plan?.name || null,
        currentPlanSlug: d.subscription?.plan?.slug || null,
        suppliers30d: recentSuppliers.size,
        suppliersAllTime: allSuppliers.size,
        totalDealVolume: totalVolume,
        dealCount: d.deals.length,
        eligibleForDiscount,
      };
    });

    rows.sort((a, b) => b.suppliers30d - a.suppliers30d);

    return NextResponse.json(rows);
  } catch (err) {
    console.error("[collaboration-report] error:", err);
    return NextResponse.json(
      { error: "Failed to build collaboration report" },
      { status: 500 },
    );
  }
}
