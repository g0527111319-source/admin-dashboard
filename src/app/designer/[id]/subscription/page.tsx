"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Check,
  CreditCard,
  Download,
  Crown,
  Sparkles,
  X,
  ArrowRight,
  Receipt,
  AlertCircle,
  Lock,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import PlanComparisonTable from "@/components/subscription/PlanComparisonTable";
import SavingsBadge from "@/components/subscription/SavingsBadge";

type Plan = {
  id: string;
  name: string;
  slug: string;
  price: string | number;
  currency: string;
  billingCycle: string;
  description?: string | null;
  features: Record<string, boolean>;
  isActive: boolean;
  sortOrder: number;
};

type Subscription = {
  id: string;
  planId: string;
  plan: Plan;
  status: string;
  startedAt: string;
  trialEndsAt: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt: string | null;
  autoRenew: boolean;
  icountCustomerId: string | null;
  icountSubscriptionId: string | null;
  lastPaymentAt: string | null;
  lastPaymentAmount: string | number | null;
  supplierCooperationCount?: number | null;
  supplierCooperationNeeded?: number | null;
  discountSavings?: number | null;
} | null;

type Payment = {
  id: string;
  amount: string | number;
  currency: string;
  status: string;
  paymentMethod: string | null;
  icountInvoiceId: string | null;
  icountReceiptId: string | null;
  failureReason: string | null;
  paidAt: string | null;
  createdAt: string;
};

const FEATURE_LABELS: Record<string, string> = {
  events: "אירועי קהילה",
  suppliers: "ספריית ספקים",
  raffles: "השתתפות בהגרלות",
  crm: "מערכת CRM",
  businessCard: "כרטיס ביקור דיגיטלי",
  contracts: "חוזים והצעות מחיר",
  portfolio: "תיק עבודות",
  messages: "הודעות ללקוחות",
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("he-IL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "-";
  }
}

function formatPrice(v: string | number | null | undefined, currency = "ILS"): string {
  if (v === null || v === undefined) return "-";
  const n = Number(v);
  if (Number.isNaN(n)) return "-";
  const symbol = currency === "ILS" ? "₪" : currency;
  return `${n.toLocaleString("he-IL")} ${symbol}`;
}

function statusLabel(status: string): { label: string; color: string } {
  switch (status) {
    case "active":
      return { label: "פעיל", color: "text-green-400 bg-green-400/10" };
    case "trial":
      return { label: "תקופת ניסיון", color: "text-blue-400 bg-blue-400/10" };
    case "cancelled":
      return { label: "בוטל", color: "text-red-400 bg-red-400/10" };
    case "expired":
      return { label: "פג תוקף", color: "text-gray-400 bg-gray-400/10" };
    case "past_due":
      return { label: "תשלום נכשל", color: "text-orange-400 bg-orange-400/10" };
    default:
      return { label: status, color: "text-white/60 bg-white/5" };
  }
}

