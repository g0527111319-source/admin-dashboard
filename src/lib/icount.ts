/**
 * iCount API v3 integration
 * https://api.icount.co.il/api/v3.php
 *
 * Authentication: cid / user / pass in the request body.
 * Credentials loaded from DB (admin settings) or env vars.
 *
 * Correct v3 method names:
 *   /client/create, /client/update, /client/create_or_update, /client/info
 *   /doc/create, /doc/search
 *   /paypage/create, /paypage/generate_sale, /paypage/get_list
 *
 * Payment page flow (PCI compliant):
 *   1. getOrCreatePayPage()  — creates hosted payment page (once)
 *   2. generatePaymentUrl()  — generates unique sale URL per transaction
 *   3. Customer enters card on iCount's hosted page
 *   4. iCount processes payment + redirects to success_url
 */

import { getIcountConfig, type IcountConfig } from "@/lib/icount-config";
import prisma from "@/lib/prisma";

const ICOUNT_API_BASE = "https://api.icount.co.il/api/v3.php";

/** Mock mode = missing any of the 3 required auth fields */
function configIsMock(cfg: IcountConfig): boolean {
  return !cfg.companyId || !cfg.user || !cfg.pass;
}

function authPayloadFromConfig(cfg: IcountConfig) {
  return {
    cid: cfg.companyId,
    user: cfg.user,
    pass: cfg.pass,
  };
}

/**
 * POST to iCount API v3 with cid/user/pass auth in body.
 */
async function icountPost(
  path: string,
  body: Record<string, unknown>,
  cfg: IcountConfig
): Promise<Record<string, unknown>> {
  const url = `${ICOUNT_API_BASE}${path}`;
  console.log(`[iCount] POST ${path}`);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...authPayloadFromConfig(cfg), ...body }),
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (data.status === false) {
    const reason = data.reason || data.error_description || "Unknown error";
    throw new Error(`[iCount] ${path}: ${reason} — ${JSON.stringify(data)}`);
  }

  return data;
}

// ─── Public helpers ─────────────────────────────────────

/** Check if iCount is in mock mode (no credentials configured) */
export async function isMockMode(): Promise<boolean> {
  const cfg = await getIcountConfig();
  return configIsMock(cfg);
}

// ─── Customer ───────────────────────────────────────────

export type CreateCustomerInput = {
  name: string;
  email: string;
  phone?: string;
};

/**
 * Create or update a customer in iCount.
 * v3 method: /client/create_or_update (upserts by email/HP).
 */
export async function createCustomer(data: CreateCustomerInput) {
  const cfg = await getIcountConfig();
  if (configIsMock(cfg)) {
    console.log("[iCount] Mock mode - would create customer:", data);
    return { client_id: "mock-cust-" + Date.now(), status: true };
  }

  return icountPost(
    "/client/create_or_update",
    {
      client_name: data.name,
      email: data.email,
      phone: data.phone || "",
    },
    cfg
  );
}

// ─── Subscription ───────────────────────────────────────

export type CreateSubscriptionInput = {
  customerId: string;
  amount: number;
  currency: string;
  description: string;
  frequency?: "monthly" | "yearly";
};

export async function createSubscription(data: CreateSubscriptionInput) {
  const cfg = await getIcountConfig();
  if (configIsMock(cfg)) {
    console.log("[iCount] Mock mode - would create subscription:", data);
    return {
      subscription_id: "mock-sub-" + Date.now(),
      status: true,
      next_charge_date: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
    };
  }

  return icountPost(
    "/subscription/create",
    {
      client_id: data.customerId,
      sum: data.amount,
      currency_code: data.currency,
      description: data.description,
      frequency: data.frequency || "monthly",
    },
    cfg
  );
}

// ─── Invoice / Receipt ──────────────────────────────────

export type CreateInvoiceInput = {
  customerId: string;
  amount: number;
  description: string;
  paymentMethod?: string;
  currency?: string;
};

