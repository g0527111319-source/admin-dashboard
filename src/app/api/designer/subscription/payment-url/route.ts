export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  createCustomer,
  isMockMode,
  getOrCreatePayPage,
  generatePaymentUrl,
} from "@/lib/icount";

/**
 * POST /api/designer/subscription/payment-url
 *
 * Returns a URL to iCount's hosted payment page.
 * The designer enters card details there (PCI compliant).
 *
 * Flow:
 *   1. Ensures a real iCount customer exists (replaces mock IDs)
 *   2. Gets or creates a payment page in iCount
 *   3. Generates a unique sale URL for this transaction
 *   4. Returns the URL for frontend to redirect to
 *
 * Body: { designerId, planId }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { designerId, planId } = body as {
      designerId?: string;
      planId?: string;
    };

    if (!designerId || !planId) {
      return NextResponse.json({ error: "חסרים פרטים" }, { status: 400 });
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });
    if (!plan || !plan.isActive) {
      return NextResponse.json(
        { error: "תוכנית לא נמצאה" },
        { status: 404 }
      );
    }

    const designer = await prisma.designer.findUnique({
      where: { id: designerId },
      select: { id: true, fullName: true, email: true, phone: true },
    });
    if (!designer) {
      return NextResponse.json(
        { error: "מעצבת לא נמצאה" },
        { status: 404 }
      );
    }

    // ─── Check mock mode ────────────────────────────────
    const isMock = await isMockMode();

    if (isMock) {
      return NextResponse.json({
        success: true,
        mock: true,
        planName: plan.name,
        price: Number(plan.price),
        currency: plan.currency,
        message:
          "מצב בדיקה — מערכת iCount לא מחוברת. יש להגדיר את כל פרטי iCount בהגדרות מערכת.",
      });
    }

    // ─── Real mode — ensure real iCount customer ────────
    const existing = await prisma.designerSubscription.findUnique({
      where: { designerId },
    });

    let icountCustomerId = existing?.icountCustomerId || null;

    // If customer ID is mock or missing, create a real one
    if (!icountCustomerId || icountCustomerId.startsWith("mock-")) {
      console.log(
        `[payment-url] Creating real iCount customer for ${designerId} (was: ${icountCustomerId})`
      );
      const customer = await createCustomer({
        name: designer.fullName || designer.email || "Designer",
        email: designer.email || "",
        phone: designer.phone || undefined,
      });
      icountCustomerId =
        (customer as { client_id?: string }).client_id || null;

      // Save the real customer ID
      if (existing && icountCustomerId) {
        await prisma.designerSubscription.update({
          where: { designerId },
          data: { icountCustomerId },
        });
      }
    }

    // ─── Get or create payment page ─────────────────────
    const paypageId = await getOrCreatePayPage();
    if (!paypageId) {
      return NextResponse.json(
        {
          error:
            "לא ניתן ליצור דף תשלום ב-iCount. אנא בדקו את פרטי החיבור בהגדרות מערכת.",
        },
        { status: 500 }
      );
    }

    // ─── Generate unique payment URL ────────────────────
    const baseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "";
    const successUrl = `${baseUrl}/designer/${designerId}/subscription?payment=callback&planId=${planId}`;
    const ipnUrl = `${baseUrl}/api/webhooks/icount`;

    const paymentUrl = await generatePaymentUrl({
      paypageId,
      customerName: designer.fullName || designer.email || "Designer",
      email: designer.email || "",
      phone: designer.phone || undefined,
      amount: Number(plan.price),
      currency: plan.currency,
      description: `מנוי ${plan.name} — זירת האדריכלות`,
      successUrl,
      ipnUrl,
    });

    if (!paymentUrl) {
      return NextResponse.json(
        { error: "לא התקבל קישור תשלום מ-iCount" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      mock: false,
      paymentUrl,
      planName: plan.name,
      price: Number(plan.price),
      currency: plan.currency,
    });
  } catch (error) {
    console.error("[payment-url] error:", error);
    const message =
      error instanceof Error ? error.message : "שגיאה ביצירת קישור תשלום";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
