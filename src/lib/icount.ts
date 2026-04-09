/**
 * iCount API integration
 * https://api.icount.co.il/api/v3.php
 *
 * Credentials are loaded from:
 *   1. Vercel env vars (ICOUNT_API_KEY, ICOUNT_COMPANY_ID, ICOUNT_USER, ICOUNT_PASS)
 *   2. DB SystemSetting (admin settings page → icount section)
 *
 * When neither source has credentials, all functions fall back to mock mode.
 */

import { getIcountConfig, type IcountConfig } from "@/lib/icount-config";

const ICOUNT_API_BASE = "https://api.icount.co.il/api/v3.php";

function configIsMock(cfg: IcountConfig): boolean {
  return !cfg.apiKey || !cfg.companyId || !cfg.user || !cfg.pass;
}

function authPayloadFromConfig(cfg: IcountConfig) {
  return {
    cid: cfg.companyId,
    user: cfg.user,
    pass: cfg.pass,
  };
}

async function icountPost(
  path: string,
  body: Record<string, unknown>,
  cfg: IcountConfig
) {
  const res = await fetch(`${ICOUNT_API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...authPayloadFromConfig(cfg), ...body }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `[iCount] ${path} failed: ${res.status} ${JSON.stringify(data)}`
    );
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

export async function createCustomer(data: CreateCustomerInput) {
  const cfg = await getIcountConfig();
  if (configIsMock(cfg)) {
    console.log("[iCount] Mock mode - would create customer:", data);
    return { client_id: "mock-cust-" + Date.now(), status: true };
  }

  return icountPost(
    "/client/create_update",
    {
      client_name: data.name,
      email: data.email,
      hp: data.phone,
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

// ─── Invoice ────────────────────────────────────────────

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
  return icountPost("/subscription/cancel", { subscription_id: subscriptionId }, cfg);
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
  return icountPost("/subscription/charge", { subscription_id: subscriptionId }, cfg);
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
    "/client/save_token",
    { client_id: data.customerId, card_token: data.cardToken },
    cfg
  );
}

// ─── Hosted Card Form ───────────────────────────────────

/**
 * Return URL for iCount's hosted card-entry page.
 * Designer enters card details on iCount's side — we never touch the PAN.
 * Now async because it loads config from DB.
 */
export async function getHostedCardFormUrl(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const cfg = await getIcountConfig();
  if (configIsMock(cfg)) {
    return `${returnUrl}?mock=1&token=mock-${Date.now()}`;
  }
  const params = new URLSearchParams({
    cid: cfg.companyId,
    client_id: customerId,
    return_url: returnUrl,
  });
  return `https://app.icount.co.il/card-vault?${params.toString()}`;
}

// ─── Webhook ────────────────────────────────────────────

export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null
): boolean {
  const secret = process.env.ICOUNT_WEBHOOK_SECRET;
  if (!secret) {
    console.log("[iCount] No webhook secret configured — accepting webhook (dev mode)");
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
