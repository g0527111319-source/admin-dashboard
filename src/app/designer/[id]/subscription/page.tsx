"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Check,
  CreditCard,
  Crown,
  Sparkles,
  X,
  ArrowRight,
  Receipt,
  AlertCircle,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
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
    return new Date(iso).toLocaleDateString("he-IL", { year: "numeric", month: "long", day: "numeric" });
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
  const searchParams = useSearchParams();
  const designerId = params?.id || "";

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [subscription, setSubscription] = useState<Subscription>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showDowngradeConfirm, setShowDowngradeConfirm] = useState(false);
  const [pendingDowngradePlanId, setPendingDowngradePlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Payment modal state
  const [paymentModal, setPaymentModal] = useState<{
    show: boolean;
    plan: Plan | null;
    isMock: boolean;
    paymentUrl: string | null;
    step: "confirm" | "processing" | "success" | "error";
  }>({ show: false, plan: null, isMock: false, paymentUrl: null, step: "confirm" });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers: HeadersInit = { "x-user-id": designerId };
      const [subRes, payRes] = await Promise.all([
        fetch(`/api/designer/subscription?designerId=${designerId}`, { headers }),
        fetch(`/api/designer/subscription/payments?designerId=${designerId}`, { headers }),
      ]);
      if (!subRes.ok) throw new Error(`Subscription fetch failed: ${subRes.status}`);
      if (!payRes.ok) throw new Error(`Payments fetch failed: ${payRes.status}`);
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

  // Handle iCount callback (after real payment redirect)
  useEffect(() => {
    const paymentStatus = searchParams?.get("payment");
    const planId = searchParams?.get("planId");
    if (paymentStatus === "callback" && planId && designerId) {
      // Payment was already completed on iCount PayPage — skip re-charging
      handleSubscribe(planId, "paypage");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // When user clicks a plan
  async function handlePlanSelect(planId: string) {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;

    const price = Number(plan.price);

    if (price === 0) {
      // If currently on a paid plan, show downgrade confirmation first
      if (subscription && Number(subscription.plan.price) > 0 && subscription.status !== "cancelled") {
        setPendingDowngradePlanId(planId);
        setShowDowngradeConfirm(true);
        return;
      }
      // Free plan → switch immediately (no paid plan to downgrade from)
      setActionLoading(true);
      try {
        await handleSubscribe(planId);
        setSuccessMsg("עברת לתוכנית החינמית בהצלחה");
      } catch {
        // error already set by handleSubscribe
      }
      setActionLoading(false);
      return;
    }

    // Paid plan → check with backend whether iCount is real or mock
    setActionLoading(true);
    try {
      const res = await fetch("/api/designer/subscription/payment-url", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": designerId },
        body: JSON.stringify({ designerId, planId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "שגיאה");
        setActionLoading(false);
        return;
      }

      // Already paid for this billing period — switch without re-charging
      if (data.alreadyPaid) {
        try {
          await handleSubscribe(planId, "already_paid");
          setSuccessMsg("המנוי שודרג בהצלחה — ללא חיוב נוסף (כבר שולם עבור תקופה זו)");
        } catch {
          // error already set by handleSubscribe
        }
        setActionLoading(false);
        return;
      }

      if (data.mock) {
        // Mock mode — show warning modal
        setPaymentModal({
          show: true,
          plan,
          isMock: true,
          paymentUrl: null,
          step: "confirm",
        });
      } else {
        // Real iCount → redirect to hosted payment page
        setPaymentModal({
          show: true,
          plan,
          isMock: false,
          paymentUrl: data.paymentUrl,
          step: "confirm",
        });
      }
    } catch {
      setError("שגיאה בהכנת התשלום");
    } finally {
      setActionLoading(false);
    }
  }

  // Confirm payment — either redirect to iCount or process mock
  async function handlePaymentConfirm() {
    if (!paymentModal.plan) return;

    if (!paymentModal.isMock && paymentModal.paymentUrl) {
      // Real iCount → redirect browser to iCount payment page
      window.location.href = paymentModal.paymentUrl;
      return;
    }

    // Mock mode → process directly (simulated)
    setPaymentModal((prev) => ({ ...prev, step: "processing" }));
    try {
      await handleSubscribe(paymentModal.plan.id);
      setPaymentModal((prev) => ({ ...prev, step: "success" }));
    } catch {
      setPaymentModal((prev) => ({ ...prev, step: "error" }));
    }
  }

  async function handleSubscribe(planId: string, paymentMethod?: string) {
    setActionLoading(true);
    setError(null);
    try {
      const headers: HeadersInit = { "Content-Type": "application/json", "x-user-id": designerId };
      let res: Response;
      let d: Record<string, unknown>;

      const hasExisting = subscription && subscription.status !== "cancelled";
      if (hasExisting) {
        res = await fetch(`/api/designer/subscription/change-plan`, {
          method: "POST",
          headers,
          body: JSON.stringify({ designerId, newPlanId: planId, paymentMethod }),
        });
        d = await res.json().catch(() => ({}));

        if (res.status === 404) {
          res = await fetch(`/api/designer/subscription`, {
            method: "POST",
            headers,
            body: JSON.stringify({ planId, designerId, paymentMethod }),
          });
          d = await res.json().catch(() => ({}));
        }
      } else {
        res = await fetch(`/api/designer/subscription`, {
          method: "POST",
          headers,
          body: JSON.stringify({ planId, designerId, paymentMethod }),
        });
        d = await res.json().catch(() => ({}));
      }

      if (!res.ok) {
        throw new Error((d.error as string) || "שגיאה בשינוי המנוי");
      }
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה בשינוי המנוי");
      throw e;
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

  const trialDaysLeft =
    subscription?.status === "trial" && subscription.trialEndsAt
      ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;

  const hasRealPayment =
    subscription?.icountCustomerId &&
    !subscription.icountCustomerId.startsWith("mock-");

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#0f0f1e] text-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#C9A84C]" />
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

        {/* Error / Success */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}
        {successMsg && (
          <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
            <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
            <p className="text-green-300 text-sm">{successMsg}</p>
          </div>
        )}

        {subscription && (subscription.supplierCooperationCount ?? 0) > 0 && (
          <div className="mb-6">
            <SavingsBadge
              supplierCount={subscription.supplierCooperationCount ?? 0}
              needed={subscription.supplierCooperationNeeded ?? 5}
              savedAmount={Number(subscription.discountSavings ?? 0)}
              planName={subscription.plan.name}
            />
          </div>
        )}

        {/* ==================== Current Plan ==================== */}
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
                      <span className={`text-xs px-3 py-1 rounded-full font-semibold ${statusLabel(subscription.status).color}`}>
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
                      תקופת ניסיון — {trialDaysLeft} ימים נותרו
                    </p>
                  </div>
                )}

                {subscription.status === "cancelled" && (
                  <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                    <p className="text-red-300 text-sm">
                      בוטל ב-{formatDate(subscription.cancelledAt)}. גישה עד {formatDate(subscription.currentPeriodEnd)}.
                    </p>
                  </div>
                )}

                <div className="border-t border-white/10 pt-4">
                  <p className="text-sm text-white/70 mb-3">מה כלול:</p>
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
                <p className="text-white/70 mb-2">אין מנוי פעיל</p>
                <p className="text-white/50 text-sm">ניתן לבחור תוכנית למטה</p>
              </div>
            )}
          </div>
        </section>

        {/* ==================== Plans ==================== */}
        <section className="mb-10">
          <h2 className="text-xl text-[#C9A84C] mb-4">תוכניות זמינות</h2>
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
            <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-10 rounded-md bg-gradient-to-br from-[#C9A84C] to-[#8a6f2a] flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-black" />
                </div>
                {hasRealPayment ? (
                  <div>
                    <p className="text-white font-medium">כרטיס אשראי שמור ב-iCount</p>
                    <p className="text-white/50 text-xs">
                      חיוב אחרון: {formatDate(subscription.lastPaymentAt)}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-amber-400 font-medium flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      מערכת סליקה לא מחוברת
                    </p>
                    <p className="text-white/50 text-xs">
                      יש להגדיר פרטי iCount בהגדרות המערכת כדי לאפשר חיובים אמיתיים
                    </p>
                  </div>
                )}
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
              <p className="text-white/50 text-center py-10">אין תשלומים להצגה</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-white/5">
                  <tr>
                    <th className="text-right px-5 py-3 text-white/70 font-medium">תאריך</th>
                    <th className="text-right px-5 py-3 text-white/70 font-medium">סכום</th>
                    <th className="text-right px-5 py-3 text-white/70 font-medium">סטטוס</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-t border-white/5">
                      <td className="px-5 py-3 text-white/80">{formatDate(p.paidAt || p.createdAt)}</td>
                      <td className="px-5 py-3 text-white">{formatPrice(p.amount, p.currency)}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          p.status === "succeeded" ? "bg-green-400/10 text-green-400"
                            : p.status === "failed" ? "bg-red-400/10 text-red-400"
                            : "bg-white/5 text-white/60"
                        }`}>
                          {p.status === "succeeded" ? "שולם" : p.status === "failed" ? "נכשל" : p.status}
                        </span>
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
            if (paymentModal.step !== "processing")
              setPaymentModal({ show: false, plan: null, isMock: false, paymentUrl: null, step: "confirm" });
          }}
        >
          <div
            dir="rtl"
            className="bg-[#1a1a2e] border border-[#C9A84C]/30 rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Confirm Step */}
            {paymentModal.step === "confirm" && (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/20 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-[#C9A84C]" />
                  </div>
                  <div>
                    <h3 className="text-lg text-white font-bold">שדרוג ל-{paymentModal.plan.name}</h3>
                    <p className="text-[#C9A84C] font-bold text-xl">
                      {formatPrice(paymentModal.plan.price, paymentModal.plan.currency)}
                      <span className="text-white/50 text-sm font-normal mr-1">/ חודש</span>
                    </p>
                  </div>
                </div>

                {paymentModal.isMock && (
                  <div className="mb-5 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                    <p className="text-amber-400 text-sm font-bold flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      מצב בדיקה — iCount לא מחובר
                    </p>
                    <p className="text-amber-300/70 text-xs">
                      מערכת הסליקה של iCount לא מוגדרת. התשלום יירשם כבדיקה בלבד —
                      לא יתבצע חיוב אמיתי ולא תישלח חשבונית.
                      <br />
                      <span className="font-bold">כדי לחבר סליקה אמיתית</span> — יש להגדיר את כל פרטי iCount (מזהה חברה, שם משתמש, סיסמה, API Key) בהגדרות מערכת.
                    </p>
                  </div>
                )}

                {!paymentModal.isMock && (
                  <div className="mb-5 bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                    <p className="text-green-400 text-sm flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      תשלום מאובטח דרך iCount — הזנת פרטי כרטיס בדף מאובטח
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setPaymentModal({ show: false, plan: null, isMock: false, paymentUrl: null, step: "confirm" })}
                    className="flex-1 py-3 rounded-xl border border-white/20 text-white hover:bg-white/5 transition-colors text-sm"
                  >
                    ביטול
                  </button>
                  <button
                    onClick={handlePaymentConfirm}
                    className="flex-1 py-3 rounded-xl bg-[#C9A84C] text-black font-bold hover:bg-[#e0c068] transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    {paymentModal.isMock ? (
                      <>המשך (בדיקה)</>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4" />
                        עבור לתשלום ב-iCount
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {/* Processing */}
            {paymentModal.step === "processing" && (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 text-[#C9A84C] animate-spin mx-auto mb-4" />
                <h3 className="text-lg text-white font-bold mb-2">מעבד...</h3>
                <p className="text-white/50 text-sm">רושם את המנוי</p>
              </div>
            )}

            {/* Success */}
            {paymentModal.step === "success" && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-lg text-white font-bold mb-2">המנוי הופעל!</h3>
                <p className="text-white/50 text-sm mb-1">עברת ל-{paymentModal.plan?.name}</p>
                {paymentModal.isMock && (
                  <p className="text-amber-400 text-xs">(מצב בדיקה — ללא חיוב אמיתי)</p>
                )}
                <button
                  onClick={() => setPaymentModal({ show: false, plan: null, isMock: false, paymentUrl: null, step: "confirm" })}
                  className="mt-4 px-8 py-3 rounded-xl bg-[#C9A84C] text-black font-bold hover:bg-[#e0c068] transition-colors text-sm"
                >
                  סגור
                </button>
              </div>
            )}

            {/* Error */}
            {paymentModal.step === "error" && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-lg text-white font-bold mb-2">שגיאה</h3>
                <p className="text-white/50 text-sm mb-4">{error || "לא ניתן לעבד את הבקשה"}</p>
                <button
                  onClick={() => setPaymentModal({ show: false, plan: null, isMock: false, paymentUrl: null, step: "confirm" })}
                  className="px-8 py-3 rounded-xl border border-white/20 text-white hover:bg-white/5 transition-colors text-sm"
                >
                  סגור
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== Cancel Modal ==================== */}
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
              גישה פעילה עד {formatDate(subscription?.currentPeriodEnd)}. אחרי זה — תוכנית חינמית.
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

      {/* ==================== Downgrade Confirmation Modal ==================== */}
      {showDowngradeConfirm && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowDowngradeConfirm(false)}
        >
          <div
            dir="rtl"
            className="bg-[#1a1a2e] border border-[#C9A84C]/30 rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-xl text-white font-bold">שינמוך לתוכנית חינמית</h3>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-5">
              <ul className="space-y-2 text-sm text-amber-200/80">
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <span>החיוב החודשי המתחדש יבוטל</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <span>תאבדי גישה לפיצ׳רים מתקדמים</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <span>השינוי ייכנס לתוקף מיד</span>
                </li>
              </ul>
            </div>
            <p className="text-white/50 text-xs mb-5">
              לאחר המעבר, לא יתבצע חיוב נוסף. ניתן לשדרג חזרה בכל עת.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDowngradeConfirm(false)}
                disabled={actionLoading}
                className="flex-1 py-3 rounded-xl border border-white/20 text-white hover:bg-white/5 transition-colors text-sm"
              >
                חזרה
              </button>
              <button
                onClick={async () => {
                  if (!pendingDowngradePlanId) return;
                  setActionLoading(true);
                  try {
                    await handleSubscribe(pendingDowngradePlanId);
                    setSuccessMsg("עברת לתוכנית החינמית. החיוב המתחדש בוטל.");
                    setShowDowngradeConfirm(false);
                  } catch {
                    // error already set by handleSubscribe
                  }
                  setActionLoading(false);
                }}
                disabled={actionLoading}
                className="flex-1 py-3 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 transition-colors text-sm disabled:opacity-50"
              >
                {actionLoading ? "מעבד..." : "אשר שינמוך"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
