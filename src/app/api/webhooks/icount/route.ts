export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/icount";
import { handlePaymentSuccess, handlePaymentFailure } from "@/lib/subscription-dunning";
import { logSubscriptionAudit } from "@/lib/subscription-audit";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sendEmail, subscriptionCancelledEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

type IcountWebhookEvent = {
  event?: string;
  type?: string;
  event_id?: string;
  id?: string;
  subscription_id?: string;
  client_id?: string;
  doc_id?: string;
  receipt_id?: string;
  amount?: number | string;
  currency?: string;
  payment_method?: string;
  failure_reason?: string;
  paid_at?: string;
};

export async function POST(req: NextRequest) {
  try {
    // 1. Rate limit (item 15) — 60 requests/min per IP
    const ip = getClientIp(req);
    const rl = await rateLimit(`webhook:icount:${ip}`, 60, 60);
    if (!rl.allowed) {
      return NextResponse.json({ error: "rate limited" }, { status: 429 });
    }

    // 2. Verify signature
    const rawBody = await req.text();
    const signature =
      req.headers.get("x-icount-signature") ||
      req.headers.get("x-signature") ||
      null;

    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }

    let event: IcountWebhookEvent;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "invalid json" }, { status: 400 });
    }

    const eventType = (event.event || event.type || "").toLowerCase();
    const eventId = event.event_id || event.id || null;

    // 3. Idempotency check (item 2)
    if (eventId) {
      const existing = await prisma.subscriptionPayment.findUnique({
        where: { icountEventId: eventId },
      });
      if (existing) {
        // Duplicate event skipped
        return NextResponse.json({ received: true, duplicate: true });
      }
    }

    const subscriptionId = event.subscription_id || null;
    const clientId = event.client_id || null;

    // Look up subscription — prefer subscriptionId (unique) over clientId (NOT unique)
    let subscription = subscriptionId
      ? await prisma.designerSubscription.findFirst({
          where: { icountSubscriptionId: subscriptionId },
          include: { designer: true },
        })
      : null;

    // Fallback to clientId, but enforce single-match to prevent payment misrouting
    if (!subscription && clientId) {
      const matches = await prisma.designerSubscription.findMany({
        where: { icountCustomerId: clientId },
        include: { designer: true },
      });
      if (matches.length === 1) {
        subscription = matches[0];
      } else if (matches.length > 1) {
        console.error(
          `[iCount webhook] SECURITY: Multiple subscriptions share icountCustomerId=${clientId}. ` +
          `Refusing to process payment. Affected designerIds: ${matches.map(m => m.designerId).join(", ")}`
        );
        return NextResponse.json({ received: true, matched: false, error: "ambiguous_customer" });
      }
    }

    if (!subscription) {
      console.warn("[iCount webhook] no matching subscription:", {
        subscriptionId,
        clientId,
        eventType,
      });
      return NextResponse.json({ received: true, matched: false });
    }

    const amount = event.amount ? Number(event.amount) : 0;

    switch (eventType) {
      case "payment.succeeded":
      case "payment_success":
      case "invoice.paid":
        await handlePaymentSuccess(
          subscription.id,
          amount,
          event.doc_id || undefined,
          event.receipt_id || undefined,
          eventId || undefined
        );
        break;

      case "payment.failed":
      case "payment_failed":
        await handlePaymentFailure(
          subscription.id,
          event.failure_reason || "Unknown",
          eventId || undefined
        );
        break;

      case "subscription.cancelled":
      case "subscription_cancelled":
      case "subscription.canceled": {
        const now = new Date();
        const readOnlyUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        await prisma.designerSubscription.update({
          where: { id: subscription.id },
          data: {
            status: "read_only",
            cancelledAt: now,
            autoRenew: false,
            recurringEnabled: false,
            readOnlyUntil,
          },
        });
        await logSubscriptionAudit({
          subscriptionId: subscription.id,
          designerId: subscription.designerId,
          action: "cancelled",
          actorType: "webhook",
          reason: "Cancelled at iCount",
          metadata: { eventId },
        });
        await createNotification({
          userId: subscription.designerId,
          type: "subscription_cancelled",
          title: "המנוי שלך בוטל",
          body: `יש לך ${30} ימים להוריד את המידע שלך.`,
          linkUrl: `/designer/${subscription.designerId}/subscription`,
        });
        if (subscription.designer.email) {
          const em = subscriptionCancelledEmail(subscription.designer.fullName, now, readOnlyUntil);
          await sendEmail({ to: subscription.designer.email, subject: em.subject, html: em.html });
        }
        break;
      }

      default:
        // Unhandled event type
    }

    return NextResponse.json({ received: true, matched: true });
  } catch (error) {
    console.error("iCount webhook error");
    return NextResponse.json({ error: "webhook failed" }, { status: 500 });
  }
}