export async function createInvoice(data: CreateInvoiceInput) {
  const cfg = await getIcountConfig();
  if (configIsMock(cfg)) {
    console.log("[iCount] Mock mode - would create invoice:", data);
    return {
      doc_id: "mock-doc-" + Date.now(),
      doc_number: "INV-" + Math.floor(Math.random() * 100000),
      receipt_id: "mock-rcpt-" + Date.now(),
      status: true,
    };
  }

  return icountPost(
    "/doc/create",
    {
      doctype: "invrec",
      client_id: data.customerId,
      currency_code: data.currency || "ILS",
      items: [
        {
          description: data.description,
          unitprice_incvat: data.amount,
          quantity: 1,
        },
      ],
      payment: data.paymentMethod
        ? [{ payment_type: data.paymentMethod, sum: data.amount }]
        : undefined,
    },
    cfg
  );
}

// ─── Cancel / Charge ────────────────────────────────────

export async function cancelSubscription(subscriptionId: string) {
  const cfg = await getIcountConfig();
  if (configIsMock(cfg)) {
    console.log("[iCount] Mock mode - would cancel subscription:", subscriptionId);
    return { status: true, cancelled: true };
  }
  return icountPost(
    "/subscription/cancel",
    { subscription_id: subscriptionId },
    cfg
  );
}

export async function chargeRecurring(subscriptionId: string) {
  const cfg = await getIcountConfig();
  if (configIsMock(cfg)) {
    console.log("[iCount] Mock mode - would charge recurring:", subscriptionId);
    return {
      status: true,
      charged: true,
      doc_id: "mock-doc-" + Date.now(),
      receipt_id: "mock-rcpt-" + Date.now(),
    };
  }
  return icountPost(
    "/subscription/charge",
    { subscription_id: subscriptionId },
    cfg
  );
}

// ─── Payment Token ──────────────────────────────────────

export type CreatePaymentTokenInput = {
  customerId: string;
  cardToken: string;
};

export async function savePaymentToken(data: CreatePaymentTokenInput) {
  const cfg = await getIcountConfig();
  if (configIsMock(cfg)) {
    console.log("[iCount] Mock mode - would save token:", data.customerId);
    return { token_id: "mock-token-" + Date.now(), status: true };
  }
  return icountPost(
    "/client/update",
    { client_id: data.customerId, card_token: data.cardToken },
    cfg
  );
}

// ─── Payment Page (Hosted Form — PCI Compliant) ─────────

const PAYPAGE_SETTING_KEY = "icount_paypage_id";

/**
 * Get or create a hosted payment page in iCount.
 * Returns paypage_id — cached in SystemSetting for reuse.
 *
 * POST /paypage/create → { paypage_id, paypage_url }
 */
export async function getOrCreatePayPage(): Promise<string | null> {
  const cfg = await getIcountConfig();
  if (configIsMock(cfg)) return null;

  // Check cache in DB
  try {
    const row = await prisma.systemSetting.findUnique({
      where: { key: PAYPAGE_SETTING_KEY },
    });
    const val = row?.value as Record<string, unknown> | null;
    if (val?.paypage_id) return String(val.paypage_id);
  } catch (e) {
    console.warn("[iCount] Error reading paypage cache:", e);
  }

  // Create new payment page
  try {
    const result = await icountPost(
      "/paypage/create",
      {
        page_name: "זירת האדריכלות - מנויים",
        currency_id: 5, // ILS
      },
      cfg
    );

    const paypageId = result?.paypage_id?.toString() || null;
    if (paypageId) {
      // Cache in DB
      const jsonVal = JSON.parse(JSON.stringify({ paypage_id: paypageId }));
      await prisma.systemSetting.upsert({
        where: { key: PAYPAGE_SETTING_KEY },
        update: { value: jsonVal },
        create: { key: PAYPAGE_SETTING_KEY, value: jsonVal },
      });
      console.log(`[iCount] Created payment page: ${paypageId}`);
    }
    return paypageId;
  } catch (e) {
    console.error("[iCount] Failed to create payment page:", e);
    return null;
  }
}

/**
 * Generate a unique hosted payment URL for a transaction.
 * Customer is redirected here to enter card details on iCount's page.
 *
 * POST /paypage/generate_sale → { sale_url }
 */
