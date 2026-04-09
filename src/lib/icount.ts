/**
 * iCount API v3 integration
 * https://api.icount.co.il/api/v3.php
 *
 * Authentication: Bearer token (API Key) in Authorization header.
 * The API key is loaded from DB (admin settings) or env vars.
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
 *   4. iCount sends IPN callback + redirects to success_url
 */

import { getIcountConfig, type IcountConfig } from "@/lib/icount-config";
import prisma from "@/lib/prisma";

const ICOUNT_API_BASE = "https://api.icount.co.il/api/v3.php";

/** Mock mode = no API key configured */
function configIsMock(cfg: IcountConfig): boolean {
  return !cfg.apiKey;
}

/**
 * POST to iCount API v3 with Bearer token auth.
 * All v3 endpoints use Authorization: Bearer {apiKey}.
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
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (data.status === false) {
    const reason = data.reason || data.error_description || "Unknown error";
    throw new Error(`[iCount] ${path}: ${reason} — ${JSON.stringify(data)}`);
  }

  return data;
}

// ─── Public helpers ─────────────────────────────────────

/** Check if iCount is in mock mode (no API key configured) */
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
 * Uses /client/create_or_update (upserts by email/HP).
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
 * After payment:
 *   - iCount sends IPN callback to ipnUrl
 *   - Customer is redirected to successUrl
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
  ipnUrl: string;
}): Promise<string> {
  const cfg = await getIcountConfig();
  if (configIsMock(cfg)) {
    return `${data.successUrl}?mock=1&token=mock-${Date.now()}`;
  }

  const payload = {
    paypage_id: parseInt(data.paypageId),
    lang: "he",
    ipn_url: data.ipnUrl,
    client_name: data.customerName,
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
    success_url: data.successUrl,
  };

  // Try the generic endpoint first, then WooCommerce variant
  const endpoints = ["/paypage/generate_sale", "/woocommerce/generate_sale"];

  for (const endpoint of endpoints) {
    try {
      const result = await icountPost(endpoint, payload, cfg);
      if (result?.sale_url) {
        console.log(`[iCount] Generated sale URL via ${endpoint}`);
        return String(result.sale_url);
      }
    } catch (e) {
      console.warn(`[iCount] ${endpoint} failed:`, e);
    }
  }

  throw new Error(
    "לא ניתן ליצור דף תשלום ב-iCount. יש לוודא שפרטי החיבור נכונים בהגדרות מערכת."
  );
}

// ─── Webhook ────────────────────────────────────────────

export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null
): boolean {
  const secret = process.env.ICOUNT_WEBHOOK_SECRET;
  if (!secret) {
    console.log(
      "[iCount] No webhook secret configured — accepting webhook (dev mode)"
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
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}
