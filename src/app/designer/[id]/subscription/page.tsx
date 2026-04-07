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
} from "lucide-react";

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

  async function handleSubscribe(planId: string) {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/designer/subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": designerId },
        body: JSON.stringify({ planId, designerId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "שגיאה ביצירת המנוי");
      }
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה ביצירת המנוי");
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

  // Identify "recommended" plan — the first active paid plan with slug 'pro'
  const recommendedPlanId = plans.find((p) => p.slug === "pro")?.id;

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {plans.map((plan) => {
              const isCurrent = subscription?.planId === plan.id;
              const isRecommended = plan.id === recommendedPlanId;
              return (
                <div
                  key={plan.id}
                  className={`relative bg-[#1a1a2e] border rounded-2xl p-6 flex flex-col ${
                    isCurrent
                      ? "border-[#C9A84C] shadow-lg shadow-[#C9A84C]/20"
                      : "border-white/10"
                  }`}
                >
                  {isRecommended && !isCurrent && (
                    <span className="absolute -top-3 right-4 bg-[#C9A84C] text-black text-xs font-bold px-3 py-1 rounded-full">
                      מומלץ
                    </span>
                  )}
                  {isCurrent && (
                    <span className="absolute -top-3 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      תוכנית נוכחית
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-white/50 text-xs mb-4 min-h-[2.5rem]">
                    {plan.description || ""}
                  </p>
                  <p className="text-3xl font-bold text-[#C9A84C] mb-4">
                    {formatPrice(plan.price, plan.currency)}
                    <span className="text-xs text-white/50 font-normal mr-1">/ חודש</span>
                  </p>
                  <ul className="space-y-2 mb-6 flex-1">
                    {Object.entries(plan.features || {}).map(([key, enabled]) => (
                      <li
                        key={key}
                        className={`flex items-center gap-2 text-sm ${
                          enabled ? "text-white/80" : "text-white/30 line-through"
                        }`}
                      >
                        {enabled ? (
                          <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-white/30 flex-shrink-0" />
                        )}
                        {FEATURE_LABELS[key] || key}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={actionLoading || isCurrent}
                    className={`w-full py-3 rounded-xl font-semibold transition-colors ${
                      isCurrent
                        ? "bg-white/5 text-white/40 cursor-not-allowed"
                        : "bg-[#C9A84C] text-black hover:bg-[#e0c068]"
                    }`}
                  >
                    {isCurrent ? "התוכנית שלך" : "בחרי תוכנית"}
                  </button>
                </div>
              );
            })}
          </div>
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
                  <p className="text-white font-medium">
                    {subscription.icountSubscriptionId
                      ? "כרטיס אשראי שמור ב-iCount"
                      : "לא הוגדר אמצעי תשלום"}
                  </p>
                  <p className="text-white/50 text-xs">
                    {subscription.lastPaymentAt
                      ? `חיוב אחרון: ${formatDate(subscription.lastPaymentAt)}`
                      : "טרם בוצע חיוב"}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="text-[#C9A84C] border border-[#C9A84C]/40 hover:bg-[#C9A84C]/10 px-4 py-2 rounded-xl text-sm transition-colors">
                  עדכן אמצעי תשלום
                </button>
                <a
                  href="#billing-history"
                  className="text-white/70 hover:text-white text-sm underline underline-offset-4 self-center"
                >
                  היסטוריית תשלומים
                </a>
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
                        {p.icountReceiptId ? (
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
