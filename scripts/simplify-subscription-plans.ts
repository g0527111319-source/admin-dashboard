/**
 * One-off migration: simplify subscription plans to 2 tiers (free + pro as "מנוי בתשלום").
 * - Calls seedSubscriptionPlans() to upsert DEFAULT_PLANS and deactivate legacy plans.
 * - Safe to re-run (idempotent).
 *
 * Usage: npx tsx scripts/simplify-subscription-plans.ts
 */
import { seedSubscriptionPlans } from "../src/lib/subscription-seed";
import prisma from "../src/lib/prisma";

async function main() {
  console.log("🔄 Running subscription plan simplification…");
  const results = await seedSubscriptionPlans();

  for (const r of results) {
    const action = r.created ? "created" : "updated";
    console.log(
      `  ${action}: ${r.plan.slug} (${r.plan.name}) — ₪${r.plan.price} — active=${r.plan.isActive}`
    );
  }

  const allPlans = await prisma.subscriptionPlan.findMany({
    orderBy: { sortOrder: "asc" },
  });
  console.log("\n📋 Current plan state in DB:");
  for (const p of allPlans) {
    console.log(
      `  [${p.isActive ? "✓" : "✗"}] ${p.slug} — ${p.name} — ₪${p.price}`
    );
  }

  const active = allPlans.filter((p) => p.isActive);
  console.log(`\n✅ Active plans: ${active.length} (expected: 2)`);
}

main()
  .catch((e) => {
    console.error("❌ Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
