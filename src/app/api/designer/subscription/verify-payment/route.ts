export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { findRecentDocsForCustomer, isMockMode } from "@/lib/icount";
import { handlePaymentSuccess } from "@/lib/subscription-dunning";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

/**
 * POST /api/designer/subscription/verify-payment
 *
 * Safety net for when the iCount IPN webhook is delayed, misconfigured, or
 * blocked. When the designer returns from the hosted PayPage to
 * /subscription?payment=callback, the frontend calls this endpoint which
 * queries iCount directly for recent docs on the designer's customer ID. If
 * a matching paid doc is found and the subscription hasn't been activated
 * yet (webhook didn't arrive), we record the payment and activate here.
 *
 * Body: { planId? }
 */
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    if (await isMockMode()) {
      return NextResponse.json({
        verified: false,
        reason: "mock_mode",
        message: "iCount לא מחובר — לא ניתן לאמת תשלום",
      });
    }

    const subscription = await prisma.designerSubscription.findUnique({
      where: { designerId },
      include: { plan: true },
    });
    if (!subscription || !subscription.icountCustomerId) {
      return NextResponse.json({
        verified: false,
        reason: "no_customer",
      });
    }

    // Query iCount for recent docs on this customer (last 2 hours)
    const docs = await findRecentDocsForCustomer(
      subscription.icountCustomerId,
      120
    );

    if (docs.length === 0) {
      return NextResponse.json({
        verified: false,
        reason: "no_recent_docs",
        customerId: subscription.icountCustomerId,
      });
    }

    // Look for a paid doc that hasn't been recorded yet
    const expectedAmount = Number(subscription.plan.price);
    const paidDoc = docs.find((d) => {
      const sum = d.sum || 0;
      const isPaid = d.paid === undefined ? true : d.paid;
      // Accept if amount matches expected plan price (within 1₪ tolerance)
      return isPaid && Math.abs(sum - expectedAmount) < 1;
    });

    if (!paidDoc) {
      return NextResponse.json({
        verified: false,
        reason: "no_matching_paid_doc",
        foundDocs: docs.length,
      });
    }

    // Idempotency: skip if we already recorded this doc
    const already = await prisma.subscriptionPayment.findFirst({
      where: {
        subscriptionId: subscription.id,
        icountInvoiceId: paidDoc.doc_id,
      },
    });
    if (already) {
      return NextResponse.json({
        verified: true,
        alreadyRecorded: true,
        docId: paidDoc.doc_id,
      });
    }

    // Activate subscription + record payment (same flow as webhook)
    await handlePaymentSuccess(
      subscription.id,
      expectedAmount,
      paidDoc.doc_id,
      undefined,
      `verify-${paidDoc.doc_id}` // unique eventId so idempotency key works
    );

    return NextResponse.json({
      verified: true,
      activated: true,
      docId: paidDoc.doc_id,
      amount: expectedAmount,
    });
  } catch (error) {
    console.error("[verify-payment] error:", error);
    return NextResponse.json(
      { error: "שגיאה באימות תשלום" },
      { status: 500 }
    );
  }
}
