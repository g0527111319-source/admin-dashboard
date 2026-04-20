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
      return { label: "● פעיל", color: "bg-green-50 text-green-700 border border-green-200" };
    case "trial":
      return { label: "תקופת ניסיון", color: "bg-blue-50 text-blue-700 border border-blue-200" };
    case "cancelled":
      return { label: "בוטל", color: "bg-red-50 text-red-700 border border-red-200" };
    case "expired":
      return { label: "פג תוקף", color: "bg-bg-surface text-text-muted border border-border-subtle" };
    case "past_due":
      return { label: "תשלום נכשל", color: "bg-orange-50 text-orange-700 border border-orange-200" };
    default:
      return { label: status, color: "bg-bg-surface text-text-muted border border-border-subtle" };
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
    const cardStatus = searchParams?.get("card");

    if (paymentStatus === "callback" && planId && designerId) {
      // Payment was already completed on iCount PayPage — activate subscription,
      // then verify with iCount directly as a safety net in case the IPN webhook
      // was delayed or misconfigured.
      (async () => {
        try {
          await handleSubscribe(planId, "paypage");
        } catch {
          // error already set
        }
        // Safety-net verification: query iCount for the recent doc to confirm payment
        try {
          await fetch("/api/designer/subscription/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-user-id": designerId },
            body: JSON.stringify({ planId }),
          });
        } catch {
          // verification best-effort only
        }
      })();
    } else if (cardStatus === "updated") {
      setSuccessMsg("כרטיס האשראי עודכן בהצלחה. הכרטיס החדש ישמש לחיובים הבאים.");
    } else if (cardStatus === "cancelled") {
      setError("החלפת הכרטיס בוטלה");
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

  async function handleUpdateCard() {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/designer/subscription/update-card`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": designerId },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "שגיאה בהחלפת כרטיס");
      }
      if (data.mock) {
        setError(
          data.message ||
            "מצב בדיקה — מערכת iCount לא מחוברת. יש להגדיר את פרטי iCount בהגדרות המערכת.",
        );
        return;
      }
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה בהחלפת כרטיס");
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
      <div dir="rtl" className="min-h-screen bg-bg text-text-primary flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-bg text-text-primary">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs tracking-[0.3em] uppercase text-[color:var(--gold-dim)] mb-2">
              ניהול חשבון
            </p>
            <h1 className="font-heading text-3xl md:text-4xl font-medium text-text-primary mb-1">
              ניהול מנוי
            </h1>
            <p className="text-text-secondary text-sm max-w-xl">
              ניהול התוכנית, אמצעי התשלום והחשבוניות — הכל במקום אחד.
            </p>
          </div>
          <Link
            href={`/designer/${designerId}`}
            className="flex items-center gap-2 text-text-muted hover:text-gold transition-colors text-sm"
          >
            <ArrowRight className="w-4 h-4" />
            חזרה לדשבורד
          </Link>
        </div>

        {/* Error / Success */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}
        {successMsg && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <Check className="w-5 h-5 text-green-700 flex-shrink-0" />
            <p className="text-green-800 text-sm">{successMsg}</p>
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
          <h2 className="font-heading text-xl text-text-primary mb-4 flex items-center gap-2">
            <Crown className="w-5 h-5 text-gold" />
            התוכנית הנוכחית
          </h2>
          <div
            className="rounded-[24px] border-2 p-6 md:p-8"
            style={{
              borderColor: "var(--border-gold)",
              background: "linear-gradient(135deg, #FFFBEF 0%, #F5ECD3 100%)",
              boxShadow: "var(--shadow-gold)",
            }}
          >
            {subscription ? (
              <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr] gap-6 md:gap-8">
                {/* Left: plan name + price + features */}
                <div>
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <span className="text-[11px] tracking-[0.3em] uppercase text-[color:var(--gold-dim)] font-semibold">
                      התוכנית שלך
                    </span>
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold ${statusLabel(subscription.status).color}`}>
                      {statusLabel(subscription.status).label}
                    </span>
                  </div>
                  <h3 className="font-heading text-4xl md:text-5xl font-medium text-text-primary leading-tight mb-2">
                    {subscription.plan.name}
                  </h3>
                  <p className="text-2xl font-heading text-[color:var(--gold-dim)] mb-1">
                    {formatPrice(subscription.plan.price, subscription.plan.currency)}
                    <span className="text-sm text-text-muted font-normal mr-2 font-sans">
                      / לחודש · חיוב חודשי
                    </span>
                  </p>
                  <p className="text-text-secondary text-sm mb-5 flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[color:var(--gold-dim)]" />
                    מתחדש אוטומטית ב-{formatDate(subscription.currentPeriodEnd)}
                  </p>

                  {subscription.status === "trial" && (
                    <div className="mb-5 bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-blue-800 text-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        תקופת ניסיון — {trialDaysLeft} ימים נותרו
                      </p>
                    </div>
                  )}

                  {subscription.status === "cancelled" && (
                    <div className="mb-5 bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-red-800 text-sm">
                        בוטל ב-{formatDate(subscription.cancelledAt)}. גישה עד {formatDate(subscription.currentPeriodEnd)}.
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-[color:var(--border-gold)]">
                    <p className="text-xs tracking-wider uppercase text-[color:var(--gold-dim)] font-semibold mb-3">
                      מה כלול בתוכנית
                    </p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
                      {Object.entries(subscription.plan.features || {}).map(([key, enabled]) =>
                        enabled ? (
                          <li key={key} className="flex items-center gap-2 text-sm text-text-secondary">
                            <Check className="w-4 h-4 text-green-700 flex-shrink-0" />
                            {FEATURE_LABELS[key] || key}
                          </li>
                        ) : null
                      )}
                    </ul>
                  </div>
                </div>

                {/* Right: action panel */}
                <div
                  className="rounded-2xl p-5 border self-start"
                  style={{
                    borderColor: "var(--border-gold)",
                    background: "rgba(255,255,255,0.7)",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  <p className="text-xs tracking-wider uppercase text-[color:var(--gold-dim)] font-semibold mb-4">
                    ניהול מנוי
                  </p>
                  <div className="flex flex-col gap-3">
                    {subscription.status !== "cancelled" && Number(subscription.plan.price) > 0 && (
                      <button
                        onClick={() => setShowCancelConfirm(true)}
                        disabled={actionLoading}
                        className="w-full py-2.5 rounded-full border-2 border-red-200 bg-red-50 text-red-700 hover:bg-red-100 font-semibold text-sm transition-colors disabled:opacity-50"
                      >
                        ביטול מנוי
                      </button>
                    )}
                    <a
                      href="#plans"
                      className="btn-gold w-full !py-2.5 text-center"
                    >
                      שדרגי תוכנית
                    </a>
                    <a
                      href="#billing-history"
                      className="btn-outline w-full !py-2.5 text-center"
                    >
                      צפי בחשבוניות
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-text-primary mb-2 font-heading text-2xl">אין מנוי פעיל</p>
                <p className="text-text-muted text-sm">ניתן לבחור תוכנית למטה</p>
              </div>
            )}
          </div>
        </section>

        {/* ==================== Plans ==================== */}
        <section className="mb-10" id="plans">
          <div className="mb-6">
            <p className="text-xs tracking-[0.3em] uppercase text-[color:var(--gold-dim)] mb-2 text-center">
              כל התוכניות
            </p>
            <h2 className="font-heading text-2xl md:text-3xl font-medium text-text-primary mb-2 text-center">
              בחרי את התוכנית שמתאימה לך
            </h2>
            <p className="text-text-secondary text-sm max-w-xl mx-auto text-center">
              אפשר להתחיל בחינמית, לשדרג בהמשך, לבטל בכל רגע. בלי הפתעות.
            </p>
          </div>

          <PlanComparisonTable
            plans={plans}
            currentPlanId={subscription?.planId}
            highlightedPlanSlug="pro"
            onSelect={(planId) => handlePlanSelect(planId)}
            loading={actionLoading}
          />

          {/* Supplier collaboration discount notice */}
          <div className="mt-8 rounded-2xl p-5 md:p-6 border flex items-start gap-4"
            style={{
              borderColor: "var(--border-gold)",
              background: "var(--gold-50)",
            }}
          >
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[color:var(--gold-dim)] to-[color:var(--gold)] flex items-center justify-center flex-shrink-0 text-white text-lg font-bold shadow-md">
              ✦
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <p className="text-[color:var(--gold-dim)] font-bold text-sm">
                  מעצב/ת שמשתפ/ת פעולה עם ספקי קהילת זירת האדריכלות זכאי/ת להנחה משמעותית
                </p>
                <span className="text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full bg-[color:var(--gold-dim)] text-white font-bold">
                  הטבה
                </span>
              </div>
              <p className="text-text-secondary text-xs leading-relaxed">
                הפרטים המלאים בקהילת זירת האדריכלות. שיתוף פעולה עם ספקי הקהילה מזכה בקופון הנחה על המנוי בתשלום.
              </p>
            </div>
          </div>
        </section>

        {/* ==================== Payment Method ==================== */}
        {subscription && Number(subscription.plan.price) > 0 && (
          <section className="mb-10">
            <h2 className="font-heading text-xl text-text-primary mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-gold" />
              אמצעי תשלום
            </h2>
            <div className="card-static">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-5">
                  {/* Visual credit card — kept dark by design (mimics physical card) */}
                  <div
                    className="w-28 h-18 rounded-xl p-3 flex flex-col justify-between text-white shadow-md flex-shrink-0"
                    style={{
                      background: "linear-gradient(135deg, #1a1410 0%, #2a1f17 100%)",
                      aspectRatio: "1.6 / 1",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-5 h-4 rounded-sm bg-gradient-to-br from-[color:var(--gold)] to-[color:var(--gold-dim)]" />
                      <span className="text-[10px] font-heading tracking-wider text-[color:var(--gold-light)]">
                        VISA
                      </span>
                    </div>
                    <div className="text-[9px] tracking-widest text-[color:var(--gold-light)]/80 font-mono">
                      •••• 4218
                    </div>
                  </div>
                  {hasRealPayment ? (
                    <div>
                      <p className="text-text-primary font-semibold">כרטיס אשראי שמור ב-iCount</p>
                      <p className="text-text-muted text-xs mt-1">
                        חיוב אחרון: {formatDate(subscription.lastPaymentAt)}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-amber-700 font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        מערכת סליקה לא מחוברת
                      </p>
                      <p className="text-text-muted text-xs mt-1">
                        יש להגדיר פרטי iCount בהגדרות המערכת כדי לאפשר חיובים אמיתיים
                      </p>
                    </div>
                  )}
                </div>
                {hasRealPayment && (
                  <button
                    onClick={handleUpdateCard}
                    disabled={actionLoading}
                    className="btn-outline !py-2.5 flex items-center gap-2 disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                    החלף כרטיס אשראי
                  </button>
                )}
              </div>
              {hasRealPayment && (
                <p className="text-text-muted text-xs mt-5 pt-4 border-t border-border-subtle leading-relaxed">
                  החלפת הכרטיס מתבצעת דרך דף מאובטח של iCount. לצורך אימות הכרטיס החדש יתבצע חיוב סמלי (1₪) שמאמת את הכרטיס לחיובי המנוי הבאים.
                </p>
              )}
            </div>
          </section>
        )}

        {/* ==================== Billing History ==================== */}
        <section id="billing-history" className="mb-10">
          <h2 className="font-heading text-xl text-text-primary mb-4 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-gold" />
            היסטוריית חשבוניות
          </h2>
          <div className="card-static !p-0 overflow-hidden">
            {payments.length === 0 ? (
              <p className="text-text-muted text-center py-10">אין תשלומים להצגה</p>
            ) : (
              <table className="table-luxury w-full text-sm">
                <thead>
                  <tr>
                    <th>תאריך</th>
                    <th>סכום</th>
                    <th>סטטוס</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="text-text-secondary">{formatDate(p.paidAt || p.createdAt)}</td>
                      <td className="text-text-primary font-semibold">{formatPrice(p.amount, p.currency)}</td>
                      <td>
                        {p.status === "succeeded" ? (
                          <span className="badge-green">● שולם</span>
                        ) : p.status === "failed" ? (
                          <span className="badge-red">✕ נכשל</span>
                        ) : (
                          <span className="badge-gray">{p.status}</span>
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
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            if (paymentModal.step !== "processing")
              setPaymentModal({ show: false, plan: null, isMock: false, paymentUrl: null, step: "confirm" });
          }}
        >
          <div
            dir="rtl"
            className="bg-white border border-border-subtle rounded-2xl p-6 max-w-md w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Confirm Step */}
            {paymentModal.step === "confirm" && (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-full bg-[color:var(--gold-50)] flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-[color:var(--gold-dim)]" />
                  </div>
                  <div>
                    <p className="text-[11px] tracking-wider uppercase text-[color:var(--gold-dim)] font-semibold">
                      שדרוג מנוי
                    </p>
                    <h3 className="font-heading text-xl text-text-primary font-medium">
                      {paymentModal.plan.name}
                    </h3>
                    <p className="font-heading text-2xl text-text-primary mt-0.5">
                      {formatPrice(paymentModal.plan.price, paymentModal.plan.currency)}
                      <span className="text-text-muted text-sm font-normal mr-1 font-sans">
                        / חודש
                      </span>
                    </p>
                  </div>
                </div>

                {paymentModal.isMock && (
                  <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-amber-800 text-sm font-bold flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      מצב בדיקה — iCount לא מחובר
                    </p>
                    <p className="text-amber-700 text-xs leading-relaxed">
                      מערכת הסליקה של iCount לא מוגדרת. התשלום יירשם כבדיקה בלבד —
                      לא יתבצע חיוב אמיתי ולא תישלח חשבונית.
                      <br />
                      <span className="font-bold">כדי לחבר סליקה אמיתית</span> — יש להגדיר את כל פרטי iCount (מזהה חברה, שם משתמש, סיסמה, API Key) בהגדרות מערכת.
                    </p>
                  </div>
                )}

                {!paymentModal.isMock && (
                  <div className="mb-5 bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-green-800 text-sm flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      תשלום מאובטח דרך iCount — הזנת פרטי כרטיס בדף מאובטח
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setPaymentModal({ show: false, plan: null, isMock: false, paymentUrl: null, step: "confirm" })}
                    className="btn-outline flex-1"
                  >
                    ביטול
                  </button>
                  <button
                    onClick={handlePaymentConfirm}
                    className="btn-gold flex-1"
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
                <div className="w-12 h-12 rounded-full border-4 border-[color:var(--gold-50)] border-t-[color:var(--gold)] animate-spin mx-auto mb-4" />
                <h3 className="font-heading text-xl text-text-primary mb-2">מעבדים…</h3>
                <p className="text-text-muted text-sm">אל תסגרי את החלון. רושמים את המנוי.</p>
                <div className="mt-5 h-1.5 bg-bg-surface rounded-full overflow-hidden max-w-xs mx-auto">
                  <div className="h-full bg-gradient-to-l from-[color:var(--gold-dim)] to-[color:var(--gold)] animate-pulse" style={{ width: "60%" }} />
                </div>
              </div>
            )}

            {/* Success */}
            {paymentModal.step === "success" && (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4 shadow-md">
                  <Check className="w-8 h-8 text-green-700" strokeWidth={3} />
                </div>
                <h3 className="font-heading text-2xl text-text-primary mb-2">המנוי הופעל!</h3>
                <p className="text-text-secondary text-sm mb-1">עברת ל-{paymentModal.plan?.name}</p>
                {paymentModal.isMock && (
                  <p className="text-amber-700 text-xs mt-2">(מצב בדיקה — ללא חיוב אמיתי)</p>
                )}
                <button
                  onClick={() => setPaymentModal({ show: false, plan: null, isMock: false, paymentUrl: null, step: "confirm" })}
                  className="btn-gold mt-5"
                >
                  סגור
                </button>
              </div>
            )}

            {/* Error */}
            {paymentModal.step === "error" && (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4 shadow-md">
                  <X className="w-8 h-8 text-red-700" strokeWidth={3} />
                </div>
                <h3 className="font-heading text-2xl text-text-primary mb-2">שגיאה</h3>
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-right">
                  <p className="text-red-800 text-sm">{error || "לא ניתן לעבד את הבקשה"}</p>
                </div>
                <button
                  onClick={() => setPaymentModal({ show: false, plan: null, isMock: false, paymentUrl: null, step: "confirm" })}
                  className="btn-outline"
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
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowCancelConfirm(false)}
        >
          <div
            dir="rtl"
            className="bg-white border border-border-subtle rounded-2xl p-6 max-w-md w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-700" />
              </div>
              <h3 className="font-heading text-xl text-text-primary font-medium">
                לבטל את המנוי?
              </h3>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
              <p className="text-red-900 text-sm font-semibold mb-2">מה יקרה אם תבטלי?</p>
              <ul className="space-y-1.5 text-xs text-red-800">
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">•</span>
                  <span>גישה פעילה עד {formatDate(subscription?.currentPeriodEnd)}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">•</span>
                  <span>לאחר מכן — מעבר לתוכנית החינמית</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">•</span>
                  <span>תאבדי גישה לפיצ׳רים המתקדמים</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">•</span>
                  <span>תוכלי לשדרג חזרה בכל עת</span>
                </li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={actionLoading}
                className="btn-gold flex-1"
              >
                תשאירי אותי
              </button>
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="flex-1 py-3 rounded-full border-2 border-red-400 bg-red-50 text-red-800 hover:bg-red-100 transition-colors font-semibold text-sm disabled:opacity-50"
              >
                {actionLoading ? "מבטלת..." : "בטלי לצמיתות"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== Downgrade Confirmation Modal ==================== */}
      {showDowngradeConfirm && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowDowngradeConfirm(false)}
        >
          <div
            dir="rtl"
            className="bg-white border border-border-subtle rounded-2xl p-6 max-w-md w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-700" />
              </div>
              <h3 className="font-heading text-xl text-text-primary font-medium">
                שינמוך לתוכנית חינמית
              </h3>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
              <ul className="space-y-2 text-sm text-amber-900">
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
                  <span>החיוב החודשי המתחדש יבוטל</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
                  <span>תאבדי גישה לפיצ׳רים מתקדמים</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
                  <span>השינוי ייכנס לתוקף מיד</span>
                </li>
              </ul>
            </div>
            <p className="text-text-muted text-xs mb-5">
              לאחר המעבר, לא יתבצע חיוב נוסף. ניתן לשדרג חזרה בכל עת.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDowngradeConfirm(false)}
                disabled={actionLoading}
                className="btn-outline flex-1"
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
                className="flex-1 py-3 rounded-full border-2 border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100 transition-colors font-semibold text-sm disabled:opacity-50"
              >
                {actionLoading ? "מעבדת..." : "אשרי שינמוך"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
