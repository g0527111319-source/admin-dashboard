export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

// POST /api/designer/subscription/cancel-downgrade — cancel a scheduled downgrade
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json().catch(() => ({}));
    const designerId =
      (body as { designerId?: string }).designerId ||
      auth.userId;

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
