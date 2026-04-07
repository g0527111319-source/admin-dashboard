/**
 * iCount API integration
 * https://api.icount.co.il/api/v3.php
 *
 * All functions gracefully fall back to mock mode when env vars are missing.
 * Required env vars:
 *   ICOUNT_COMPANY_ID
 *   ICOUNT_USER
 *   ICOUNT_PASS
 *   ICOUNT_API_KEY (optional — presence toggles live vs mock mode)
 *   ICOUNT_WEBHOOK_SECRET (optional — used for webhook signature validation)
 */

const ICOUNT_API_BASE = "https://api.icount.co.il/api/v3.php";

function isMockMode(): boolean {
  return (
    !process.env.ICOUNT_API_KEY ||
    !process.env.ICOUNT_COMPANY_ID ||
    !process.env.ICOUNT_USER ||
    !process.env.ICOUNT_PASS
  );
}

function authPayload() {
  return {
    cid: process.env.ICOUNT_COMPANY_ID,
    user: process.env.ICOUNT_USER,
    pass: process.env.ICOUNT_PASS,
  };
}

async function icountPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${ICOUNT_API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...authPayload(), ...body }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`[iCount] ${path} failed: ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

export type CreateCustomerInput = {
  name: string;
  email: string;
  phone?: string;
};

export async function createCustomer(data: CreateCustomerInput) {
  if (isMockMode()) {
    console.log("[iCount] Mock mode - would create customer:", data);
    return { client_id: "mock-cust-" + Date.now(), status: true };
  }

  return icountPost("/client/create_update", {
    client_name: data.name,
    email: data.email,
    hp: data.phone,
  });
}

export type CreateSubscriptionInput = {
  customerId: string;
  amount: number;
  currency: string;
  description: string;
  /** Monthly by default */
  frequency?: "monthly" | "yearly";
};

export async function createSubscription(data: CreateSubscriptionInput) {
  if (isMockMode()) {
    console.log("[iCount] Mock mode - would create subscription:", data);
    return {
      subscription_id: "mock-sub-" + Date.now(),
      status: true,
      next_charge_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  return icountPost("/subscription/create", {
    client_id: data.customerId,
    sum: data.amount,
    currency_code: data.currency,
    description: data.description,
    frequency: data.frequency || "monthly",
  });
}

export type CreateInvoiceInput = {
  customerId: string;
  amount: number;
  description: string;
  paymentMethod?: string;
  currency?: string;
};

export async function createInvoice(data: CreateInvoiceInput) {
  if (isMockMode()) {
    console.log("[iCount] Mock mode - would create invoice:", data);
    return {
      doc_id: "mock-doc-" + Date.now(),
      doc_number: "INV-" + Math.floor(Math.random() * 100000),
      receipt_id: "mock-rcpt-" + Date.now(),
      status: true,
    };
  }

  return icountPost("/doc/create", {
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
  });
}

export async function cancelSubscription(subscriptionId: string) {
  if (isMockMode()) {
    console.log("[iCount] Mock mode - would cancel subscription:", subscriptionId);
    return { status: true, cancelled: true };
  }

  return icountPost("/subscription/cancel", {
    subscription_id: subscriptionId,
  });
}

export async function chargeRecurring(subscriptionId: string) {
  if (isMockMode()) {
    console.log("[iCount] Mock mode - would charge recurring:", subscriptionId);
    return {
      status: true,
      charged: true,
      doc_id: "mock-doc-" + Date.now(),
      receipt_id: "mock-rcpt-" + Date.now(),
    };
  }

  return icountPost("/subscription/charge", {
    subscription_id: subscriptionId,
  });
}

/**
 * Validates an iCount webhook signature.
 * If ICOUNT_WEBHOOK_SECRET is not set, accepts all requests (dev mode).
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.ICOUNT_WEBHOOK_SECRET;
  if (!secret) {
    console.log("[iCount] No webhook secret configured — accepting webhook (dev mode)");
    return true;
  }
  if (!signature) return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require("crypto") as typeof import("crypto");
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
