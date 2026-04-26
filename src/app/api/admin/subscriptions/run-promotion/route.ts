import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// POST — Run auto-promotion check across all designers
// For each active rule, finds designers who collaborated with at least
// `minSupplierCount` distinct suppliers (via Deal) within `timeWindowDays`
// and upgrades their subscription to the rule's targetPlanId.
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const rules = await prisma.subscriptionRule.findMany({
      where: { isActive: true },
    });

    if (rules.length === 0) {
      return NextResponse.json({ promoted: 0, checked: 0, rules: 0 });
    }

    const designers = await prisma.designer.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true },
    });

    const now = new Date();
    const promoted: Array<{ designerId: string; ruleId: string; planId: string }> = [];

    for (const rule of rules) {
      if (!rule.targetPlanId) continue;
      const since = new Date();
      since.setDate(since.getDate() - rule.timeWindowDays);

      for (const d of designers) {
        const deals = await prisma.deal.findMany({
          where: {
            designerId: d.id,
            reportedAt: { gte: since },
          },
          select: { supplierId: true },
        });
        const uniqueSuppliers = new Set(deals.map((x) => x.supplierId));
        const count = uniqueSuppliers.size;

        const existingSub = await prisma.designerSubscription.findUnique({
          where: { designerId: d.id },
        });

        // Update cooperation count for tracking
        if (existingSub) {
          await prisma.designerSubscription.update({
            where: { designerId: d.id },
            data: {
              supplierCooperationCount: count,
              promotionCheckedAt: now,
            },
          });
        }

        if (count >= rule.minSupplierCount) {
          const periodEnd = new Date(now);
          periodEnd.setMonth(periodEnd.getMonth() + 1);

          if (existingSub) {
            if (existingSub.planId !== rule.targetPlanId) {
              await prisma.designerSubscription.update({
                where: { designerId: d.id },
                data: {
                  planId: rule.targetPlanId,
                  status: "active",
                  currentPeriodStart: now,
                  currentPeriodEnd: periodEnd,
                  notes: `קודם/ה אוטומטית על ידי חוק: ${rule.name}`,
                },
              });
              promoted.push({
                designerId: d.id,
                ruleId: rule.id,
                planId: rule.targetPlanId,
              });
            }
          } else {
            await prisma.designerSubscription.create({
              data: {
                designerId: d.id,
                planId: rule.targetPlanId,
                status: "active",
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
                supplierCooperationCount: count,
                promotionCheckedAt: now,
                notes: `קודם/ה אוטומטית על ידי חוק: ${rule.name}`,
              },
            });
            promoted.push({
              designerId: d.id,
              ruleId: rule.id,
              planId: rule.targetPlanId,
            });
          }
        }
      }
    }

    return NextResponse.json({
      promoted: promoted.length,
      checked: designers.length,
      rules: rules.length,
      details: promoted,
    });
  } catch (error) {
    console.error("Run promotion error:", error);
    return NextResponse.json({ error: "שגיאה בהרצת קידום" }, { status: 500 });
  }
}
