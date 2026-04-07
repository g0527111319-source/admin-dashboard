export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  createCustomer,
  createSubscription,
  cancelSubscription as icountCancel,
} from "@/lib/icount";

function getDesignerId(req: NextRequest): string | null {
  return (
    req.headers.get("x-user-id") ||
    new URL(req.url).searchParams.get("designerId")
  );
}

// GET /api/designer/subscription — current subscription info
export async function GET(req: NextRequest) {
  try {
    const designerId = getDesignerId(req);
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const subscription = await prisma.designerSubscription.findUnique({
      where: { designerId },
      include: { plan: true },
    });

    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ subscription, plans });
  } catch (error) {
    console.error("GET subscription error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת המנוי" }, { status: 500 });
  }
}

// POST /api/designer/subscription — subscribe to a plan
export async function POST(req: NextRequest) {
  try {
    const designerId = getDesignerId(req);
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const body = await req.json();
    const { planId } = body as { planId?: string };
    if (!planId) {
      return NextResponse.json({ error: "חסר מזהה תוכנית" }, { status: 400 });
    }

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) {
      return NextResponse.json(
        { error: "התוכנית לא נמצאה או לא פעילה" },
        { status: 404 }
      );
    }

    const designer = await prisma.designer.findUnique({
      where: { id: designerId },
      select: { id: true, fullName: true, email: true, phone: true },
    });
    if (!designer) {
      return NextResponse.json({ error: "מעצבת לא נמצאה" }, { status: 404 });
    }

    // Create / reuse iCount customer
    const existing = await prisma.designerSubscription.findUnique({
      where: { designerId },
    });

    let icountCustomerId = existing?.icountCustomerId || null;
    if (!icountCustomerId) {
      const customer = await createCustomer({
        name: designer.fullName || designer.email || "Designer",
        email: designer.email || "",
        phone: designer.phone || undefined,
      });
      icountCustomerId =
        (customer as { client_id?: string }).client_id || null;
    }

    // Create iCount subscription (skipped for free plans)
    let icountSubscriptionId: string | null = existing?.icountSubscriptionId || null;
    const price = Number(plan.price);
    if (price > 0 && icountCustomerId) {
      const sub = await createSubscription({
        customerId: icountCustomerId,
        amount: price,
        currency: plan.currency,
        description: `מנוי ${plan.name}`,
      });
      icountSubscriptionId =
        (sub as { subscription_id?: string }).subscription_id ||
        icountSubscriptionId;
    }

    const now = new Date();
    const nextPeriodEnd = new Date(now);
    nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

    const saved = await prisma.designerSubscription.upsert({
      where: { designerId },
      create: {
        designerId,
        planId: plan.id,
        status: "active",
        startedAt: now,
        currentPeriodStart: now,
        currentPeriodEnd: nextPeriodEnd,
        autoRenew: true,
        icountCustomerId,
        icountSubscriptionId,
      },
      update: {
        planId: plan.id,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: nextPeriodEnd,
        cancelledAt: null,
        cancelReason: null,
        autoRenew: true,
        icountCustomerId,
        icountSubscriptionId,
      },
      include: { plan: true },
    });

    return NextResponse.json({ success: true, subscription: saved });
  } catch (error) {
    console.error("POST subscription error:", error);
    return NextResponse.json(
      { error: "שגיאה ביצירת המנוי" },
      { status: 500 }
    );
  }
}

// DELETE /api/designer/subscription — cancel
export async function DELETE(req: NextRequest) {
  try {
    const designerId = getDesignerId(req);
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const reason = (body as { reason?: string }).reason || null;

    const subscription = await prisma.designerSubscription.findUnique({
      where: { designerId },
    });
    if (!subscription) {
      return NextResponse.json({ error: "אין מנוי פעיל" }, { status: 404 });
    }

    if (subscription.icountSubscriptionId) {
      try {
        await icountCancel(subscription.icountSubscriptionId);
      } catch (err) {
        console.error("iCount cancel failed:", err);
      }
    }

    const updated = await prisma.designerSubscription.update({
      where: { designerId },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelReason: reason,
        autoRenew: false,
      },
    });

    return NextResponse.json({ success: true, subscription: updated });
  } catch (error) {
    console.error("DELETE subscription error:", error);
    return NextResponse.json(
      { error: "שגיאה בביטול המנוי" },
      { status: 500 }
    );
  }
}
