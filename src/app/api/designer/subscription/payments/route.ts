export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/designer/subscription/payments — list payment history
export async function GET(req: NextRequest) {
  try {
    // Security: only use authenticated user ID from middleware
    const designerId = req.headers.get("x-user-id");

    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const subscription = await prisma.designerSubscription.findUnique({
      where: { designerId },
      select: { id: true },
    });

    if (!subscription) {
      return NextResponse.json({ payments: [] });
    }

    const payments = await prisma.subscriptionPayment.findMany({
      where: { subscriptionId: subscription.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ payments });
  } catch (error) {
    console.error("GET payments error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת היסטוריית תשלומים" },
      { status: 500 }
    );
  }
}