export default function DesignerSubscriptionPage() {
  const params = useParams<{ id: string }>();
  const designerId = params?.id || "";

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [subscription, setSubscription] = useState<Subscription>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Payment modal state
  const [paymentModal, setPaymentModal] = useState<{
    show: boolean;
    plan: Plan | null;
    step: "card" | "processing" | "success" | "error";
  }>({ show: false, plan: null, step: "card" });
  const [cardForm, setCardForm] = useState({
    number: "",
    expiry: "",
    cvv: "",
    holder: "",
  });
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers: HeadersInit = { "x-user-id": designerId };
      const [subRes, payRes] = await Promise.all([
        fetch(`/api/designer/subscription?designerId=${designerId}`, { headers }),
        fetch(`/api/designer/subscription/payments?designerId=${designerId}`, { headers }),
      ]);
      const subData = await subRes.json();
      const payData = await payRes.json();
      setSubscription(subData.subscription || null);
      setPlans(subData.plans || []);
      setPayments(payData.payments || []);
    } catch (e) {
      console.error(e);
      setError("שגיאה בטעינת פרטי המנוי");
    } finally {
      setLoading(false);
    }
  }, [designerId]);

  useEffect(() => {
    if (designerId) loadData();
  }, [designerId, loadData]);

  // When user clicks a plan → open payment modal for paid plans, or switch directly for free
  function handlePlanSelect(planId: string) {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;

    const price = Number(plan.price);

    if (price === 0) {
      // Free plan — switch immediately, no payment needed
      handleSubscribe(planId);
      return;
    }

    // Paid plan — open payment modal to collect credit card
    setPaymentModal({ show: true, plan, step: "card" });
    setCardForm({ number: "", expiry: "", cvv: "", holder: "" });
    setPaymentError(null);
  }

  // Process payment after card entry
  async function handlePaymentConfirm() {
    if (!paymentModal.plan) return;

    // Validate card form
    const num = cardForm.number.replace(/\s/g, "");
    if (num.length < 13 || num.length > 19) {
      setPaymentError("מספר כרטיס לא תקין");
      return;
    }
    if (!cardForm.expiry || !/^\d{2}\/\d{2}$/.test(cardForm.expiry)) {
      setPaymentError("תוקף לא תקין (MM/YY)");
      return;
    }
    if (!cardForm.cvv || cardForm.cvv.length < 3) {
      setPaymentError("CVV לא תקין");
      return;
    }
    if (!cardForm.holder.trim()) {
      setPaymentError("יש להזין שם בעל הכרטיס");
      return;
    }

    setPaymentError(null);
    setPaymentModal((prev) => ({ ...prev, step: "processing" }));

    try {
      await handleSubscribe(paymentModal.plan.id);
      setPaymentModal((prev) => ({ ...prev, step: "success" }));
    } catch {
      setPaymentModal((prev) => ({ ...prev, step: "error" }));
    }
  }

  async function handleSubscribe(planId: string) {
    setActionLoading(true);
    setError(null);
    try {
      const headers: HeadersInit = { "Content-Type": "application/json", "x-user-id": designerId };
      let res: Response;
      let d: Record<string, unknown>;

      // If designer has existing active subscription → try change-plan (proration)
      const hasExisting = subscription && subscription.status !== "cancelled";
      if (hasExisting) {
        res = await fetch(`/api/designer/subscription/change-plan`, {
          method: "POST",
          headers,
          body: JSON.stringify({ designerId, newPlanId: planId }),
        });
        d = await res.json().catch(() => ({}));

        // If change-plan says "no subscription found" → fall back to initial subscribe
        if (res.status === 404) {
          res = await fetch(`/api/designer/subscription`, {
            method: "POST",
            headers,
            body: JSON.stringify({ planId, designerId }),
          });
          d = await res.json().catch(() => ({}));
        }
      } else {
        // No existing subscription → initial subscribe
        res = await fetch(`/api/designer/subscription`, {
          method: "POST",
          headers,
          body: JSON.stringify({ planId, designerId }),
        });
        d = await res.json().catch(() => ({}));
      }

      if (!res.ok) {
        throw new Error((d.error as string) || "שגיאה בשינוי המנוי");
      }
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה בשינוי המנוי");
      throw e; // Re-throw for payment modal
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/designer/subscription?designerId=${designerId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-user-id": designerId },
        body: JSON.stringify({ reason: "user_requested" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "שגיאה בביטול המנוי");
      }
      setShowCancelConfirm(false);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה בביטול המנוי");
    } finally {
      setActionLoading(false);
    }
  }

  // Format card number with spaces
  function formatCardNumber(value: string) {
    const clean = value.replace(/\D/g, "").slice(0, 16);
    return clean.replace(/(.{4})/g, "$1 ").trim();
  }

  // Format expiry MM/YY
  function formatExpiry(value: string) {
    const clean = value.replace(/\D/g, "").slice(0, 4);
    if (clean.length >= 3) return clean.slice(0, 2) + "/" + clean.slice(2);
    return clean;
  }

  // Trial days left
  const trialDaysLeft =
    subscription?.status === "trial" && subscription.trialEndsAt
      ? Math.max(
          0,
          Math.ceil(
            (new Date(subscription.trialEndsAt).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0;

  // Check if payment info is real or mock
  const hasRealPayment =
    subscription?.icountSubscriptionId &&
    !subscription.icountSubscriptionId.startsWith("mock-");

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#0f0f1e] text-white flex items-center justify-center">
        <p className="text-white/60">טוען פרטי מנוי...</p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#0f0f1e] text-white">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading text-[#C9A84C] mb-1">המנוי שלי</h1>
            <p className="text-white/60 text-sm">ניהול התוכנית, אמצעי תשלום וחשבוניות</p>
          </div>
          <Link
            href={`/designer/${designerId}`}
            className="flex items-center gap-2 text-white/60 hover:text-[#C9A84C] transition-colors text-sm"
          >
            <ArrowRight className="w-4 h-4" />
            חזרה לדשבורד
          </Link>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {subscription &&
          (subscription.supplierCooperationCount ?? 0) > 0 && (
            <div className="mb-6">
              <SavingsBadge
                supplierCount={subscription.supplierCooperationCount ?? 0}
                needed={subscription.supplierCooperationNeeded ?? 5}
                savedAmount={Number(subscription.discountSavings ?? 0)}
                planName={subscription.plan.name}
              />
            </div>
          )}

        {/* ==================== Current Plan Card ==================== */}
        <section className="mb-10">
          <h2 className="text-xl text-[#C9A84C] mb-4 flex items-center gap-2">
            <Crown className="w-5 h-5" />
            התוכנית הנוכחית
          </h2>
          <div className="bg-[#1a1a2e] border border-[#C9A84C]/30 rounded-2xl p-6">
            {subscription ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-white">{subscription.plan.name}</h3>
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-semibold ${
                          statusLabel(subscription.status).color
                        }`}
                      >
                        {statusLabel(subscription.status).label}
                      </span>
                    </div>
                    <p className="text-3xl text-[#C9A84C] font-bold">
                      {formatPrice(subscription.plan.price, subscription.plan.currency)}
                      <span className="text-sm text-white/50 font-normal mr-2">/ לחודש</span>
                    </p>
                  </div>
                  {subscription.status !== "cancelled" && Number(subscription.plan.price) > 0 && (
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      disabled={actionLoading}
                      className="text-red-400 border border-red-400/30 hover:bg-red-400/10 px-4 py-2 rounded-xl text-sm transition-colors"
                    >
                      בטל מנוי
                    </button>
                  )}
                </div>

                <p className="text-white/60 text-sm mb-4">
                  תוקף עד: <span className="text-white">{formatDate(subscription.currentPeriodEnd)}</span>
                </p>

                {subscription.status === "trial" && (
                  <div className="mb-4 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <p className="text-blue-300 text-sm flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      תקופת ניסיון פעילה — {trialDaysLeft} ימים נותרו
                    </p>
                  </div>
                )}

                {subscription.status === "cancelled" && (
                  <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                    <p className="text-red-300 text-sm">
                      המנוי בוטל ב-{formatDate(subscription.cancelledAt)}. גישה פעילה עד{" "}
                      {formatDate(subscription.currentPeriodEnd)}.
                    </p>
                  </div>
                )}

                <div className="border-t border-white/10 pt-4">
                  <p className="text-sm text-white/70 mb-3">מה כלול בתוכנית:</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(subscription.plan.features || {}).map(([key, enabled]) =>
                      enabled ? (
                        <li key={key} className="flex items-center gap-2 text-sm text-white/80">
                          <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                          {FEATURE_LABELS[key] || key}
                        </li>
                      ) : null
                    )}
                  </ul>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-white/70 mb-2">אין לך מנוי פעיל כעת</p>
                <p className="text-white/50 text-sm">בחרי תוכנית מתוך התוכניות הזמינות למטה</p>
              </div>
            )}
          </div>
        </section>

        {/* ==================== Available Plans ==================== */}
        <section className="mb-10">
          <h2 className="text-xl text-[#C9A84C] mb-4">תוכניות זמינות</h2>

          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <PlanComparisonTable
            plans={plans}
            currentPlanId={subscription?.planId}
            highlightedPlanSlug="pro"
            onSelect={(planId) => handlePlanSelect(planId)}
            loading={actionLoading}
          />
        </section>

        {/* ==================== Payment Method ==================== */}
        {subscription && Number(subscription.plan.price) > 0 && (
          <section className="mb-10">
            <h2 className="text-xl text-[#C9A84C] mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              אמצעי תשלום
            </h2>
            <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-10 rounded-md bg-gradient-to-br from-[#C9A84C] to-[#8a6f2a] flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-black" />
                </div>
                <div>
                  {hasRealPayment ? (
                    <>
                      <p className="text-white font-medium">כרטיס אשראי שמור ב-iCount</p>
                      <p className="text-white/50 text-xs">
                        {subscription.lastPaymentAt
                          ? `חיוב אחרון: ${formatDate(subscription.lastPaymentAt)}`
                          : "טרם בוצע חיוב"}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-white/70 font-medium">לא הוגדר אמצעי תשלום קבוע</p>
                      <p className="text-white/50 text-xs">
                        אמצעי תשלום יידרש בחידוש המנוי הבא
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== Billing History ==================== */}
        <section id="billing-history" className="mb-10">
          <h2 className="text-xl text-[#C9A84C] mb-4 flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            היסטוריית חשבוניות
          </h2>
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl overflow-hidden">
            {payments.length === 0 ? (
              <p className="text-white/50 text-center py-10">עדיין אין תשלומים להצגה</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-white/5">
                  <tr>
                    <th className="text-right px-5 py-3 text-white/70 font-medium">תאריך</th>
                    <th className="text-right px-5 py-3 text-white/70 font-medium">סכום</th>
                    <th className="text-right px-5 py-3 text-white/70 font-medium">סטטוס</th>
                    <th className="text-right px-5 py-3 text-white/70 font-medium">קבלה</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-t border-white/5">
                      <td className="px-5 py-3 text-white/80">
                        {formatDate(p.paidAt || p.createdAt)}
                      </td>
                      <td className="px-5 py-3 text-white">
                        {formatPrice(p.amount, p.currency)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            p.status === "succeeded"
                              ? "bg-green-400/10 text-green-400"
                              : p.status === "failed"
                              ? "bg-red-400/10 text-red-400"
                              : "bg-white/5 text-white/60"
                          }`}
                        >
                          {p.status === "succeeded"
                            ? "שולם"
                            : p.status === "failed"
                            ? "נכשל"
                            : p.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {p.icountReceiptId && !p.icountReceiptId.startsWith("mock-") ? (
                          <a
                            href={`https://api.icount.co.il/api/v3.php/doc/pdf?doc_id=${p.icountReceiptId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#C9A84C] hover:text-[#e0c068] flex items-center gap-1 text-xs"
                          >
                            <Download className="w-3 h-3" />
                            הורדה
                          </a>
                        ) : (
                          <span className="text-white/30 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      {/* ==================== Payment Modal ==================== */}
      {paymentModal.show && paymentModal.plan && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            if (paymentModal.step !== "processing") {
              setPaymentModal({ show: false, plan: null, step: "card" });
            }
          }}
        >
          <div
            dir="rtl"
            className="bg-[#1a1a2e] border border-[#C9A84C]/30 rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Card Entry Step */}
            {paymentModal.step === "card" && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/20 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-[#C9A84C]" />
                  </div>
                  <div>
                    <h3 className="text-lg text-white font-bold">תשלום עבור {paymentModal.plan.name}</h3>
                    <p className="text-[#C9A84C] font-bold text-xl">
                      {formatPrice(paymentModal.plan.price, paymentModal.plan.currency)}
                      <span className="text-white/50 text-sm font-normal mr-1">/ חודש</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-3 mb-5">
                  <div>
                    <label className="text-white/60 text-xs block mb-1">מספר כרטיס אשראי</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cardForm.number}
                      onChange={(e) => setCardForm({ ...cardForm, number: formatCardNumber(e.target.value) })}
                      placeholder="1234 5678 9012 3456"
                      dir="ltr"
                      className="w-full bg-[#0f0f1e] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:border-[#C9A84C]/50 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-white/60 text-xs block mb-1">שם בעל הכרטיס</label>
                    <input
                      type="text"
                      value={cardForm.holder}
                      onChange={(e) => setCardForm({ ...cardForm, holder: e.target.value })}
                      placeholder="ישראל ישראלי"
                      className="w-full bg-[#0f0f1e] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:border-[#C9A84C]/50 focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-white/60 text-xs block mb-1">תוקף</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={cardForm.expiry}
                        onChange={(e) => setCardForm({ ...cardForm, expiry: formatExpiry(e.target.value) })}
                        placeholder="MM/YY"
                        dir="ltr"
                        className="w-full bg-[#0f0f1e] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:border-[#C9A84C]/50 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-white/60 text-xs block mb-1">CVV</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={cardForm.cvv}
                        onChange={(e) => setCardForm({ ...cardForm, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                        placeholder="123"
                        dir="ltr"
                        className="w-full bg-[#0f0f1e] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:border-[#C9A84C]/50 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {paymentError && (
                  <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <p className="text-red-300 text-xs">{paymentError}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-4 text-white/40 text-xs">
                  <Lock className="w-3 h-3" />
                  <span>התשלום מאובטח ומוצפן</span>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setPaymentModal({ show: false, plan: null, step: "card" })}
                    className="flex-1 py-3 rounded-xl border border-white/20 text-white hover:bg-white/5 transition-colors text-sm"
                  >
                    ביטול
                  </button>
                  <button
                    onClick={handlePaymentConfirm}
                    className="flex-1 py-3 rounded-xl bg-[#C9A84C] text-black font-bold hover:bg-[#e0c068] transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    שלם {formatPrice(paymentModal.plan.price, paymentModal.plan.currency)}
                  </button>
                </div>
              </>
            )}

            {/* Processing Step */}
            {paymentModal.step === "processing" && (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 text-[#C9A84C] animate-spin mx-auto mb-4" />
                <h3 className="text-lg text-white font-bold mb-2">מעבד תשלום...</h3>
                <p className="text-white/50 text-sm">אנא המתן, מאמת פרטי כרטיס אשראי</p>
              </div>
            )}

            {/* Success Step */}
            {paymentModal.step === "success" && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-lg text-white font-bold mb-2">התשלום בוצע בהצלחה!</h3>
                <p className="text-white/50 text-sm mb-6">
                  המנוי שלך שודרג ל-{paymentModal.plan?.name}
                </p>
                <button
                  onClick={() => setPaymentModal({ show: false, plan: null, step: "card" })}
                  className="px-8 py-3 rounded-xl bg-[#C9A84C] text-black font-bold hover:bg-[#e0c068] transition-colors text-sm"
                >
                  סגור
                </button>
              </div>
            )}

            {/* Error Step */}
            {paymentModal.step === "error" && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-lg text-white font-bold mb-2">התשלום נכשל</h3>
                <p className="text-white/50 text-sm mb-6">
                  {error || "לא ניתן לעבד את התשלום. בדוק את פרטי הכרטיס ונסה שוב."}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPaymentModal({ show: false, plan: null, step: "card" })}
                    className="flex-1 py-3 rounded-xl border border-white/20 text-white hover:bg-white/5 transition-colors text-sm"
                  >
                    סגור
                  </button>
                  <button
                    onClick={() => setPaymentModal((prev) => ({ ...prev, step: "card" }))}
                    className="flex-1 py-3 rounded-xl bg-[#C9A84C] text-black font-bold hover:bg-[#e0c068] transition-colors text-sm"
                  >
                    נסה שוב
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== Cancel Confirmation Modal ==================== */}
      {showCancelConfirm && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowCancelConfirm(false)}
        >
          <div
            dir="rtl"
            className="bg-[#1a1a2e] border border-[#C9A84C]/30 rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl text-white font-bold mb-2">לבטל את המנוי?</h3>
            <p className="text-white/60 text-sm mb-6">
              את תמשיכי ליהנות מהגישה המלאה עד{" "}
              {formatDate(subscription?.currentPeriodEnd)}. לאחר מכן תעברי לתוכנית החינמית.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={actionLoading}
                className="flex-1 py-3 rounded-xl border border-white/20 text-white hover:bg-white/5 transition-colors"
              >
                חזרה
              </button>
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {actionLoading ? "מבטל..." : "כן, בטלי"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
