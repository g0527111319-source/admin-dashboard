"use client";
import { useEffect, useState } from "react";
import {
  CreditCard,
  Plus,
  Edit3,
  Trash2,
  Check,
  X,
  Search,
  Play,
  Gift,
  RefreshCw,
  Settings as SettingsIcon,
  Users,
} from "lucide-react";

type PlanFeatures = {
  events: boolean;
  suppliers: boolean;
  raffles: boolean;
  crm: boolean;
  businessCard: boolean;
  contracts: boolean;
};

type Plan = {
  id: string;
  name: string;
  slug: string;
  price: string | number;
  currency: string;
  billingCycle: string;
  features: PlanFeatures;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
};

type Subscription = {
  id: string;
  status: string;
  startedAt: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string;
  autoRenew: boolean;
  plan: Plan;
};

type DesignerRow = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  subscription: Subscription | null;
};

type Rule = {
  id: string;
  name: string;
  minSupplierCount: number;
  timeWindowDays: number;
  targetPlanId: string | null;
  isActive: boolean;
};

const FEATURE_LABELS: Record<keyof PlanFeatures, string> = {
  events: "אירועים",
  suppliers: "ספקים",
  raffles: "הגרלות",
  crm: "CRM",
  businessCard: "כרטיס ביקור",
  contracts: "חוזים",
};

const STATUS_LABELS: Record<string, string> = {
  active: "פעיל",
  trial: "תקופת ניסיון",
  cancelled: "בוטל",
  paused: "מושהה",
  expired: "פג תוקף",
};

