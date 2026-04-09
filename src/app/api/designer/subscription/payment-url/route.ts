export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createCustomer, getHostedCardFormUrl, isMockMode } from "@/lib/icount";

/**
 * POST /api/designer/subscription/payment-url
 *
 * Returns a URL to iCount's hosted payment page.
 * The designer enters card details there (PCI compliant).
 * After payment, iCount redirects back to our callback.
 *
 * Body: { designerId, planId }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { designerId, planId } = body as { designerId?: string; planId?: string };

    if (!designerId || !planId) {
      return NextResponse.json(
        { error: "חסרים פרטים" },
        { status: 400 }
      );
    }

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
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
      return NextResponse.json({ error: "מעצבת לא נמצאה" }, { status: 404 });
    }

    // Get or create iCount customer
    const existing = await prisma.designerSubscription.findUnique({
      where: { designerId },
    });

    let icountCustomerId = existing?.icountCustomerId || null;
    if (!icountCustomerId) {
      const customer = await createCustomer({
        name: designer.fullName || designer.email || "Designer",
        email: designer.email || "",
        phone: designer.phone || undefined,
      });
      icountCustomerId = (customer as { client_id?: string }).client_id || null;

      // Save customer ID if subscription exists
      if (existing && icountCustomerId) {
        await prisma.designerSubscription.update({
          where: { designerId },
          data: { icountCustomerId },
        });
      }
    }

    // Check if iCount is in mock mode (reads from DB + env vars)
    const isMock = await isMockMode();

    // Build return URL
    const baseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "";
    const returnUrl = `${baseUrl}/designer/${designerId}/subscription?payment=callback&planId=${planId}`;

    if (isMock) {
      // Mock mode — return info so frontend can handle mock flow
      return NextResponse.json({
        success: true,
        mock: true,
        planName: plan.name,
        price: Number(plan.price),
        currency: plan.currency,
        message: "מצב בדיקה — מערכת iCount לא מחוברת. יש להגדיר את כל פרטי iCount בהגדרות אדמין.",
      });
    }

    // Real mode — generate iCount payment URL (now async)
    const paymentUrl = await getHostedCardFormUrl(
      icountCustomerId || "",
      returnUrl
    );

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
    return NextResponse.json(
      { error: "שגיאה ביצירת קישור תשלום" },
      { status: 500 }
    );
  }
}
