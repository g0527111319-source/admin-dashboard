export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * Vercel Cron: auto-promotion check.
 * For each designer, counts unique supplier collaborations within each active
 * SubscriptionRule's time window; if the count meets the threshold, upgrades
 * the designer's subscription to the rule's target plan.
 */
export async function GET(req: NextRequest) {
  try {
    // Optional Vercel cron auth
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const auth = req.headers.get("authorization") || "";
      if (auth !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
    }

    const rules = await prisma.subscriptionRule.findMany({
      where: { isActive: true, targetPlanId: { not: null } },
      orderBy: { minSupplierCount: "desc" }, // highest threshold first
    });

    if (rules.length === 0) {
      return NextResponse.json({ checked: 0, upgraded: 0, rules: 0 });
    }

    const designers = await prisma.designer.findMany({
      select: { id: true },
    });

    let checked = 0;
    let upgraded = 0;
    const results: Array<{
      designerId: string;
      uniqueSuppliers: number;
      upgradedTo?: string;
      ruleName?: string;
    }> = [];

    for (const designer of designers) {
      checked++;

      for (const rule of rules) {
        const since = new Date();
        since.setDate(since.getDate() - rule.timeWindowDays);

        const deals = await prisma.deal.findMany({
          where: {
            designerId: designer.id,
            reportedAt: { gte: since },
            supplierConfirmed: true,
          },
          select: { supplierId: true },
        });

        const uniqueSuppliers = new Set(deals.map((d) => d.supplierId)).size;

        if (uniqueSuppliers >= rule.minSupplierCount && rule.targetPlanId) {
          const existing = await prisma.designerSubscription.findUnique({
            where: { designerId: designer.id },
            select: { planId: true, status: true },
          });

          // Skip if already on (or above) the target plan
          if (existing?.planId === rule.targetPlanId && existing.status === "active") {
            continue;
          }

          const now = new Date();
          const nextPeriodEnd = new Date(now);
          nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

          await prisma.designerSubscription.upsert({
            where: { designerId: designer.id },
            create: {
              designerId: designer.id,
              planId: rule.targetPlanId,
              status: "active",
              startedAt: now,
              currentPeriodStart: now,
              currentPeriodEnd: nextPeriodEnd,
              supplierCooperationCount: uniqueSuppliers,
              promotionCheckedAt: now,
              notes: `Auto-promoted via rule: ${rule.name}`,
            },
            update: {
              planId: rule.targetPlanId,
              status: "active",
              supplierCooperationCount: uniqueSuppliers,
              promotionCheckedAt: now,
              currentPeriodEnd: nextPeriodEnd,
              notes: `Auto-promoted via rule: ${rule.name}`,
            },
          });

          upgraded++;
          results.push({
            designerId: designer.id,
            uniqueSuppliers,
            upgradedTo: rule.targetPlanId,
            ruleName: rule.name,
          });
          break; // stop at first matching (highest) rule
        }
      }
    }

    return NextResponse.json({
      success: true,
      checked,
      upgraded,
      rules: rules.length,
      results,
    });
  } catch (error) {
    console.error("check-promotions cron error:", error);
    return NextResponse.json(
      { error: "cron failed", message: String(error) },
      { status: 500 }
    );
  }
}
