export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/designer/subscription/cancel-downgrade — cancel a scheduled downgrade
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const designerId =
      (body as { designerId?: string }).designerId ||
      req.headers.get("x-user-id");

    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const subscription = await prisma.designerSubscription.findUnique({
      where: { designerId },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "לא נמצא מנוי פעיל" },
        { status: 404 }
      );
    }

    if (!subscription.scheduledDowngradeAt) {
      return NextResponse.json(
        { error: "אין שינמוך מתוזמן לביטול" },
        { status: 400 }
      );
    }

    await prisma.designerSubscription.update({
      where: { designerId },
      data: {
        scheduledDowngradeAt: null,
        scheduledDowngradePlanId: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "השינמוך המתוזמן בוטל בהצלחה",
    });
  } catch (error) {
    console.error("[cancel-downgrade] error:", error);
    return NextResponse.json(
      { error: "שגיאה בביטול השינמוך" },
      { status: 500 }
    );
  }
}
