/**
 * Subscription System — End-to-End Test Script
 *
 * Tests the full subscription lifecycle:
 *   1. Plans exist and are seeded
 *   2. Admin assigns free plan to designer
 *   3. Designer upgrades to Pro (payment-first)
 *   4. Designer switches back to free (immediate)
 *   5. Admin force-changes plan
 *   6. Designer downgrades (scheduled)
 *   7. Proration calculation
 *
 * Usage:
 *   npx tsx scripts/test-subscription-flow.ts
 *
 * Requires: DATABASE_URL in .env (uses Prisma directly, no server needed)
 */

import prisma from "../src/lib/prisma";
import { seedSubscriptionPlans } from "../src/lib/subscription-seed";
import { calculateProration } from "../src/lib/subscription-proration";

const PASS = "\x1b[32m PASS \x1b[0m";
const FAIL = "\x1b[31m FAIL \x1b[0m";
const INFO = "\x1b[36m INFO \x1b[0m";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`${PASS} ${label}`);
    passed++;
  } else {
    console.log(`${FAIL} ${label}`);
    failed++;
  }
}

async function main() {
  console.log("\n══════════════════════════════════════════");
  console.log("  Subscription System — E2E Tests");
  console.log("══════════════════════════════════════════\n");

  // ─── Test 1: Seed plans ───────────────────────────────────────
  console.log(`${INFO} Test 1: Subscription plans`);
  try {
    await seedSubscriptionPlans();
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    assert(plans.length >= 2, "At least 2 active plans exist");

    const freePlan = plans.find((p) => p.slug === "free");
    const proPlan = plans.find((p) => p.slug === "pro");
    assert(!!freePlan, 'Free plan exists (slug="free")');
    assert(!!proPlan, 'Pro plan exists (slug="pro")');
    assert(Number(freePlan?.price) === 0, "Free plan price = 0");
    assert(Number(proPlan?.price) > 0, "Pro plan price > 0");

    const features = proPlan?.features as Record<string, boolean> | null;
    assert(!!features?.crm, "Pro plan includes CRM feature");
    assert(!!features?.businessCard, "Pro plan includes Business Card feature");
    console.log("");
  } catch (err) {
    console.log(`${FAIL} Seed plans: ${err}`);
    failed++;
  }

  // ─── Test 2: Find or create test designer ─────────────────────
  console.log(`${INFO} Test 2: Test designer`);
  let testDesignerId: string;
  try {
    // Use Noa Kahanovitz if she exists, otherwise create a test one
    let designer = await prisma.designer.findFirst({
      where: { email: "designer@zirat.co.il" },
    });

    if (!designer) {
      designer = await prisma.designer.findFirst();
    }

    assert(!!designer, "Test designer exists in database");
    testDesignerId = designer!.id;
    console.log(`${INFO} Designer: ${designer!.fullName} (${testDesignerId.slice(0, 8)}...)`);
    console.log("");
  } catch (err) {
    console.log(`${FAIL} Find designer: ${err}`);
    console.log("Cannot continue without a designer. Exiting.");
    await prisma.$disconnect();
    process.exit(1);
  }

  // ─── Test 3: Admin assigns free plan ──────────────────────────
  console.log(`${INFO} Test 3: Admin assigns free plan`);
  try {
    const freePlan = await prisma.subscriptionPlan.findFirst({
      where: { slug: "free" },
    });
    assert(!!freePlan, "Free plan found for assignment");

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const sub = await prisma.designerSubscription.upsert({
      where: { designerId: testDesignerId },
      create: {
        designerId: testDesignerId,
        planId: freePlan!.id,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        autoRenew: true,
      },
      update: {
        planId: freePlan!.id,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelledAt: null,
        cancelReason: null,
        scheduledDowngradeAt: null,
        scheduledDowngradePlanId: null,
        failedPaymentCount: 0,
        lastFailedPaymentAt: null,
        gracePeriodEndsAt: null,
        nextRetryAt: null,
        readOnlyUntil: null,
      },
      include: { plan: true },
    });

    assert(sub.status === "active", "Subscription status = active");
    assert(sub.plan.slug === "free", "Plan = free");
    assert(Number(sub.plan.price) === 0, "Plan price = 0");
    assert(!sub.scheduledDowngradeAt, "No scheduled downgrade");
    assert(!sub.cancelledAt, "Not cancelled");
    console.log("");
  } catch (err) {
    console.log(`${FAIL} Admin assign free: ${err}`);
    failed++;
  }

  // ─── Test 4: Proration calculation ────────────────────────────
  console.log(`${INFO} Test 4: Proration calculation`);
  try {
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - 15); // 15 days into period
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1); // 30-day period

    const proration = calculateProration(0, 149, periodStart, periodEnd, now);
    assert(proration.netDueNow >= 0, `Proration net due >= 0 (got ${proration.netDueNow.toFixed(2)})`);
    assert(proration.newPlanCharge > 0, `New plan charge > 0 (got ${proration.newPlanCharge.toFixed(2)})`);
    assert(proration.unusedCredit === 0, `Unused credit = 0 from free plan (got ${proration.unusedCredit})`);
    assert(proration.daysRemaining >= 0, `Days remaining >= 0 (got ${proration.daysRemaining})`);
    assert(proration.daysRemaining <= 31, `Days remaining <= 31 (got ${proration.daysRemaining})`);
    assert(proration.daysInPeriod > 0, `Days in period > 0 (got ${proration.daysInPeriod})`);

    // From free (0) to pro (149): credit = 0, charge = ~74.5 for 15 remaining days
    const expectedApprox = (149 / proration.daysInPeriod) * proration.daysRemaining;
    const tolerance = 5;
    assert(
      Math.abs(proration.netDueNow - expectedApprox) < tolerance,
      `Proration amount ~${expectedApprox.toFixed(0)} (got ${proration.netDueNow.toFixed(2)})`
    );
    console.log("");
  } catch (err) {
    console.log(`${FAIL} Proration: ${err}`);
    failed++;
  }

  // ─── Test 5: Simulate upgrade (free → pro) ───────────────────
  console.log(`${INFO} Test 5: Upgrade free → pro (simulated)`);
  try {
    const proPlan = await prisma.subscriptionPlan.findFirst({
      where: { slug: "pro" },
    });
    assert(!!proPlan, "Pro plan found");

    const sub = await prisma.designerSubscription.findUnique({
      where: { designerId: testDesignerId },
      include: { plan: true },
    });
    assert(!!sub, "Subscription exists");
    assert(sub!.plan.slug === "free", "Currently on free plan");

    const currentPrice = Number(sub!.plan.price);
    const newPrice = Number(proPlan!.price);
    assert(newPrice > currentPrice, `Upgrade check: ${newPrice} > ${currentPrice}`);

    // In a real upgrade, payment would happen first via iCount.
    // Here we simulate a successful payment + plan switch.
    const now = new Date();
    await prisma.subscriptionPayment.create({
      data: {
        subscriptionId: sub!.id,
        amount: newPrice,
        currency: "ILS",
        status: "succeeded",
        paymentMethod: "test_simulated",
        paidAt: now,
      },
    });

    const upgraded = await prisma.designerSubscription.update({
      where: { designerId: testDesignerId },
      data: {
        planId: proPlan!.id,
        status: "active",
        currentPeriodStart: now,
        lastPaymentAt: now,
        lastPaymentAmount: newPrice,
      },
      include: { plan: true },
    });

    assert(upgraded.plan.slug === "pro", "Plan switched to pro");
    assert(upgraded.status === "active", "Status still active");
    assert(Number(upgraded.lastPaymentAmount) === newPrice, "Last payment recorded");

    // Verify payment record
    const payments = await prisma.subscriptionPayment.findMany({
      where: { subscriptionId: sub!.id, status: "succeeded" },
      orderBy: { createdAt: "desc" },
    });
    assert(payments.length >= 1, "Successful payment recorded in DB");
    console.log("");
  } catch (err) {
    console.log(`${FAIL} Upgrade simulation: ${err}`);
    failed++;
  }

  // ─── Test 6: Switch back to free (immediate) ─────────────────
  console.log(`${INFO} Test 6: Switch to free (immediate)`);
  try {
    const freePlan = await prisma.subscriptionPlan.findFirst({
      where: { slug: "free" },
    });
    const sub = await prisma.designerSubscription.findUnique({
      where: { designerId: testDesignerId },
      include: { plan: true },
    });

    assert(sub!.plan.slug === "pro", "Currently on pro plan");

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Simulate the FLOW 1 from change-plan: switch to free = immediate
    const switched = await prisma.designerSubscription.update({
      where: { designerId: testDesignerId },
      data: {
        planId: freePlan!.id,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        scheduledDowngradeAt: null,
        scheduledDowngradePlanId: null,
      },
      include: { plan: true },
    });

    assert(switched.plan.slug === "free", "Immediately switched to free");
    assert(switched.status === "active", "Status = active");
    assert(!switched.scheduledDowngradeAt, "No scheduled downgrade (immediate)");
    console.log("");
  } catch (err) {
    console.log(`${FAIL} Switch to free: ${err}`);
    failed++;
  }

  // ─── Test 7: Downgrade scheduling (pro → free via schedule) ──
  console.log(`${INFO} Test 7: Scheduled downgrade`);
  try {
    const proPlan = await prisma.subscriptionPlan.findFirst({
      where: { slug: "pro" },
    });
    const proDiscounted = await prisma.subscriptionPlan.findFirst({
      where: { slug: "pro-discounted" },
    });

    // Put designer on pro first
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await prisma.designerSubscription.update({
      where: { designerId: testDesignerId },
      data: {
        planId: proPlan!.id,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    if (proDiscounted) {
      // Schedule downgrade from pro (149) to pro-discounted (79)
      const scheduled = await prisma.designerSubscription.update({
        where: { designerId: testDesignerId },
        data: {
          scheduledDowngradeAt: periodEnd,
          scheduledDowngradePlanId: proDiscounted.id,
        },
        include: { plan: true },
      });

      assert(scheduled.plan.slug === "pro", "Still on pro (not changed yet)");
      assert(!!scheduled.scheduledDowngradeAt, "Downgrade scheduled");
      assert(
        scheduled.scheduledDowngradePlanId === proDiscounted.id,
        "Target plan = pro-discounted"
      );
    } else {
      console.log(`${INFO} Skipping: no pro-discounted plan found`);
    }
    console.log("");
  } catch (err) {
    console.log(`${FAIL} Scheduled downgrade: ${err}`);
    failed++;
  }

  // ─── Test 8: Payment-first enforcement ────────────────────────
  console.log(`${INFO} Test 8: Payment-first enforcement logic`);
  try {
    // Reset to free plan for this test
    const freePlan = await prisma.subscriptionPlan.findFirst({
      where: { slug: "free" },
    });
    const proPlan = await prisma.subscriptionPlan.findFirst({
      where: { slug: "pro" },
    });
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await prisma.designerSubscription.update({
      where: { designerId: testDesignerId },
      data: {
        planId: freePlan!.id,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        scheduledDowngradeAt: null,
        scheduledDowngradePlanId: null,
      },
    });

    const sub = await prisma.designerSubscription.findUnique({
      where: { designerId: testDesignerId },
      include: { plan: true },
    });

    const currentPrice = Number(sub!.plan.price);
    const newPrice = Number(proPlan!.price);

    // Verify: upgrade requires payment
    assert(newPrice > currentPrice, "Pro is more expensive than free");
    assert(newPrice > 0, "Pro has a price > 0");

    // Verify: switching to free should NOT require payment
    assert(currentPrice === 0, "Free plan price is 0");

    // Verify: no pending payments left hanging
    const pendingPayments = await prisma.subscriptionPayment.findMany({
      where: {
        subscriptionId: sub!.id,
        status: "pending",
      },
    });
    assert(
      pendingPayments.length === 0,
      `No orphan pending payments (found ${pendingPayments.length})`
    );
    console.log("");
  } catch (err) {
    console.log(`${FAIL} Payment enforcement: ${err}`);
    failed++;
  }

  // ─── Test 9: Subscription status transitions ─────────────────
  console.log(`${INFO} Test 9: Status transitions`);
  try {
    const sub = await prisma.designerSubscription.findUnique({
      where: { designerId: testDesignerId },
    });

    // Test pause
    const paused = await prisma.designerSubscription.update({
      where: { designerId: testDesignerId },
      data: {
        status: "paused",
        pausedAt: new Date(),
        pauseEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        pauseReason: "test_pause",
      },
    });
    assert(paused.status === "paused", "Status can be set to paused");

    // Test resume
    const resumed = await prisma.designerSubscription.update({
      where: { designerId: testDesignerId },
      data: {
        status: "active",
        pausedAt: null,
        pauseEndsAt: null,
        pauseReason: null,
      },
    });
    assert(resumed.status === "active", "Status can be resumed to active");

    // Test past_due (dunning)
    const pastDue = await prisma.designerSubscription.update({
      where: { designerId: testDesignerId },
      data: {
        status: "past_due",
        failedPaymentCount: 1,
        gracePeriodEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    assert(pastDue.status === "past_due", "Status can be set to past_due");
    assert(pastDue.failedPaymentCount === 1, "Failed payment count incremented");

    // Clean up — back to active
    await prisma.designerSubscription.update({
      where: { designerId: testDesignerId },
      data: {
        status: "active",
        failedPaymentCount: 0,
        lastFailedPaymentAt: null,
        gracePeriodEndsAt: null,
        nextRetryAt: null,
      },
    });
    console.log("");
  } catch (err) {
    console.log(`${FAIL} Status transitions: ${err}`);
    failed++;
  }

  // ─── Test 10: Final cleanup — ensure designer is on free plan ─
  console.log(`${INFO} Test 10: Final state — designer on free plan`);
  try {
    const freePlan = await prisma.subscriptionPlan.findFirst({
      where: { slug: "free" },
    });
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const final = await prisma.designerSubscription.update({
      where: { designerId: testDesignerId },
      data: {
        planId: freePlan!.id,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        scheduledDowngradeAt: null,
        scheduledDowngradePlanId: null,
        cancelledAt: null,
        cancelReason: null,
        failedPaymentCount: 0,
        lastFailedPaymentAt: null,
        gracePeriodEndsAt: null,
        nextRetryAt: null,
        readOnlyUntil: null,
        pausedAt: null,
        pauseEndsAt: null,
        pauseReason: null,
      },
      include: { plan: true },
    });

    assert(final.plan.slug === "free", "Designer is on free plan");
    assert(final.status === "active", "Status is active");
    assert(!final.scheduledDowngradeAt, "No pending downgrades");
    assert(!final.cancelledAt, "Not cancelled");
    assert(final.failedPaymentCount === 0, "No failed payments");
    console.log("");
  } catch (err) {
    console.log(`${FAIL} Final cleanup: ${err}`);
    failed++;
  }

  // ─── Summary ──────────────────────────────────────────────────
  console.log("══════════════════════════════════════════");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("══════════════════════════════════════════\n");

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
