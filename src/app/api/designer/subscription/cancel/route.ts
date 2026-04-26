/**
 * POST /api/designer/subscription/cancel
 *
 * Cancel a subscription. The account enters a 30-day read-only grace
 * period during which the designer may download their data.
 *
 * Body: { designerId: string, reason?: string }
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logSubscriptionAudit } from "@/lib/subscription-audit";
import { createNotification } from "@/lib/notifications";
import { sendEmail, subscriptionCancelledEmail } from "@/lib/email";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json().catch(() => ({}));
    const { designerId, reason } = body as {
      designerId?: string;
      reason?: string;
    };

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

    const now = new Date();
    const downloadUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const updated = await prisma.designerSubscription.update({
      where: { id: subscription.id },
      data: {
        status: "read_only",
        readOnlyUntil: downloadUntil,
        cancelledAt: now,
        cancelReason: reason || null,
        autoRenew: false,
        recurringEnabled: false,
      },
      include: { plan: true },
    });

    await logSubscriptionAudit({
      subscriptionId: subscription.id,
      designerId,
      action: "cancelled",
      actorType: "designer",
      fromValue: subscription.status,
      toValue: "read_only",
      metadata: {
        downloadUntil: downloadUntil.toISOString(),
      },
      reason: reason || undefined,
    });

    const designer = await prisma.designer.findUnique({
      where: { id: designerId },
      select: { fullName: true, email: true },
    });

    await createNotification({
      userId: designerId,
      type: "subscription_cancelled",
      title: "המנוי בוטל",
      body: `המנוי בוטל. גישה לקריאה והורדת מידע עד ${downloadUntil.toLocaleDateString("he-IL")}.`,
      linkUrl: "/designer",
    });

    if (designer?.email) {
      const tpl = subscriptionCancelledEmail(
        designer.fullName || "",
        now,
        downloadUntil
      );
      await sendEmail({ to: designer.email, subject: tpl.subject, html: tpl.html });
    }

    return NextResponse.json({
      success: true,
      message: `המנוי בוטל. ניתן להוריד את המידע שלך עד ${downloadUntil.toLocaleDateString("he-IL")}`,
      downloadUntil,
      subscription: updated,
    });
  } catch (error) {
    console.error("[cancel] error:", error);
    return NextResponse.json(
      { error: "שגיאה בביטול המנוי" },
      { status: 500 }
    );
  }
}