export async function generatePaymentUrl(data: {
  paypageId: string;
  customerName: string;
  email: string;
  phone?: string;
  amount: number;
  currency: string;
  description: string;
  successUrl: string;
  cancelUrl?: string;
  ipnUrl: string;
}): Promise<string> {
  const cfg = await getIcountConfig();
  if (configIsMock(cfg)) {
    return `${data.successUrl}?mock=1&token=mock-${Date.now()}`;
  }

  // Split customer name into first / last for iCount
  const nameParts = (data.customerName || "").trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  // iCount accepts several aliases for the webhook/callback URL — pass both
  // `ipn_url` (legacy) and `notify_url` (v3) to maximise compatibility across
  // account configurations.
  const result = await icountPost(
    "/paypage/generate_sale",
    {
      paypage_id: parseInt(data.paypageId),
      lang: "he",
      doc_type: "invrec",           // Invoice-receipt — required for payment pages
      ipn_url: data.ipnUrl,
      notify_url: data.ipnUrl,
      success_url: data.successUrl,
      cancel_url: data.cancelUrl || data.successUrl,
      fail_url: data.cancelUrl || data.successUrl,
      client_name: data.customerName,
      first_name: firstName,
      last_name: lastName,
      email: data.email,
      phone: data.phone || "",
      currency_code: data.currency || "ILS",
      items: [
        {
          description: data.description,
          unitprice_incl: data.amount,
          quantity: 1,
        },
      ],
      is_iframe: 0,
    },
    cfg
  );

  const saleUrl = result?.sale_url ? String(result.sale_url) : "";
  if (!saleUrl) {
    console.error("[iCount] generate_sale response:", JSON.stringify(result));
    throw new Error("iCount לא החזיר קישור תשלום");
  }

  console.log(`[iCount] Generated sale URL: ${saleUrl} | ipn=${data.ipnUrl}`);
  return saleUrl;
}

// ─── Webhook ────────────────────────────────────────────

export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null
): boolean {
  const secret = process.env.ICOUNT_WEBHOOK_SECRET;
  if (!secret) {
    // SECURITY: in production we require a secret. Dev mode skips verification
    // only for local development.
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[iCount] ICOUNT_WEBHOOK_SECRET not configured in production — rejecting webhook"
      );
      return false;
    }
    console.warn(
      "[iCount] No webhook secret configured — accepting webhook (dev mode only)"
    );
    return true;
  }
  if (!signature) return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require("crypto") as typeof import("crypto");
    const expected = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
    const expectedBuf = Buffer.from(expected);
    const signatureBuf = Buffer.from(signature);
    if (expectedBuf.length !== signatureBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  } catch {
    return false;
  }
}

// ─── Payment verification (fallback when webhook is delayed / missing) ───

/**
 * Search iCount for recent documents (invoices/receipts) for a given customer.
 * Used as a safety net: after the user returns from the hosted PayPage, we
 * verify payment directly with iCount rather than waiting for the IPN webhook.
 *
 * POST /doc/search → { docs: [{ doc_id, doc_number, sum, ... }] }
 */
export async function findRecentDocsForCustomer(
  customerId: string,
  sinceMinutes = 120
): Promise<Array<{
  doc_id: string;
  doc_number?: string;
  doc_type?: string;
  sum?: number;
  paid?: boolean;
  created?: string;
}>> {
  const cfg = await getIcountConfig();
  if (configIsMock(cfg)) return [];

  const since = new Date(Date.now() - sinceMinutes * 60 * 1000);
  const sinceStr = since.toISOString().split("T")[0]; // YYYY-MM-DD

  try {
    const result = await icountPost(
      "/doc/search",
      {
        client_id: customerId,
        date_from: sinceStr,
        limit: 10,
      },
      cfg
    );

    const docs = (result?.docs || result?.data || []) as Array<Record<string, unknown>>;
    return docs.map((d) => ({
      doc_id: String(d.doc_id || d.id || ""),
      doc_number: d.doc_number ? String(d.doc_number) : undefined,
      doc_type: d.doc_type ? String(d.doc_type) : undefined,
      sum: d.sum ? Number(d.sum) : undefined,
      paid: d.paid !== undefined ? Boolean(d.paid) : undefined,
      created: d.created ? String(d.created) : undefined,
    }));
  } catch (err) {
    console.error("[iCount] findRecentDocsForCustomer failed:", err);
    return [];
  }
}
