import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { seedSubscriptionPlans } from "@/lib/subscription-seed";

export const dynamic = "force-dynamic";

// GET /api/admin/subscriptions/plans — List all plans (auto-seed if empty)
export async function GET() {
  try {
    let plans = await prisma.subscriptionPlan.findMany({
      orderBy: { sortOrder: "asc" },
    });
    if (plans.length === 0) {
      await seedSubscriptionPlans();
      plans = await prisma.subscriptionPlan.findMany({
        orderBy: { sortOrder: "asc" },
      });
    }
    return NextResponse.json(plans);
  } catch (error) {
    console.error("Plans fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת תוכניות" }, { status: 500 });
  }
}

// POST — Create plan
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, slug, price, currency, billingCycle, features, description, sortOrder } = body;
    if (!name || !slug) {
      return NextResponse.json({ error: "חסרים שם או מזהה" }, { status: 400 });
    }
    const plan = await prisma.subscriptionPlan.create({
      data: {
        name,
        slug,
        price: price ?? 0,
        currency: currency ?? "ILS",
        billingCycle: billingCycle ?? "monthly",
        features: features ?? {
          events: true,
          suppliers: true,
          raffles: true,
          crm: false,
          businessCard: false,
          contracts: false,
        },
        description: description ?? null,
        sortOrder: sortOrder ?? 0,
      },
    });
    return NextResponse.json(plan);
  } catch (error) {
    console.error("Plan create error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת תוכנית" }, { status: 500 });
  }
}

// PATCH — Update plan
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
    const updated = await prisma.subscriptionPlan.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Plan update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון תוכנית" }, { status: 500 });
  }
}

// DELETE — Soft delete (isActive=false)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
    const updated = await prisma.subscriptionPlan.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Plan delete error:", error);
    return NextResponse.json({ error: "שגיאה במחיקת תוכנית" }, { status: 500 });
  }
}
