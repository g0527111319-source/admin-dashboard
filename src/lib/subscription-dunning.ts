/**
 * Dunning / grace-period logic (item 3).
 *
 * Flow when a recurring charge fails:
 *  1. Mark subscription "past_due", enter 7-day grace period, retry on days 1/3/7.
 *  2. Each failed retry: email + in-app notification, bump failedPaymentCount.
 *  3. On success anywhere: reset counters, return to "active".
 *  4. After 7 days without success: status -> "read_only" with 30-day download window.
 *  5. After 30 days read-only: status -> "cancelled".
 */
import prisma from "./prisma";
import { chargeRecurring } from "./icount";
import { logSubscriptionAudit } from "./subscription-audit";
import { createNotification } from "./notifications";
import { sendEmail } from "./email";

const GRACE_DAYS = 7;
const READ_ONLY_DAYS = 30;
const RETRY_SCHEDULE_DAYS = [1, 3, 7];

export async function handlePaymentFailure(
  subscriptionId: string,
  reason: string,
  icountEventId?: string
): Promise<void> {
  const sub = await prisma.designerSubscription.findUnique({
    where: { id: subscriptionId },
    include: { designer: true, plan: true },
  });
  if (!sub) return;

  const now = new Date();
  const newCount = sub.failedPaymentCount + 1;
  const isFirst = sub.failedPaymentCount === 0;
  const gracePeriodEndsAt = isFirst
    ? new Date(now.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000)
    : sub.gracePeriodEndsAt;
  const nextRetryDay = RETRY_SCHEDULE_DAYS[Math.min(newCount, RETRY_SCHEDULE_DAYS.length - 1)];
  const nextRetryAt = new Date(now.getTime() + nextRetryDay * 24 * 60 * 60 * 1000);

  // Record the failed payment attempt (with idempotency key)
  await prisma.subscriptionPayment.create({
    data: {
      subscriptionId,
      amount: sub.plan.price,
      currency: sub.plan.currency,
      status: "failed",
      failureReason: reason,
      attemptNumber: newCount,
      icountEventId,
    },
  });

  await prisma.designerSubscription.update({
    where: { id: subscriptionId },
    data: {
      status: "past_due",
      failedPaymentCount: newCount,
      lastFailedPaymentAt: now,
      gracePeriodEndsAt: gracePeriodEndsAt,
      nextRetryAt,
    },
  });

  await logSubscriptionAudit({
    subscriptionId,
    designerId: sub.designerId,
    action: "payment_failed",
    actorType: "webhook",
    toValue: `attempt ${newCount}`,
    reason,
    metadata: { icountEventId, nextRetryAt },
  });

  // Notify designer
  await createNotification({
    userId: sub.designerId,
    type: "payment_failed",
    title: `כשל בחיוב המנוי (ניסיון ${newCount}/3)`,
    body: `החיוב החודשי נכשל. ננסה שוב ב־${nextRetryAt.toLocaleDateString("he-IL")}. יש לוודא שפרטי התשלום מעודכנים.`,
    linkUrl: `/designer/${sub.designerId}/subscription`,
  });

  if (sub.designer.email) {
    await sendEmail({
      to: sub.designer.email,
      subject: `כשל בחיוב המנוי — זירת האדריכלות`,
      html: paymentFailedEmailHtml(sub.designer.fullName, newCount, nextRetryAt),
    });
  }
}

export async function handlePaymentSuccess(
  subscriptionId: string,
  amount: number,
  icountInvoiceId?: string,
  icountReceiptId?: string,
  icountEventId?: string
): Promise<void> {
  const sub = await prisma.designerSubscription.findUnique({
    where: { id: subscriptionId },
    include: { designer: true, plan: true },
  });
  if (!sub) return;

  const now = new Date();
  const nextPeriodEnd = new Date(now);
  nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

  await prisma.subscriptionPayment.create({
    data: {
      subscriptionId,
      amount,
      currency: sub.plan.currency,
      status: "succeeded",
      icountInvoiceId,
      icountReceiptId,
      icountEventId,
      paidAt: now,
    },
  });

  await prisma.designerSubscription.update({
    where: { id: subscriptionId },
    data: {
      status: "active",
      failedPaymentCount: 0,
      lastFailedPaymentAt: null,
      gracePeriodEndsAt: null,
      nextRetryAt: null,
      lastPaymentAt: now,
      lastPaymentAmount: amount,
      currentPeriodStart: now,
      currentPeriodEnd: nextPeriodEnd,
    },
  });

  await logSubscriptionAudit({
    subscriptionId,
    designerId: sub.designerId,
    action: "payment_succeeded",
    actorType: "webhook",
    toValue: `₪${amount}`,
    metadata: { icountInvoiceId, icountReceiptId, icountEventId },
  });

  await createNotification({
    userId: sub.designerId,
    type: "payment_success",
    title: "התשלום התקבל בהצלחה",
    body: `בוצע חיוב של ₪${amount.toFixed(2)} עבור המנוי החודשי. תקפות עד ${nextPeriodEnd.toLocaleDateString("he-IL")}.`,
    linkUrl: `/designer/${sub.designerId}/subscription`,
  });
}

/**
 * Called daily by cron. Runs retries for subscriptions in past_due, and
 * moves them to read_only or cancelled when grace exhausted.
 */
