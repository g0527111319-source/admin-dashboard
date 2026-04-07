export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/icount";

type IcountWebhookEvent = {
  event?: string;
  type?: string;
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

// POST /api/webhooks/icount
export async function POST(req: NextRequest) {
  try {
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
    const subscriptionId = event.subscription_id || null;
    const clientId = event.client_id || null;

    // Find subscription by icount ids
    const subscription = subscriptionId
      ? await prisma.designerSubscription.findFirst({
          where: { icountSubscriptionId: subscriptionId },
        })
      : clientId
      ? await prisma.designerSubscription.findFirst({
          where: { icountCustomerId: clientId },
        })
      : null;

    if (!subscription) {
      console.warn("[iCount webhook] no matching subscription:", {
        subscriptionId,
        clientId,
        eventType,
      });
      return NextResponse.json({ received: true, matched: false });
    }

    const amount = event.amount ? Number(event.amount) : 0;
    const currency = event.currency || "ILS";

    switch (eventType) {
      case "payment.succeeded":
      case "payment_success":
      case "invoice.paid": {
        const now = new Date();
        const nextPeriodEnd = new Date(now);
        nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

        await prisma.subscriptionPayment.create({
          data: {
            subscriptionId: subscription.id,
            amount,
            currency,
            status: "succeeded",
            paymentMethod: event.payment_method || null,
            icountInvoiceId: event.doc_id || null,
            icountReceiptId: event.receipt_id || null,
            paidAt: event.paid_at ? new Date(event.paid_at) : now,
          },
        });

        await prisma.designerSubscription.update({
          where: { id: subscription.id },
          data: {
            status: "active",
            lastPaymentAt: now,
            lastPaymentAmount: amount,
            currentPeriodStart: now,
            currentPeriodEnd: nextPeriodEnd,
          },
        });
        break;
      }

      case "payment.failed":
      case "payment_failed": {
        await prisma.subscriptionPayment.create({
          data: {
            subscriptionId: subscription.id,
            amount,
            currency,
            status: "failed",
            paymentMethod: event.payment_method || null,
            failureReason: event.failure_reason || null,
          },
        });

        await prisma.designerSubscription.update({
          where: { id: subscription.id },
          data: { status: "past_due" },
        });
        break;
      }

      case "subscription.cancelled":
      case "subscription_cancelled":
      case "subscription.canceled": {
        await prisma.designerSubscription.update({
          where: { id: subscription.id },
          data: {
            status: "cancelled",
            cancelledAt: new Date(),
            autoRenew: false,
          },
        });
        break;
      }

      default:
        console.log("[iCount webhook] unhandled event type:", eventType);
    }

    return NextResponse.json({ received: true, matched: true });
  } catch (error) {
    console.error("iCount webhook error:", error);
    return NextResponse.json({ error: "webhook failed" }, { status: 500 });
  }
}