export default function SubscriptionsAdminPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [designers, setDesigners] = useState<DesignerRow[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Modals
  const [editPlan, setEditPlan] = useState<Partial<Plan> | null>(null);
  const [editRule, setEditRule] = useState<Partial<Rule> | null>(null);
  const [changePlanFor, setChangePlanFor] = useState<DesignerRow | null>(null);
  const [grantTrialFor, setGrantTrialFor] = useState<DesignerRow | null>(null);

  // Global trial
  const [defaultTrialDays, setDefaultTrialDays] = useState(14);

  // iCount
  const [icountKey, setIcountKey] = useState("");
  const [icountTest, setIcountTest] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [p, s, r] = await Promise.all([
        fetch("/api/admin/subscriptions/plans").then((x) => x.json()),
        fetch("/api/admin/subscriptions").then((x) => x.json()),
        fetch("/api/admin/subscriptions/rules").then((x) => x.json()),
      ]);
      setPlans(Array.isArray(p) ? p : []);
      setDesigners(Array.isArray(s) ? s : []);
      setRules(Array.isArray(r) ? r : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const savePlan = async () => {
    if (!editPlan) return;
    const method = editPlan.id ? "PATCH" : "POST";
    await fetch("/api/admin/subscriptions/plans", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editPlan),
    });
    setEditPlan(null);
    loadAll();
  };

  const togglePlanActive = async (plan: Plan) => {
    await fetch("/api/admin/subscriptions/plans", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: plan.id, isActive: !plan.isActive }),
    });
    loadAll();
  };

  const deletePlan = async (plan: Plan) => {
    if (!confirm(`למחוק את התוכנית "${plan.name}"?`)) return;
    await fetch(`/api/admin/subscriptions/plans?id=${plan.id}`, {
      method: "DELETE",
    });
    loadAll();
  };

  const assignPlan = async (designerId: string, planId: string, trialDays?: number) => {
    await fetch("/api/admin/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ designerId, planId, trialDays }),
    });
    loadAll();
  };

  const cancelSub = async (sub: Subscription) => {
    if (!confirm("לבטל את המנוי?")) return;
    await fetch(`/api/admin/subscriptions/${sub.id}`, { method: "DELETE" });
    loadAll();
  };

  const promoteTo = async (designer: DesignerRow, slug: string) => {
    const plan = plans.find((p) => p.slug === slug);
    if (!plan) return alert("התוכנית לא קיימת");
    await assignPlan(designer.id, plan.id);
  };

  const grantTrial = async (sub: Subscription, days: number) => {
    await fetch(`/api/admin/subscriptions/${sub.id}/grant-trial`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days }),
    });
    loadAll();
  };

  const saveRule = async () => {
    if (!editRule) return;
    const method = editRule.id ? "PATCH" : "POST";
    await fetch("/api/admin/subscriptions/rules", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editRule),
    });
    setEditRule(null);
    loadAll();
  };

  const deleteRule = async (rule: Rule) => {
    if (!confirm(`למחוק את החוק "${rule.name}"?`)) return;
    await fetch(`/api/admin/subscriptions/rules?id=${rule.id}`, { method: "DELETE" });
    loadAll();
  };

  const runPromotion = async () => {
    const res = await fetch("/api/admin/subscriptions/run-promotion", {
      method: "POST",
    });
    const data = await res.json();
    alert(`בדיקת קידום הסתיימה — קודמו ${data.promoted ?? 0} מעצבות מתוך ${data.checked ?? 0}`);
    loadAll();
  };

  const testIcount = () => {
    if (!icountKey) {
      setIcountTest("חסר מפתח API");
      return;
    }
    setIcountTest("מתבצעת בדיקה...");
    setTimeout(() => setIcountTest("חיבור נבדק (דמו)"), 600);
  };

  // Filters
  const filtered = designers.filter((d) => {
    if (search && !d.fullName.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPlan && d.subscription?.plan?.slug !== filterPlan) return false;
    if (filterStatus && d.subscription?.status !== filterStatus) return false;
    return true;
  });

  const activeTrials = designers.filter(
    (d) => d.subscription?.status === "trial" && d.subscription?.trialEndsAt,
  );

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/icount`
      : "/api/webhooks/icount";

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <CreditCard className="text-[#C9A84C]" size={32} />
          <div>
            <h1 className="text-3xl font-bold text-[#C9A84C]">ניהול מנויים</h1>
            <p className="text-white/60 text-sm">תוכניות, חיובים, תקופות ניסיון וקידום אוטומטי</p>
          </div>
        </div>

        {/* Top nav cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
          <a
            href="#plans"
            className="block bg-[#0e0e0e] border border-[#C9A84C]/40 rounded-xl p-4 hover:bg-[#C9A84C]/10 transition"
          >
            <div className="text-[#C9A84C] font-bold">מנויים</div>
            <div className="text-white/60 text-xs mt-1">תוכניות, מעצבות, חוקים</div>
          </a>
          <a
            href="/admin/coupons"
            className="block bg-[#0e0e0e] border border-white/10 rounded-xl p-4 hover:bg-[#C9A84C]/10 hover:border-[#C9A84C]/40 transition"
          >
            <div className="text-[#C9A84C] font-bold">קופונים</div>
            <div className="text-white/60 text-xs mt-1">ניהול קופוני הנחה</div>
          </a>
          <a
            href="/admin/subscriptions/analytics"
            className="block bg-[#0e0e0e] border border-white/10 rounded-xl p-4 hover:bg-[#C9A84C]/10 hover:border-[#C9A84C]/40 transition"
          >
            <div className="text-[#C9A84C] font-bold">דשבורד הכנסות</div>
            <div className="text-white/60 text-xs mt-1">נתוני MRR והכנסות</div>
          </a>
        </div>

        {loading && <p className="text-white/60 mb-4">טוען...</p>}

        {/* Section 1 — Plans */}
        <div id="plans" />
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#C9A84C]">תוכניות מנוי</h2>
            <button
              onClick={() =>
                setEditPlan({
                  name: "",
                  slug: "",
                  price: 0,
                  currency: "ILS",
                  billingCycle: "monthly",
                  description: "",
                  isActive: true,
                  features: {
                    events: true,
                    suppliers: true,
                    raffles: true,
                    crm: false,
                    businessCard: false,
                    contracts: false,
                  },
                })
              }
              className="flex items-center gap-2 px-4 py-2 bg-[#C9A84C] text-black rounded-lg font-bold hover:opacity-90"
            >
              <Plus size={18} />
              הוסף תוכנית
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-[#0e0e0e] border rounded-xl p-5 ${
                  plan.isActive ? "border-[#C9A84C]/40" : "border-white/10 opacity-60"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-[#C9A84C]">{plan.name}</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditPlan(plan)}
                      className="p-1 text-white/60 hover:text-[#C9A84C]"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => deletePlan(plan)}
                      className="p-1 text-white/60 hover:text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-2xl font-bold mb-1">
                  ₪{Number(plan.price).toFixed(0)}
                  <span className="text-sm text-white/60 font-normal">
                    {" "}
                    / {plan.billingCycle === "monthly" ? "חודש" : plan.billingCycle}
                  </span>
                </p>
                <p className="text-xs text-white/50 mb-3">{plan.description}</p>
                <div className="space-y-1 mb-3">
                  {Object.entries(plan.features || {}).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2 text-sm">
                      {v ? (
                        <Check size={14} className="text-green-400" />
                      ) : (
                        <X size={14} className="text-red-400" />
                      )}
                      <span className="text-white/80">
                        {FEATURE_LABELS[k as keyof PlanFeatures] || k}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => togglePlanActive(plan)}
                  className="w-full px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-xs"
                >
                  {plan.isActive ? "השבת" : "הפעל"}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2 — Designers Subscriptions */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-[#C9A84C] mb-4 flex items-center gap-2">
            <Users size={20} /> מנויי מעצבות
          </h2>

          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חיפוש לפי שם..."
                className="w-full bg-[#0e0e0e] border border-white/10 rounded-lg px-9 py-2 text-sm"
              />
            </div>
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="bg-[#0e0e0e] border border-white/10 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">כל התוכניות</option>
              {plans.map((p) => (
                <option key={p.id} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#0e0e0e] border border-white/10 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">כל הסטטוסים</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-[#0e0e0e] border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-[#C9A84C]">
                <tr>
                  <th className="text-right p-3">שם</th>
                  <th className="text-right p-3">תוכנית</th>
                  <th className="text-right p-3">סטטוס</th>
                  <th className="text-right p-3">התחיל ב</th>
                  <th className="text-right p-3">מחיר</th>
                  <th className="text-right p-3">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-t border-white/5">
                    <td className="p-3">{d.fullName}</td>
                    <td className="p-3">{d.subscription?.plan?.name || "—"}</td>
                    <td className="p-3">
                      {d.subscription
                        ? STATUS_LABELS[d.subscription.status] || d.subscription.status
                        : "ללא מנוי"}
                    </td>
                    <td className="p-3 text-white/60">
                      {d.subscription?.startedAt
                        ? new Date(d.subscription.startedAt).toLocaleDateString("he-IL")
                        : "—"}
                    </td>
                    <td className="p-3">
                      {d.subscription?.plan
                        ? `₪${Number(d.subscription.plan.price).toFixed(0)}`
                        : "—"}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        <button
                          onClick={() => setChangePlanFor(d)}
                          className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-xs"
                        >
                          שנה תוכנית
                        </button>
                        {d.subscription && (
                          <>
                            <button
                              onClick={() => setGrantTrialFor(d)}
                              className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-xs"
                            >
                              הענק ניסיון
                            </button>
                            <button
                              onClick={() => cancelSub(d.subscription!)}
                              className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded text-xs"
                            >
                              בטל
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => promoteTo(d, "pro-discounted")}
                          className="px-2 py-1 bg-[#C9A84C]/20 hover:bg-[#C9A84C]/30 text-[#C9A84C] rounded text-xs"
                        >
                          מופחת
                        </button>
                        <button
                          onClick={() => promoteTo(d, "premium-free")}
                          className="px-2 py-1 bg-[#C9A84C]/20 hover:bg-[#C9A84C]/30 text-[#C9A84C] rounded text-xs"
                        >
                          פרימיום חינם
                        </button>
                        {d.subscription && (
                          <button
                            onClick={() =>
                              window.open(`/api/admin/subscriptions/${d.subscription!.id}`, "_blank")
                            }
                            className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-xs"
                          >
                            היסטוריה
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-white/50">
                      אין תוצאות
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 3 — Auto Promotion Rules */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#C9A84C]">חוקי קידום אוטומטי</h2>
            <div className="flex gap-2">
              <button
                onClick={runPromotion}
                className="flex items-center gap-2 px-4 py-2 bg-[#C9A84C] text-black rounded-lg font-bold hover:opacity-90"
              >
                <Play size={16} />
                הרץ בדיקת קידום עכשיו
              </button>
              <button
                onClick={() =>
                  setEditRule({
                    name: "",
                    minSupplierCount: 3,
                    timeWindowDays: 30,
                    targetPlanId: plans[0]?.id || null,
                    isActive: true,
                  })
                }
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg"
              >
                <Plus size={16} /> הוסף חוק
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {rules.map((r) => {
              const target = plans.find((p) => p.id === r.targetPlanId);
              return (
                <div
                  key={r.id}
                  className="bg-[#0e0e0e] border border-white/10 rounded-xl p-4 flex justify-between items-center"
                >
                  <div>
                    <p className="font-bold">{r.name}</p>
                    <p className="text-sm text-white/60">
                      מעצב/ת ששיתף/ה פעולה עם {r.minSupplierCount} ספקים תוך {r.timeWindowDays} ימים
                      תקבל את תוכנית {target?.name || "—"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditRule(r)}
                      className="p-2 text-white/60 hover:text-[#C9A84C]"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => deleteRule(r)}
                      className="p-2 text-white/60 hover:text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
            {rules.length === 0 && (
              <p className="text-white/50 text-sm">אין חוקים מוגדרים</p>
            )}
          </div>
        </section>

        {/* Section 4 — Trial Settings */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-[#C9A84C] mb-4 flex items-center gap-2">
            <Gift size={20} /> הגדרות תקופת ניסיון
          </h2>

          <div className="bg-[#0e0e0e] border border-white/10 rounded-xl p-5 mb-4">
            <label className="block text-sm text-white/80 mb-2">ברירת מחדל לימי ניסיון</label>
            <input
              type="number"
              value={defaultTrialDays}
              onChange={(e) => setDefaultTrialDays(Number(e.target.value))}
              className="bg-[#050505] border border-white/10 rounded px-3 py-2 w-32"
            />
          </div>

          <div className="bg-[#0e0e0e] border border-white/10 rounded-xl p-5">
            <h3 className="font-bold text-[#C9A84C] mb-3">תקופות ניסיון פעילות</h3>
            {activeTrials.length === 0 ? (
              <p className="text-white/50 text-sm">אין תקופות ניסיון פעילות</p>
            ) : (
              <div className="space-y-2">
                {activeTrials.map((d) => (
                  <div key={d.id} className="flex justify-between text-sm">
                    <span>{d.fullName}</span>
                    <span className="text-white/60">
                      עד{" "}
                      {d.subscription?.trialEndsAt &&
                        new Date(d.subscription.trialEndsAt).toLocaleDateString("he-IL")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Section 5 — iCount */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-[#C9A84C] mb-4 flex items-center gap-2">
            <SettingsIcon size={20} /> הגדרות iCount
          </h2>

          <div className="bg-[#0e0e0e] border border-white/10 rounded-xl p-5 space-y-4">
            <div>
              <label className="block text-sm text-white/80 mb-2">מפתח API של iCount</label>
              <input
                type="password"
                value={icountKey}
                onChange={(e) => setIcountKey(e.target.value)}
                placeholder="sk_..."
                className="w-full bg-[#050505] border border-white/10 rounded px-3 py-2"
              />
            </div>
            <button
              onClick={testIcount}
              className="flex items-center gap-2 px-4 py-2 bg-[#C9A84C] text-black rounded-lg font-bold"
            >
              <RefreshCw size={16} />
              בדוק חיבור
            </button>
            {icountTest && <p className="text-sm text-white/70">{icountTest}</p>}
            <div>
              <label className="block text-sm text-white/80 mb-2">כתובת Webhook</label>
              <code className="block bg-[#050505] border border-white/10 rounded px-3 py-2 text-xs text-[#C9A84C]">
                {webhookUrl}
              </code>
            </div>
          </div>
        </section>

        {/* Plan modal */}
        {editPlan && (
          <Modal onClose={() => setEditPlan(null)} title={editPlan.id ? "עריכת תוכנית" : "תוכנית חדשה"}>
            <div className="space-y-3">
              <Field label="שם">
                <input
                  value={editPlan.name || ""}
                  onChange={(e) => setEditPlan({ ...editPlan, name: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="מזהה (slug)">
                <input
                  value={editPlan.slug || ""}
                  onChange={(e) => setEditPlan({ ...editPlan, slug: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="מחיר">
                <input
                  type="number"
                  value={String(editPlan.price ?? 0)}
                  onChange={(e) =>
                    setEditPlan({ ...editPlan, price: Number(e.target.value) })
                  }
                  className="input"
                />
              </Field>
              <Field label="מחזור חיוב">
                <select
                  value={editPlan.billingCycle || "monthly"}
                  onChange={(e) => setEditPlan({ ...editPlan, billingCycle: e.target.value })}
                  className="input"
                >
                  <option value="monthly">חודשי</option>
                  <option value="yearly">שנתי</option>
                  <option value="lifetime">חד-פעמי</option>
                </select>
              </Field>
              <Field label="תיאור">
                <textarea
                  value={editPlan.description || ""}
                  onChange={(e) => setEditPlan({ ...editPlan, description: e.target.value })}
                  className="input"
                />
              </Field>
              <div className="space-y-1">
                <label className="text-sm text-white/70">פיצ'רים</label>
                {Object.keys(FEATURE_LABELS).map((k) => {
                  const key = k as keyof PlanFeatures;
                  const cur = (editPlan.features as PlanFeatures) || {
                    events: false,
                    suppliers: false,
                    raffles: false,
                    crm: false,
                    businessCard: false,
                    contracts: false,
                  };
                  return (
                    <label key={k} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!cur[key]}
                        onChange={(e) =>
                          setEditPlan({
                            ...editPlan,
                            features: { ...cur, [key]: e.target.checked },
                          })
                        }
                      />
                      {FEATURE_LABELS[key]}
                    </label>
                  );
                })}
              </div>
              <button
                onClick={savePlan}
                className="w-full px-4 py-2 bg-[#C9A84C] text-black rounded-lg font-bold"
              >
                שמור
              </button>
            </div>
          </Modal>
        )}

        {/* Rule modal */}
        {editRule && (
          <Modal onClose={() => setEditRule(null)} title={editRule.id ? "עריכת חוק" : "חוק חדש"}>
            <div className="space-y-3">
              <Field label="שם החוק">
                <input
                  value={editRule.name || ""}
                  onChange={(e) => setEditRule({ ...editRule, name: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="מספר ספקים מינימלי">
                <input
                  type="number"
                  value={editRule.minSupplierCount ?? 0}
                  onChange={(e) =>
                    setEditRule({ ...editRule, minSupplierCount: Number(e.target.value) })
                  }
                  className="input"
                />
              </Field>
              <Field label="חלון זמן (ימים)">
                <input
                  type="number"
                  value={editRule.timeWindowDays ?? 30}
                  onChange={(e) =>
                    setEditRule({ ...editRule, timeWindowDays: Number(e.target.value) })
                  }
                  className="input"
                />
              </Field>
              <Field label="תוכנית יעד">
                <select
                  value={editRule.targetPlanId || ""}
                  onChange={(e) => setEditRule({ ...editRule, targetPlanId: e.target.value })}
                  className="input"
                >
                  <option value="">בחר תוכנית</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!editRule.isActive}
                  onChange={(e) => setEditRule({ ...editRule, isActive: e.target.checked })}
                />
                חוק פעיל
              </label>
              <button
                onClick={saveRule}
                className="w-full px-4 py-2 bg-[#C9A84C] text-black rounded-lg font-bold"
              >
                שמור
              </button>
            </div>
          </Modal>
        )}

        {/* Change plan modal */}
        {changePlanFor && (
          <Modal onClose={() => setChangePlanFor(null)} title={`שנה תוכנית — ${changePlanFor.fullName}`}>
            <div className="space-y-2">
              {plans
                .filter((p) => p.isActive)
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={async () => {
                      await assignPlan(changePlanFor.id, p.id);
                      setChangePlanFor(null);
                    }}
                    className="w-full text-right p-3 bg-white/5 hover:bg-white/10 rounded-lg"
                  >
                    <div className="font-bold text-[#C9A84C]">{p.name}</div>
                    <div className="text-sm text-white/60">₪{Number(p.price).toFixed(0)}</div>
                  </button>
                ))}
            </div>
          </Modal>
        )}

        {/* Grant trial modal */}
        {grantTrialFor && grantTrialFor.subscription && (
          <Modal
            onClose={() => setGrantTrialFor(null)}
            title={`הענק תקופת ניסיון — ${grantTrialFor.fullName}`}
          >
            <TrialForm
              defaultDays={defaultTrialDays}
              onSubmit={async (days) => {
                await grantTrial(grantTrialFor.subscription!, days);
                setGrantTrialFor(null);
              }}
            />
          </Modal>
        )}
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          background: #050505;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 8px 12px;
          color: white;
        }
      `}</style>
    </div>
  );
}

function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        dir="rtl"
        className="bg-[#0e0e0e] border border-[#C9A84C]/40 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-[#C9A84C]">{title}</h3>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-white/70 mb-1">{label}</label>
      {children}
    </div>
  );
}

function TrialForm({
  defaultDays,
  onSubmit,
}: {
  defaultDays: number;
  onSubmit: (days: number) => void;
}) {
  const [days, setDays] = useState(defaultDays);
  return (
    <div className="space-y-3">
      <Field label="מספר ימים">
        <input
          type="number"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="w-full bg-[#050505] border border-white/10 rounded px-3 py-2 text-white"
        />
      </Field>
      <button
        onClick={() => onSubmit(days)}
        className="w-full px-4 py-2 bg-[#C9A84C] text-black rounded-lg font-bold"
      >
        הענק
      </button>
    </div>
  );
}
