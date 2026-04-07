/**
 * POST /api/designer/subscription/pause
 *
 * Pause an active subscription for 1-3 months.
 *
 * Body: { designerId: string, months: number, reason?: string }
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logSubscriptionAudit } from "@/lib/subscription-audit";
import { createNotification } from "@/lib/notifications";
import { sendEmail, subscriptionPausedEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { designerId, months, reason } = body as {
      designerId?: string;
      months?: number;
      reason?: string;
    };

    if (!designerId || !months) {
      return NextResponse.json(
        { error: "חסרים פרטים: מזהה מעצבת או מספר חודשים" },
        { status: 400 }
      );
    }

    const monthsNum = Math.floor(Number(months));
    if (!Number.isFinite(monthsNum) || monthsNum < 1 || monthsNum > 3) {
      return NextResponse.json(
        { error: "ניתן להשהות מנוי לתקופה של 1 עד 3 חודשים בלבד" },
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
    if (subscription.status !== "active") {
      return NextResponse.json(
        { error: "ניתן להשהות רק מנוי פעיל" },
        { status: 400 }
      );
    }

    const now = new Date();
    const pauseEndsAt = new Date(now.getTime() + monthsNum * 30 * 24 * 60 * 60 * 1000);

    const updated = await prisma.designerSubscription.update({
      where: { id: subscription.id },
      data: {
        status: "paused",
        pausedAt: now,
        pauseEndsAt,
        pauseReason: reason || null,
      },
      include: { plan: true },
    });

    await logSubscriptionAudit({
      subscriptionId: subscription.id,
      designerId,
      action: "paused",
      actorType: "designer",
      fromValue: "active",
      toValue: "paused",
      metadata: { months: monthsNum, pauseEndsAt: pauseEndsAt.toISOString() },
      reason: reason || undefined,
    });

    const designer = await prisma.designer.findUnique({
      where: { id: designerId },
      select: { fullName: true, email: true },
    });

    await createNotification({
      userId: designerId,
      type: "subscription_paused",
      title: "המנוי הושהה",
      body: `המנוי שלך הושהה עד ${pauseEndsAt.toLocaleDateString("he-IL")}. בכל עת תוכלי להפעיל אותו מחדש.`,
      linkUrl: "/designer",
    });

    if (designer?.email) {
      const tpl = subscriptionPausedEmail(designer.fullName || "", pauseEndsAt);
      await sendEmail({ to: designer.email, subject: tpl.subject, html: tpl.html });
    }

    return NextResponse.json({
      success: true,
      message: `המנוי הושהה בהצלחה עד ${pauseEndsAt.toLocaleDateString("he-IL")}`,
      resumeAt: pauseEndsAt,
      subscription: updated,
    });
  } catch (error) {
    console.error("[pause] error:", error);
    return NextResponse.json(
      { error: "שגיאה בהשהיית המנוי" },
      { status: 500 }
    );
  }
}
