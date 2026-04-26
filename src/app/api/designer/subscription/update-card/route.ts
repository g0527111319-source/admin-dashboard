export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  createCustomer,
  isMockMode,
  getOrCreatePayPage,
  generatePaymentUrl,
} from "@/lib/icount";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

/**
 * POST /api/designer/subscription/update-card
 *
 * Generates an iCount hosted PayPage URL for the designer to enter a NEW
 * credit card. iCount requires a charge to tokenize a card — we use a
 * nominal verification charge (1₪) that the designer can consider a
 * "card verification" fee. The new card token replaces the old one on
 * iCount's side automatically and is used for the next recurring charge.
 *
 * The caller must be authenticated (x-user-id header set by middleware).
 */
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    // Security: only the authenticated designer can update their own card.
    const authenticatedDesignerId = auth.userId;

    const existing = await prisma.designerSubscription.findUnique({
      where: { designerId: authenticatedDesignerId },
      include: { plan: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "אין מנוי פעיל להחלפת כרטיס" },
        { status: 404 }
      );
    }

    const designer = await prisma.designer.findUnique({
      where: { id: authenticatedDesignerId },
      select: { id: true, fullName: true, email: true, phone: true },
    });
    if (!designer) {
      return NextResponse.json({ error: "מעצבת לא נמצאה" }, { status: 404 });
    }

    // ─── Mock mode ──────────────────────────────────────
    const isMock = await isMockMode();
    if (isMock) {
      return NextResponse.json({
        success: true,
        mock: true,
        message:
          "מצב בדיקה — מערכת iCount לא מחוברת. יש להגדיר את כל פרטי iCount בהגדרות מערכת כדי לאפשר החלפת כרטיס.",
      });
    }

    // ─── Ensure a real iCount customer exists ───────────
    let icountCustomerId = existing.icountCustomerId || null;
    if (!icountCustomerId || icountCustomerId.startsWith("mock-")) {
      const customer = await createCustomer({
        name: designer.fullName || designer.email || "Designer",
        email: designer.email || "",
        phone: designer.phone || undefined,
      });
      const rawId = (customer as { client_id?: string | number }).client_id;
      icountCustomerId = rawId != null ? String(rawId) : null;
      if (icountCustomerId) {
        await prisma.designerSubscription.update({
          where: { designerId: authenticatedDesignerId },
          data: { icountCustomerId },
        });
      }
    }

    // ─── Create / reuse payment page ────────────────────
    const paypageId = await getOrCreatePayPage();
    if (!paypageId) {
      return NextResponse.json(
        { error: "לא ניתן ליצור דף תשלום ב-iCount" },
        { status: 500 }
      );
    }

    const baseUrl =
      process.env.AUTH_URL ||
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "";
    if (!baseUrl) {
      return NextResponse.json(
        { error: "לא הוגדרה כתובת בסיס לאתר" },
        { status: 500 }
      );
    }

    // Nominal verification amount — iCount requires amount > 0 to tokenize.
    // This charge verifies the card; the new token is saved on iCount's side
    // and the IPN webhook records it as a "card_verification" payment.
    const verificationAmount = 1;

    const successUrl = `${baseUrl}/designer/${authenticatedDesignerId}/subscription?card=updated`;
    const cancelUrl = `${baseUrl}/designer/${authenticatedDesignerId}/subscription?card=cancelled`;
    const ipnUrl = `${baseUrl}/api/webhooks/icount`;

    const paymentUrl = await generatePaymentUrl({
      paypageId,
      customerName: designer.fullName || designer.email || "Designer",
      email: designer.email || "",
      phone: designer.phone || undefined,
      amount: verificationAmount,
      currency: existing.plan?.currency || "ILS",
      description: "אימות כרטיס אשראי חדש — זירת האדריכלות",
      successUrl,
      cancelUrl,
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
      verificationAmount,
    });
  } catch (error) {
    console.error("[update-card] error:", error);
    const message =
      error instanceof Error ? error.message : "שגיאה ביצירת קישור החלפת כרטיס";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
