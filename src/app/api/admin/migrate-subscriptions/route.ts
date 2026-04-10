export const dynamic = "force-dynamic";
/**
 * One-time schema migration endpoint for subscription upgrades.
 *
 * Applies additive DDL to bring the DB in sync with the expanded Prisma schema:
 *  - New columns on DesignerSubscription / SubscriptionPayment
 *  - New tables: SubscriptionAuditLog, Coupon, CouponRedemption,
 *    InAppNotification, AdminTwoFactorCode, RateLimitEntry
 *  - New Designer columns: lastLoginAt, lastActivityAt
 *
 * Safe to run multiple times (uses IF NOT EXISTS). Protected by MIGRATION_SECRET.
 *
 * Usage: POST /api/admin/migrate-subscriptions with header `x-migration-secret: <secret>`
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const DDL_STATEMENTS: string[] = [
  // Designer new columns
  `ALTER TABLE "Designer" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3)`,
  `ALTER TABLE "Designer" ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP(3)`,

  // DesignerSubscription new columns
  `ALTER TABLE "DesignerSubscription" ADD COLUMN IF NOT EXISTS "recurringEnabled" BOOLEAN NOT NULL DEFAULT true`,
  `ALTER TABLE "DesignerSubscription" ADD COLUMN IF NOT EXISTS "icountPaymentToken" TEXT`,
  `ALTER TABLE "DesignerSubscription" ADD COLUMN IF NOT EXISTS "failedPaymentCount" INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE "DesignerSubscription" ADD COLUMN IF NOT EXISTS "lastFailedPaymentAt" TIMESTAMP(3)`,
  `ALTER TABLE "DesignerSubscription" ADD COLUMN IF NOT EXISTS "gracePeriodEndsAt" TIMESTAMP(3)`,
  `ALTER TABLE "DesignerSubscription" ADD COLUMN IF NOT EXISTS "nextRetryAt" TIMESTAMP(3)`,
  `ALTER TABLE "DesignerSubscription" ADD COLUMN IF NOT EXISTS "readOnlyUntil" TIMESTAMP(3)`,
  `ALTER TABLE "DesignerSubscription" ADD COLUMN IF NOT EXISTS "scheduledDowngradeAt" TIMESTAMP(3)`,
  `ALTER TABLE "DesignerSubscription" ADD COLUMN IF NOT EXISTS "scheduledDowngradePlanId" TEXT`,
  `ALTER TABLE "DesignerSubscription" ADD COLUMN IF NOT EXISTS "pausedAt" TIMESTAMP(3)`,
  `ALTER TABLE "DesignerSubscription" ADD COLUMN IF NOT EXISTS "pauseEndsAt" TIMESTAMP(3)`,
  `ALTER TABLE "DesignerSubscription" ADD COLUMN IF NOT EXISTS "pauseReason" TEXT`,
  `ALTER TABLE "DesignerSubscription" ADD COLUMN IF NOT EXISTS "appliedCouponId" TEXT`,
  `ALTER TABLE "DesignerSubscription" ADD COLUMN IF NOT EXISTS "couponDiscountPercent" INTEGER`,
  `ALTER TABLE "DesignerSubscription" ADD COLUMN IF NOT EXISTS "couponEndsAt" TIMESTAMP(3)`,
  `ALTER TABLE "DesignerSubscription" ADD COLUMN IF NOT EXISTS "promotionNotifiedAt" TIMESTAMP(3)`,
  `ALTER TABLE "DesignerSubscription" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3)`,
  `CREATE INDEX IF NOT EXISTS "DesignerSubscription_status_currentPeriodEnd_idx" ON "DesignerSubscription"("status","currentPeriodEnd")`,
  `CREATE INDEX IF NOT EXISTS "DesignerSubscription_deletedAt_idx" ON "DesignerSubscription"("deletedAt")`,

  // SubscriptionPayment new columns
  `ALTER TABLE "SubscriptionPayment" ADD COLUMN IF NOT EXISTS "icountEventId" TEXT`,
  `ALTER TABLE "SubscriptionPayment" ADD COLUMN IF NOT EXISTS "attemptNumber" INTEGER NOT NULL DEFAULT 1`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionPayment_icountEventId_key" ON "SubscriptionPayment"("icountEventId")`,
  `CREATE INDEX IF NOT EXISTS "SubscriptionPayment_subscriptionId_createdAt_idx" ON "SubscriptionPayment"("subscriptionId","createdAt")`,

  // SubscriptionAuditLog
  `CREATE TABLE IF NOT EXISTS "SubscriptionAuditLog" (
    "id" TEXT PRIMARY KEY,
    "subscriptionId" TEXT NOT NULL,
    "designerId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "fromValue" TEXT,
    "toValue" TEXT,
    "metadata" JSONB,
    "reason" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "SubscriptionAuditLog_subscriptionId_createdAt_idx" ON "SubscriptionAuditLog"("subscriptionId","createdAt")`,
  `CREATE INDEX IF NOT EXISTS "SubscriptionAuditLog_designerId_createdAt_idx" ON "SubscriptionAuditLog"("designerId","createdAt")`,
  `DO $$ BEGIN
    ALTER TABLE "SubscriptionAuditLog"
      ADD CONSTRAINT "SubscriptionAuditLog_subscriptionId_fkey"
      FOREIGN KEY ("subscriptionId") REFERENCES "DesignerSubscription"("id") ON DELETE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  // Coupon
  `CREATE TABLE IF NOT EXISTS "Coupon" (
    "id" TEXT PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "discountType" TEXT NOT NULL DEFAULT 'percent',
    "discountValue" DECIMAL(10,2) NOT NULL,
    "durationMonths" INTEGER NOT NULL DEFAULT 1,
    "maxRedemptions" INTEGER,
    "redemptionCount" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "applicablePlanIds" TEXT[] NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "Coupon_code_isActive_idx" ON "Coupon"("code","isActive")`,

  // CouponRedemption
  `CREATE TABLE IF NOT EXISTS "CouponRedemption" (
    "id" TEXT PRIMARY KEY,
    "couponId" TEXT NOT NULL,
    "designerId" TEXT NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CouponRedemption_couponId_designerId_key" ON "CouponRedemption"("couponId","designerId")`,
  `DO $$ BEGIN
    ALTER TABLE "CouponRedemption"
      ADD CONSTRAINT "CouponRedemption_couponId_fkey"
      FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  // InAppNotification
  `CREATE TABLE IF NOT EXISTS "InAppNotification" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "userType" TEXT NOT NULL DEFAULT 'designer',
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "linkUrl" TEXT,
    "icon" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "InAppNotification_userId_userType_readAt_idx" ON "InAppNotification"("userId","userType","readAt")`,
  `CREATE INDEX IF NOT EXISTS "InAppNotification_userId_createdAt_idx" ON "InAppNotification"("userId","createdAt")`,

  // AdminTwoFactorCode
  `CREATE TABLE IF NOT EXISTS "AdminTwoFactorCode" (
    "id" TEXT PRIMARY KEY,
    "adminEmail" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "contextId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS "AdminTwoFactorCode_adminEmail_purpose_idx" ON "AdminTwoFactorCode"("adminEmail","purpose")`,
  `CREATE INDEX IF NOT EXISTS "AdminTwoFactorCode_expiresAt_idx" ON "AdminTwoFactorCode"("expiresAt")`,

  // RateLimitEntry
  `CREATE TABLE IF NOT EXISTS "RateLimitEntry" (
    "id" TEXT PRIMARY KEY,
    "key" TEXT NOT NULL UNIQUE,
    "count" INTEGER NOT NULL DEFAULT 1,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "RateLimitEntry_expiresAt_idx" ON "RateLimitEntry"("expiresAt")`,
];

function authorized(req: NextRequest): boolean {
  const secret = process.env.MIGRATION_SECRET;
  if (!secret) {
    // In dev or first-run: allow, but log loudly
    console.warn("[migrate-subscriptions] No MIGRATION_SECRET set — allowing");
    return true;
  }
  return req.headers.get("x-migration-secret") === secret;
}

async function runMigration() {
  const results: { sql: string; ok: boolean; error?: string }[] = [];
  for (const sql of DDL_STATEMENTS) {
    try {
      // SAFETY: $executeRawUnsafe is acceptable here because DDL_STATEMENTS is a
      // hardcoded constant array of static DDL (ALTER TABLE, CREATE TABLE, CREATE INDEX).
      // No user input is interpolated. Prisma's $executeRaw tagged template cannot be
      // used because the SQL is iterated from an array, not written inline.
      await prisma.$executeRawUnsafe(sql);
      results.push({ sql: sql.slice(0, 80) + "...", ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ sql: sql.slice(0, 80) + "...", ok: false, error: msg });
    }
  }
  const okCount = results.filter(r => r.ok).length;
  const failCount = results.filter(r => !r.ok).length;
  return { okCount, failCount, total: results.length, results };
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const report = await runMigration();
    return NextResponse.json({ ok: true, ...report });
  } catch (err) {
    console.error("[migrate-subscriptions] error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    ready: true,
    statementCount: DDL_STATEMENTS.length,
    hint: "POST this endpoint to apply the DDL",
  });
}
