/**
 * POST /api/designer/subscription/resume
 *
 * Resume a paused subscription. Restarts the billing period from now.
 *
 * Body: { designerId: string }
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logSubscriptionAudit } from "@/lib/subscription-audit";
import { createNotification } from "@/lib/notifications";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json().catch(() => ({}));
    const { designerId } = body as { designerId?: string };

    if (!designerId) {
      return NextResponse.json(
        { error: "חסר מזהה מעצבת" },
        { status: 400 }
      );
    }

    const subscription = await prisma.designerSubscription.findUnique({
      where: { designerId },
      include: { plan: true },
    });

    if (!subscription) {
      return NextResponse.json({ error: "לא נמצא מנוי" }, { status: 404 });
    }
    if (subscription.status !== "paused") {
      return NextResponse.json(
        { error: "ניתן להפעיל מחדש רק מנוי שהושהה" },
        { status: 400 }
      );
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const updated = await prisma.designerSubscription.update({
      where: { id: subscription.id },
      data: {
        status: "active",
        pausedAt: null,
        pauseEndsAt: null,
        pauseReason: null,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      include: { plan: true },
    });

    await logSubscriptionAudit({
      subscriptionId: subscription.id,
      designerId,
      action: "resumed",
      actorType: "designer",
      fromValue: "paused",
      toValue: "active",
      metadata: {
        newPeriodStart: now.toISOString(),
        newPeriodEnd: periodEnd.toISOString(),
      },
    });

    await createNotification({
      userId: designerId,
      type: "pause_ending",
      title: "המנוי הופעל מחדש",
      body: `המנוי שלך פעיל שוב. החיוב הבא יתבצע ב־${periodEnd.toLocaleDateString("he-IL")}.`,
      linkUrl: "/designer",
    });

    return NextResponse.json({
      success: true,
      message: "המנוי הופעל מחדש בהצלחה",
      subscription: updated,
    });
  } catch (error) {
    console.error("[resume] error:", error);
    return NextResponse.json(
      { error: "שגיאה בהפעלת המנוי מחדש" },
      { status: 500 }
    );
  }
}
