/**
 * POST /api/designer/subscription/change-plan
 *
 * Change a designer's subscription plan mid-cycle.
 * - Upgrade  -> immediate switch with prorated charge for remaining days.
 * - Downgrade -> scheduled at the end of the current period (no immediate change).
 *
 * Body: { designerId: string, newPlanId: string, couponCode?: string }
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logSubscriptionAudit } from "@/lib/subscription-audit";
import { calculateProration, prorationDescription } from "@/lib/subscription-proration";
import { validateCoupon, redeemCoupon } from "@/lib/coupons";
import { createNotification } from "@/lib/notifications";
import { sendEmail, subscriptionPausedEmail } from "@/lib/email";
import { createInvoice, createCustomer } from "@/lib/icount";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { designerId, newPlanId, couponCode } = body as {
      designerId?: string;
      newPlanId?: string;
      couponCode?: string;
    };

    if (!designerId || !newPlanId) {
      return NextResponse.json(
        { error: "חסרים פרטים: מזהה מעצבת או תוכנית חדשה" },
        { status: 400 }
      );
    }

    const subscription = await prisma.designerSubscription.findUnique({
      where: { designerId },
      include: { plan: true },
    });

    if (!subscription) {
      return NextResponse.json({ error: "לא נמצא מנוי פעיל" }, { status: 404 });
    }

    const newPlan = await prisma.subscriptionPlan.findUnique({
      where: { id: newPlanId },
    });
    if (!newPlan || !newPlan.isActive) {
      return NextResponse.json(
        { error: "התוכנית החדשה לא נמצאה או אינה פעילה" },
        { status: 404 }
      );
    }

    if (subscription.planId === newPlanId) {
      return NextResponse.json(
        { error: "המנוי כבר משויך לתוכנית זו" },
        { status: 400 }
      );
    }

    const currentPrice = Number(subscription.plan.price);
    const newPrice = Number(newPlan.price);
    const isUpgrade = newPrice > currentPrice;
    const now = new Date();

    // Validate coupon if provided
    let couponInfo: { ok: true; couponId: string; discountType: string; discountValue: number; durationMonths: number; description: string } | null = null;
    if (couponCode) {
      const validation = await validateCoupon(couponCode, newPlanId, designerId);
      if (!validation.ok) {
        return NextResponse.json({ error: validation.reason }, { status: 400 });
      }
      couponInfo = validation;
    }

    const designer = await prisma.designer.findUnique({
      where: { id: designerId },
      select: { fullName: true, email: true, phone: true },
    });

    // ═══════════════════════════════════════════════════════
    // FLOW 1: Switch to FREE plan → immediate, no payment
    // ═══════════════════════════════════════════════════════
    if (newPrice === 0) {
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const updated = await prisma.designerSubscription.update({
        where: { id: subscription.id },
        data: {
          planId: newPlan.id,
          status: "active",
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          scheduledDowngradeAt: null,
          scheduledDowngradePlanId: null,
        },
        include: { plan: true },
      });

      if (couponInfo) {
        await redeemCoupon(couponInfo.couponId, designerId, subscription.id);
      }

      await logSubscriptionAudit({
        subscriptionId: subscription.id,
        designerId,
        action: "plan_changed",
        actorType: "designer",
        fromValue: subscription.plan.name,
        toValue: newPlan.name,
        metadata: { immediate: true, couponApplied: couponInfo?.couponId || null },
        reason: "Switched to free plan",
      });

      const message = `עברת לתוכנית ${newPlan.name}. השדרוג לתוכנית בתשלום זמין בכל עת.`;

      await createNotification({
        userId: designerId,
        type: "payment_success",
        title: "התוכנית שונתה",
        body: message,
        linkUrl: "/designer",
      });

      return NextResponse.json({
        success: true,
        type: "switch_to_free",
        message,
        subscription: updated,
      });
    }

    // ═══════════════════════════════════════════════════════
    // FLOW 2: UPGRADE to more expensive plan → charge first
    // ═══════════════════════════════════════════════════════
    if (isUpgrade) {
      const proration = calculateProration(
        currentPrice,
        newPrice,
        subscription.currentPeriodStart,
        subscription.currentPeriodEnd,
        now
      );

      // --- Payment-first: charge BEFORE switching the plan ---
      if (proration.netDueNow > 0) {
        // Ensure iCount customer exists — create one if missing
        let customerId = subscription.icountCustomerId;
        if (!customerId && designer) {
          try {
            const cust = await createCustomer({
              name: designer.fullName || designer.email || "Designer",
              email: designer.email || "",
              phone: designer.phone || undefined,
            });
            customerId = (cust as { client_id?: string }).client_id || null;
            if (customerId) {
              await prisma.designerSubscription.update({
                where: { id: subscription.id },
                data: { icountCustomerId: customerId },
              });
            }
          } catch (err) {
            console.error("[change-plan] iCount create customer error:", err);
          }
        }

        if (!customerId) {
          return NextResponse.json(
            { error: "לא הוגדר אמצעי תשלום — יש לעדכן פרטי כרטיס אשראי לפני שדרוג" },
            { status: 400 }
          );
        }

        // Charge the prorated amount via iCount
        let invoiceResult: { status?: boolean; doc_id?: string; receipt_id?: string; doc_number?: string };
        try {
          invoiceResult = await createInvoice({
            customerId,
            amount: proration.netDueNow,
            description: `שדרוג מנוי מ-${subscription.plan.name} ל-${newPlan.name} (חיוב יחסי)`,
            currency: newPlan.currency,
          }) as typeof invoiceResult;
        } catch (err) {
          console.error("[change-plan] iCount invoice error:", err);
          await prisma.subscriptionPayment.create({
            data: {
              subscriptionId: subscription.id,
              amount: proration.netDueNow,
              currency: newPlan.currency,
              status: "failed",
              failureReason: err instanceof Error ? err.message : "שגיאה בחיוב",
              paymentMethod: "proration",
            },
          });
          return NextResponse.json(
            { error: "החיוב נכשל — לא ניתן לשדרג ללא תשלום מאושר. אנא ודאי שפרטי התשלום מעודכנים." },
            { status: 402 }
          );
        }

        if (!invoiceResult.status) {
          await prisma.subscriptionPayment.create({
            data: {
              subscriptionId: subscription.id,
              amount: proration.netDueNow,
              currency: newPlan.currency,
              status: "failed",
              failureReason: "החיוב נדחה על ידי ספק הסליקה",
              paymentMethod: "proration",
            },
          });
          return NextResponse.json(
            { error: "החיוב נדחה — לא ניתן לשדרג ללא תשלום מאושר. בדקי את פרטי כרטיס האשראי." },
            { status: 402 }
          );
        }

        // Payment succeeded — record it
        await prisma.subscriptionPayment.create({
          data: {
            subscriptionId: subscription.id,
            amount: proration.netDueNow,
            currency: newPlan.currency,
            status: "succeeded",
            paymentMethod: "proration",
            icountInvoiceId: invoiceResult.doc_id || null,
            icountReceiptId: invoiceResult.receipt_id || null,
            paidAt: now,
          },
        });
      }

      // Payment confirmed (or no charge needed) — NOW switch the plan
      const updated = await prisma.designerSubscription.update({
        where: { id: subscription.id },
        data: {
          planId: newPlan.id,
          status: "active",
          currentPeriodStart: now,
          lastPaymentAt: proration.netDueNow > 0 ? now : undefined,
          lastPaymentAmount: proration.netDueNow > 0 ? proration.netDueNow : undefined,
          scheduledDowngradeAt: null,
          scheduledDowngradePlanId: null,
        },
        include: { plan: true },
      });

      if (couponInfo) {
        await redeemCoupon(couponInfo.couponId, designerId, subscription.id);
      }

      await logSubscriptionAudit({
        subscriptionId: subscription.id,
        designerId,
        action: "plan_changed",
        actorType: "designer",
        fromValue: subscription.plan.name,
        toValue: newPlan.name,
        metadata: {
          proration,
          paymentVerified: true,
          couponApplied: couponInfo?.couponId || null,
        },
        reason: "Mid-cycle upgrade — payment verified",
      });

      const description = prorationDescription(
        proration,
        subscription.plan.name,
        newPlan.name
      );

      await createNotification({
        userId: designerId,
        type: "payment_success",
        title: "המנוי שודרג",
        body: description,
        linkUrl: "/designer",
      });

      if (designer?.email) {
        await sendEmail({
          to: designer.email,
          subject: `המנוי שודרג ל־${newPlan.name}`,
          html: `<div dir="rtl"><p>שלום ${designer.fullName || ""},</p><p>${description}</p></div>`,
        });
      }

      return NextResponse.json({
        success: true,
        type: "upgrade",
        message: description,
        proration,
        subscription: updated,
      });
    }

    // ═══════════════════════════════════════════════════════
    // FLOW 3: DOWNGRADE to cheaper paid plan → schedule
    // ═══════════════════════════════════════════════════════
    const updated = await prisma.designerSubscription.update({
      where: { id: subscription.id },
      data: {
        scheduledDowngradeAt: subscription.currentPeriodEnd,
        scheduledDowngradePlanId: newPlan.id,
      },
      include: { plan: true },
    });

    if (couponInfo) {
      await redeemCoupon(couponInfo.couponId, designerId, subscription.id);
    }

    await logSubscriptionAudit({
      subscriptionId: subscription.id,
      designerId,
      action: "downgrade_scheduled",
      actorType: "designer",
      fromValue: subscription.plan.name,
      toValue: newPlan.name,
      metadata: {
        scheduledFor: subscription.currentPeriodEnd.toISOString(),
        couponApplied: couponInfo?.couponId || null,
      },
      reason: "Designer requested downgrade",
    });

    const message = `שינמוך מ־${subscription.plan.name} ל־${newPlan.name} מתוזמן ל־${subscription.currentPeriodEnd.toLocaleDateString("he-IL")}. עד אז תמשיכי ליהנות מכל יתרונות המנוי הנוכחי.`;

    await createNotification({
      userId: designerId,
      type: "downgrade_reminder",
      title: "שינמוך מתוזמן",
      body: message,
      linkUrl: "/designer",
    });

    if (designer?.email) {
      const tpl = subscriptionPausedEmail(
        designer.fullName || "",
        subscription.currentPeriodEnd
      );
      await sendEmail({
        to: designer.email,
        subject: `שינמוך תוכנית מתוזמן ל־${subscription.currentPeriodEnd.toLocaleDateString("he-IL")}`,
        html: tpl.html,
      });
    }

    return NextResponse.json({
      success: true,
      type: "downgrade_scheduled",
      message,
      scheduledFor: subscription.currentPeriodEnd,
      subscription: updated,
    });
  } catch (error) {
    console.error("[change-plan] error:", error);
    return NextResponse.json(
      { error: "שגיאה בשינוי תוכנית המנוי" },
      { status: 500 }
    );
  }
}
