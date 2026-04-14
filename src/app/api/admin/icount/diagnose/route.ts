export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getIcountConfig } from "@/lib/icount-config";
import { isMockMode } from "@/lib/icount";

/**
 * GET /api/admin/icount/diagnose
 *
 * Admin-only diagnostics for the iCount integration.
 * Returns:
 *   - whether credentials are configured
 *   - the IPN webhook URL that will be passed to iCount on paypage generate_sale
 *   - whether ICOUNT_WEBHOOK_SECRET is set
 *   - count of recent webhook-originated payment records (by icountEventId presence)
 *   - last N subscription payments for sanity check
 *
 * Admins must use this page's findings together with the iCount admin console
 * to confirm the webhook URL is registered correctly on iCount's side.
 */
export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "admin") {
      return NextResponse.json({ error: "לא מורשה" }, { status: 403 });
    }

    const cfg = await getIcountConfig();
    const mock = await isMockMode();

    const baseUrl =
      process.env.AUTH_URL ||
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      null;

    const ipnUrl = baseUrl ? `${baseUrl}/api/webhooks/icount` : null;
    const webhookSecretSet = !!process.env.ICOUNT_WEBHOOK_SECRET;

    // Count webhook-originated payment records (those with icountEventId)
    const webhookPayments = await prisma.subscriptionPayment.count({
      where: { icountEventId: { not: null } },
    });

    // Last 10 subscription payments across the system
    const recentPayments = await prisma.subscriptionPayment.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        subscriptionId: true,
        amount: true,
        status: true,
        paymentMethod: true,
        icountInvoiceId: true,
        icountReceiptId: true,
        icountEventId: true,
        failureReason: true,
        paidAt: true,
        createdAt: true,
      },
    });

    const issues: string[] = [];
    if (mock) {
      issues.push(
        "מצב בדיקה — חסרים פרטי התחברות ל-iCount (cid / user / pass)"
      );
    }
    if (!baseUrl) {
      issues.push(
        "לא הוגדרה כתובת בסיס לאתר (AUTH_URL / NEXTAUTH_URL / NEXT_PUBLIC_APP_URL). iCount לא יוכל לשלוח webhook חזרה לאתר."
      );
    }
    if (!webhookSecretSet && process.env.NODE_ENV === "production") {
      issues.push(
        "ICOUNT_WEBHOOK_SECRET לא מוגדר בפרודקשן — כל בקשות webhook מ-iCount ידחו"
      );
    }
    if (webhookPayments === 0 && recentPayments.some((p) => p.status === "succeeded")) {
      issues.push(
        "קיימים תשלומים מוצלחים אך אף אחד לא נרשם דרך webhook מ-iCount. ייתכן שה-IPN לא מוגדר נכון בצד של iCount או שכתובת ה-IPN לא נגישה לאינטרנט."
      );
    }

    return NextResponse.json({
      icount: {
        connected: !mock,
        hasCompanyId: !!cfg.companyId,
        hasUser: !!cfg.user,
        hasPass: !!cfg.pass,
        hasApiKey: !!cfg.apiKey,
      },
      webhook: {
        ipnUrl,
        webhookSecretSet,
        totalWebhookReceipts: webhookPayments,
        note: ipnUrl
          ? "ודאו שכתובת ה-IPN הזו רשומה גם בהגדרות iCount (Notifications / Webhooks) וניתנת לגישה מהאינטרנט"
          : "אין כתובת בסיס — יש להגדיר AUTH_URL במערכת",
      },
      recentPayments,
      issues,
    });
  } catch (error) {
    console.error("[icount/diagnose] error:", error);
    return NextResponse.json(
      { error: "שגיאה באבחון iCount" },
      { status: 500 }
    );
  }
}