export async function runDunningCycle(): Promise<{
  retried: number;
  movedToReadOnly: number;
  cancelled: number;
}> {
  const now = new Date();
  let retried = 0;
  let movedToReadOnly = 0;
  let cancelled = 0;

  // 1. Retry due charges
  const dueRetries = await prisma.designerSubscription.findMany({
    where: {
      status: "past_due",
      nextRetryAt: { lte: now },
      gracePeriodEndsAt: { gt: now },
    },
    include: { plan: true, designer: true },
  });

  for (const sub of dueRetries) {
    retried++;
    try {
      if (!sub.icountSubscriptionId) {
        await handlePaymentFailure(sub.id, "No iCount subscription ID");
        continue;
      }
      const result = (await chargeRecurring(sub.icountSubscriptionId)) as {
        status?: boolean;
        charged?: boolean;
        doc_id?: string;
        receipt_id?: string;
        error?: string;
      };
      if (result.status && result.charged) {
        await handlePaymentSuccess(
          sub.id,
          Number(sub.plan.price),
          result.doc_id,
          result.receipt_id
        );
      } else {
        await handlePaymentFailure(sub.id, result.error || "Retry failed");
      }
    } catch (err) {
      await handlePaymentFailure(sub.id, err instanceof Error ? err.message : "Retry exception");
    }
  }

  // 2. Grace exhausted -> read_only + 30 day data download window
  const graceExpired = await prisma.designerSubscription.findMany({
    where: {
      status: "past_due",
      gracePeriodEndsAt: { lte: now },
    },
    include: { designer: true },
  });

  for (const sub of graceExpired) {
    movedToReadOnly++;
    const readOnlyUntil = new Date(now.getTime() + READ_ONLY_DAYS * 24 * 60 * 60 * 1000);
    await prisma.designerSubscription.update({
      where: { id: sub.id },
      data: {
        status: "read_only",
        readOnlyUntil,
      },
    });
    await logSubscriptionAudit({
      subscriptionId: sub.id,
      designerId: sub.designerId,
      action: "status_changed",
      actorType: "system",
      fromValue: "past_due",
      toValue: "read_only",
      reason: "Grace period exhausted",
    });
    await createNotification({
      userId: sub.designerId,
      type: "grace_period",
      title: "המנוי עבר למצב קריאה בלבד",
      body: `יש לך ${READ_ONLY_DAYS} ימים להוריד את המידע שלך לפני סגירת החשבון.`,
      linkUrl: `/designer/${sub.designerId}/subscription`,
    });
    if (sub.designer.email) {
      await sendEmail({
        to: sub.designer.email,
        subject: "המנוי שלך עבר למצב קריאה בלבד",
        html: readOnlyEmailHtml(sub.designer.fullName, readOnlyUntil),
      });
    }
  }

  // 3. Read-only window exhausted -> cancelled
  const readOnlyExpired = await prisma.designerSubscription.findMany({
    where: {
      status: "read_only",
      readOnlyUntil: { lte: now },
    },
    include: { designer: true },
  });

  for (const sub of readOnlyExpired) {
    cancelled++;
    await prisma.designerSubscription.update({
      where: { id: sub.id },
      data: {
        status: "cancelled",
        cancelledAt: now,
        cancelReason: "Payment failure — grace + read-only window exhausted",
      },
    });
    await logSubscriptionAudit({
      subscriptionId: sub.id,
      designerId: sub.designerId,
      action: "cancelled",
      actorType: "system",
      reason: "Read-only window exhausted after payment failure",
    });
  }

  return { retried, movedToReadOnly, cancelled };
}

function paymentFailedEmailHtml(name: string, attempt: number, nextRetryAt: Date): string {
  return `
    <div dir="rtl" style="font-family:Heebo,Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;padding:40px;border-radius:12px;">
      <h2 style="color:#C9A84C;">שלום ${name},</h2>
      <p>לא הצלחנו לחייב את המנוי שלך בזירת האדריכלות.</p>
      <p><strong>ניסיון מס': ${attempt}</strong></p>
      <p>ננסה שוב אוטומטית בתאריך <strong>${nextRetryAt.toLocaleDateString("he-IL")}</strong>.</p>
      <p>כדי להימנע מסגירת המנוי, יש לוודא שפרטי כרטיס האשראי מעודכנים:</p>
      <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || ""}/designer" style="display:inline-block;background:#C9A84C;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">עדכון פרטי תשלום</a></p>
      <p style="color:#888;font-size:12px;margin-top:30px;">אם החיוב ימשיך להיכשל, המנוי יעבור למצב קריאה בלבד עם 30 ימים להוריד את כל המידע שלך.</p>
    </div>`;
}

function readOnlyEmailHtml(name: string, readOnlyUntil: Date): string {
  return `
    <div dir="rtl" style="font-family:Heebo,Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;padding:40px;border-radius:12px;">
      <h2 style="color:#C9A84C;">שלום ${name},</h2>
      <p>המנוי שלך עבר למצב <strong>קריאה בלבד</strong> לאחר ניסיונות חיוב חוזרים שנכשלו.</p>
      <p>יש לך זמן עד <strong>${readOnlyUntil.toLocaleDateString("he-IL")}</strong> להיכנס למערכת ולהוריד את כל המידע שלך — לקוחות, פרויקטים, חוזים וקבצים.</p>
      <p>כדי להחזיר את המנוי לפעילות מלאה, יש לעדכן את פרטי התשלום:</p>
      <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || ""}/designer" style="display:inline-block;background:#C9A84C;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">הפעלה מחדש</a></p>
    </div>`;
}
