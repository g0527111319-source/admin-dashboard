"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Crown,
  ArrowDown,
  Check,
  AlertCircle,
  Loader2,
  CreditCard,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";

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
  currentPeriodEnd: string;
  scheduledDowngradeAt: string | null;
  scheduledDowngradePlanId: string | null;
} | null;

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

function formatPrice(v: string | number, currency = "ILS"): string {
  const n = Number(v);
  if (Number.isNaN(n)) return "-";
  if (n === 0) return "חינם";
  const symbol = currency === "ILS" ? "₪" : currency;
  return `${n.toLocaleString("he-IL")} ${symbol}`;
}

export default function AccountSettings({ designerId }: { designerId: string }) {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDowngradeSelect, setShowDowngradeSelect] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/designer/subscription?designerId=${designerId}`, {
        headers: { "x-user-id": designerId },
      });
      const data = await res.json();
      setSubscription(data.subscription || null);
      setPlans(data.plans || []);
    } catch {
      setError("שגיאה בטעינת פרטי המנוי");
    } finally {
      setLoading(false);
    }
  }, [designerId]);

  useEffect(() => {
    if (designerId) loadData();
  }, [designerId, loadData]);

  // Plans cheaper than current (for downgrade)
  const currentPrice = subscription ? Number(subscription.plan.price) : 0;
  const downgradePlans = plans.filter(
    (p) => p.id !== subscription?.planId && Number(p.price) < currentPrice && p.isActive
  );

  // The scheduled downgrade plan name
  const scheduledPlan = subscription?.scheduledDowngradePlanId
    ? plans.find((p) => p.id === subscription.scheduledDowngradePlanId)
    : null;

  async function handleDowngrade(newPlanId: string) {
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        "x-user-id": designerId,
      };

      const newPlan = plans.find((p) => p.id === newPlanId);
      const newPrice = newPlan ? Number(newPlan.price) : 0;

      let res: Response;
      let d: Record<string, unknown>;

      if (newPrice === 0) {
        // Switching to free → use change-plan (immediate switch)
        res = await fetch(`/api/designer/subscription/change-plan`, {
          method: "POST",
          headers,
          body: JSON.stringify({ designerId, newPlanId }),
        });
        d = await res.json().catch(() => ({}));
      } else {
        // Downgrade to cheaper paid plan → scheduled for end of period
        res = await fetch(`/api/designer/subscription/change-plan`, {
          method: "POST",
          headers,
          body: JSON.stringify({ designerId, newPlanId }),
        });
        d = await res.json().catch(() => ({}));
      }

      if (!res.ok) {
        throw new Error((d.error as string) || "שגיאה בשינוי המנוי");
      }

      const message = (d.message as string) || "המנוי עודכן בהצלחה";
      setSuccess(message);
      setShowDowngradeSelect(false);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה בשינוי המנוי");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancelDowngrade() {
    if (!subscription) return;
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/designer/subscription/cancel-downgrade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": designerId,
        },
        body: JSON.stringify({ designerId }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((d.error as string) || "שגיאה בביטול השינמוך");
      setSuccess("השינמוך המתוזמן בוטל");
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה בביטול השינמוך");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in max-w-2xl mx-auto">
      <div>
        <h2 className="text-xl font-heading font-bold text-text-primary flex items-center gap-2">
          <Crown className="w-5 h-5 text-gold" />
          הגדרות חשבון ומנוי
        </h2>
        <p className="text-text-muted text-sm mt-1">ניהול המנוי, שינמוך ואמצעי תשלום</p>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <p className="text-emerald-700 text-sm">{success}</p>
        </div>
      )}

      {/* Current Plan */}
      <div className="card-glass">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-bold text-text-primary">התוכנית הנוכחית</h3>
          <Link
            href={`/designer/${designerId}/subscription`}
            className="text-gold text-xs hover:underline flex items-center gap-1"
          >
            ניהול מנוי מלא
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {subscription ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-text-primary">{subscription.plan.name}</p>
              <p className="text-gold font-bold text-xl">
                {formatPrice(subscription.plan.price, subscription.plan.currency)}
                {Number(subscription.plan.price) > 0 && (
                  <span className="text-text-muted text-sm font-normal mr-1">/ חודש</span>
                )}
              </p>
              <p className="text-text-muted text-xs mt-1">
                תוקף עד: {formatDate(subscription.currentPeriodEnd)}
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full font-semibold bg-emerald-50 text-emerald-600">
              {subscription.status === "active" ? "פעיל" : subscription.status}
            </span>
          </div>
        ) : (
          <p className="text-text-muted text-sm">אין מנוי פעיל</p>
        )}
      </div>

      {/* Scheduled Downgrade Notice */}
      {subscription?.scheduledDowngradeAt && scheduledPlan && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-amber-800 font-semibold text-sm flex items-center gap-2">
                <ArrowDown className="w-4 h-4" />
                שינמוך מתוזמן
              </p>
              <p className="text-amber-700 text-sm mt-1">
                המנוי ישתנה ל-<strong>{scheduledPlan.name}</strong> ({formatPrice(scheduledPlan.price, scheduledPlan.currency)})
                בתאריך {formatDate(subscription.scheduledDowngradeAt)}
              </p>
            </div>
            <button
              onClick={handleCancelDowngrade}
              disabled={actionLoading}
              className="text-amber-600 border border-amber-300 hover:bg-amber-100 px-3 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-50"
            >
              {actionLoading ? "מבטל..." : "בטל שינמוך"}
            </button>
          </div>
        </div>
      )}

      {/* Downgrade Section */}
      {subscription && currentPrice > 0 && downgradePlans.length > 0 && !subscription.scheduledDowngradeAt && (
        <div className="card-glass">
          <h3 className="font-heading font-bold text-text-primary mb-3 flex items-center gap-2">
            <ArrowDown className="w-4 h-4 text-text-muted" />
            שינמוך מנוי
          </h3>
          <p className="text-text-muted text-sm mb-4">
            ניתן לעבור לתוכנית זולה יותר. השינוי ייכנס לתוקף בסוף תקופת החיוב הנוכחית.
          </p>

          {!showDowngradeSelect ? (
            <button
              onClick={() => setShowDowngradeSelect(true)}
              className="btn-outline flex items-center gap-2 text-sm"
            >
              <ChevronDown className="w-4 h-4" />
              בחר תוכנית לשינמוך
            </button>
          ) : (
            <div className="space-y-3">
              {downgradePlans.map((plan) => (
                <div
                  key={plan.id}
                  className="flex items-center justify-between p-4 border border-border-subtle rounded-xl hover:border-gold/40 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-text-primary">{plan.name}</p>
                    <p className="text-gold font-bold">
                      {formatPrice(plan.price, plan.currency)}
                      {Number(plan.price) > 0 && (
                        <span className="text-text-muted text-xs font-normal mr-1">/ חודש</span>
                      )}
                    </p>
                    {plan.description && (
                      <p className="text-text-muted text-xs mt-1">{plan.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDowngrade(plan.id)}
                    disabled={actionLoading}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowDown className="w-4 h-4" />
                    )}
                    {Number(plan.price) === 0 ? "עבור לחינמי" : "שנמך"}
                  </button>
                </div>
              ))}

              <button
                onClick={() => setShowDowngradeSelect(false)}
                className="text-text-muted text-xs hover:text-text-primary transition-colors"
              >
                ביטול
              </button>
            </div>
          )}
        </div>
      )}

      {/* No downgrade available (already on free) */}
      {subscription && currentPrice === 0 && (
        <div className="card-glass">
          <h3 className="font-heading font-bold text-text-primary mb-2 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-text-muted" />
            שדרוג מנוי
          </h3>
          <p className="text-text-muted text-sm mb-3">
            את על התוכנית החינמית. שדרגי כדי לקבל גישה ל-CRM, כרטיס ביקור, חוזים ועוד.
          </p>
          <Link
            href={`/designer/${designerId}/subscription`}
            className="btn-gold inline-flex items-center gap-2 text-sm px-4 py-2"
          >
            <Crown className="w-4 h-4" />
            צפה בתוכניות
          </Link>
        </div>
      )}

      {/* No subscription at all */}
      {!subscription && (
        <div className="card-glass text-center py-8">
          <Crown className="w-10 h-10 text-gold/40 mx-auto mb-3" />
          <p className="text-text-muted mb-4">אין מנוי פעיל. בחרי תוכנית כדי להתחיל.</p>
          <Link
            href={`/designer/${designerId}/subscription`}
            className="btn-gold inline-flex items-center gap-2 text-sm px-6 py-2"
          >
            בחירת תוכנית
          </Link>
        </div>
      )}
    </div>
  );
}
