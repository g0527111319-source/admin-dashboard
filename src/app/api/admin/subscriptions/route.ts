import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// GET /api/admin/subscriptions — List all designers with their subscriptions
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const { searchParams } = new URL(req.url);
    const planSlug = searchParams.get("plan");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (search) {
      where.fullName = { contains: search, mode: "insensitive" };
    }

    const designers = await prisma.designer.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        subscription: {
          include: { plan: true },
        },
      },
      orderBy: { fullName: "asc" },
    });

    let result = designers;
    if (planSlug) {
      result = result.filter((d) => d.subscription?.plan?.slug === planSlug);
    }
    if (status) {
      result = result.filter((d) => d.subscription?.status === status);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Subscriptions list error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת מנויים" }, { status: 500 });
  }
}

// POST — Assign subscription to designer
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    const { designerId, planId, trialDays, autoRenew } = body;
    if (!designerId || !planId) {
      return NextResponse.json({ error: "חסרים פרטים" }, { status: 400 });
    }

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) return NextResponse.json({ error: "תוכנית לא נמצאה" }, { status: 404 });

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    let trialEndsAt: Date | null = null;
    let status = "active";
    if (trialDays && trialDays > 0) {
      trialEndsAt = new Date(now);
      trialEndsAt.setDate(trialEndsAt.getDate() + Number(trialDays));
      status = "trial";
    }

    const existing = await prisma.designerSubscription.findUnique({
      where: { designerId },
    });

    let subscription;
    if (existing) {
      subscription = await prisma.designerSubscription.update({
        where: { designerId },
        data: {
          planId,
          status,
          trialEndsAt,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          autoRenew: autoRenew ?? true,
          cancelledAt: null,
          cancelReason: null,
          // Clear any scheduled downgrade / paused state
          scheduledDowngradeAt: null,
          scheduledDowngradePlanId: null,
          pausedAt: null,
          pauseEndsAt: null,
          pauseReason: null,
          // Reset dunning state
          failedPaymentCount: 0,
          lastFailedPaymentAt: null,
          gracePeriodEndsAt: null,
          nextRetryAt: null,
          readOnlyUntil: null,
        },
        include: { plan: true },
      });
    } else {
      subscription = await prisma.designerSubscription.create({
        data: {
          designerId,
          planId,
          status,
          trialEndsAt,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          autoRenew: autoRenew ?? true,
        },
        include: { plan: true },
      });
    }

    return NextResponse.json(subscription);
  } catch (error) {
    console.error("Subscription assign error:", error);
    return NextResponse.json({ error: "שגיאה בהקצאת מנוי" }, { status: 500 });
  }
}
