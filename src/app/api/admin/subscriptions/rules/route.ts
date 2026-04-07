import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rules = await prisma.subscriptionRule.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(rules);
  } catch (error) {
    console.error("Rules fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת חוקים" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, minSupplierCount, timeWindowDays, targetPlanId, isActive } = body;
    if (!name) return NextResponse.json({ error: "חסר שם" }, { status: 400 });
    const rule = await prisma.subscriptionRule.create({
      data: {
        name,
        minSupplierCount: Number(minSupplierCount ?? 0),
        timeWindowDays: Number(timeWindowDays ?? 30),
        targetPlanId: targetPlanId ?? null,
        isActive: isActive ?? true,
      },
    });
    return NextResponse.json(rule);
  } catch (error) {
    console.error("Rule create error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת חוק" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
    const updated = await prisma.subscriptionRule.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Rule update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון חוק" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
    await prisma.subscriptionRule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Rule delete error:", error);
    return NextResponse.json({ error: "שגיאה במחיקת חוק" }, { status: 500 });
  }
}
