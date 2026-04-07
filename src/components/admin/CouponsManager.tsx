"use client";

import { useEffect, useState, FormEvent } from "react";

type Plan = {
  id: string;
  name: string;
  slug: string;
  price: string | number;
};

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discountType: "percent" | "fixed" | "free_months" | string;
  discountValue: string | number;
  durationMonths: number;
  maxRedemptions: number | null;
  redemptionCount: number;
  validFrom: string;
  validUntil: string | null;
  applicablePlanIds: string[];
  isActive: boolean;
  createdAt: string;
  _count?: { redemptions: number };
};

type Props = {
  plans: Plan[];
};

const GOLD = "#C9A84C";
const BG = "#0e0e0e";
const BG_DEEP = "#050505";
const BORDER = "rgba(255,255,255,0.1)";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: BG_DEEP,
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: "8px 12px",
  color: "white",
  fontSize: 14,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  color: "rgba(255,255,255,0.7)",
  marginBottom: 6,
};

const buttonPrimary: React.CSSProperties = {
  background: GOLD,
  color: "#000",
  border: "none",
  borderRadius: 8,
  padding: "10px 18px",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 14,
};

const buttonSecondary: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  color: "white",
  border: `1px solid ${BORDER}`,
  borderRadius: 6,
  padding: "6px 12px",
  cursor: "pointer",
  fontSize: 12,
};

const buttonDanger: React.CSSProperties = {
  ...buttonSecondary,
  background: "rgba(239,68,68,0.15)",
  color: "#fca5a5",
  border: "1px solid rgba(239,68,68,0.3)",
};

const DISCOUNT_TYPE_LABELS: Record<string, string> = {
  percent: "אחוזים",
  fixed: "סכום קבוע",
  free_months: "חודשים חינם",
};

function formatDiscount(c: Coupon): string {
  const v = Number(c.discountValue);
  if (c.discountType === "percent") return `${v}%`;
  if (c.discountType === "fixed") return `₪${v}`;
  if (c.discountType === "free_months") return `${v} חודשים חינם`;
  return String(v);
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("he-IL");
  } catch {
    return "—";
  }
}

export default function CouponsManager({ plans }: Props) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed" | "free_months">("percent");
  const [discountValue, setDiscountValue] = useState<string>("10");
  const [durationMonths, setDurationMonths] = useState<string>("1");
  const [maxRedemptions, setMaxRedemptions] = useState<string>("");
  const [validUntil, setValidUntil] = useState<string>("");
  const [applicablePlanIds, setApplicablePlanIds] = useState<string[]>([]);

  const loadCoupons = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/coupons");
      const data = await res.json();
      setCoupons(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setErrorMsg("שגיאה בטעינת קופונים");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const resetForm = () => {
    setCode("");
    setDescription("");
    setDiscountType("percent");
    setDiscountValue("10");
    setDurationMonths("1");
    setMaxRedemptions("");
    setValidUntil("");
    setApplicablePlanIds([]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!code.trim()) {
      setErrorMsg("יש להזין קוד קופון");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          description: description.trim() || null,
          discountType,
          discountValue: Number(discountValue) || 0,
          durationMonths: Number(durationMonths) || 1,
          maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
          validUntil: validUntil || null,
          applicablePlanIds,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data?.error || "שגיאה ביצירת קופון");
      } else {
        resetForm();
        await loadCoupons();
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("שגיאה ביצירת קופון");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (c: Coupon) => {
    try {
      await fetch(`/api/admin/coupons/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !c.isActive }),
      });
      await loadCoupons();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteCoupon = async (c: Coupon) => {
    if (!confirm(`להשבית את הקופון "${c.code}"? המימושים הקיימים יישמרו.`)) return;
    try {
      await fetch(`/api/admin/coupons/${c.id}`, { method: "DELETE" });
      await loadCoupons();
    } catch (err) {
      console.error(err);
    }
  };

  const copyCode = async (c: Coupon) => {
    try {
      await navigator.clipboard.writeText(c.code);
      setCopiedId(c.id);
      setTimeout(() => setCopiedId((cur) => (cur === c.id ? null : cur)), 1500);
    } catch (err) {
      console.error(err);
    }
  };

  const togglePlanInForm = (planId: string) => {
    setApplicablePlanIds((prev) =>
      prev.includes(planId) ? prev.filter((x) => x !== planId) : [...prev, planId],
    );
  };

  return (
    <div dir="rtl" style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* Create form */}
      <section
        style={{
          background: BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          padding: 24,
        }}
      >
        <h2 style={{ color: GOLD, fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
          יצירת קופון חדש
        </h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            <div>
              <label style={labelStyle}>קוד</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="WELCOME10"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>תיאור</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="הנחת ברוכים הבאים"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>ערך הנחה</label>
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>משך (חודשים)</label>
              <input
                type="number"
                min={1}
                value={durationMonths}
                onChange={(e) => setDurationMonths(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>מקסימום מימושים (אופציונלי)</label>
              <input
                type="number"
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(e.target.value)}
                placeholder="ללא הגבלה"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>תוקף עד</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>סוג הנחה</label>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {(["percent", "fixed", "free_months"] as const).map((t) => (
                <label
                  key={t}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 14,
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="discountType"
                    checked={discountType === t}
                    onChange={() => setDiscountType(t)}
                  />
                  {DISCOUNT_TYPE_LABELS[t]}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>תוכניות רלוונטיות (ריק = כל התוכניות)</label>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                background: BG_DEEP,
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                padding: 10,
              }}
            >
              {plans.length === 0 && (
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                  אין תוכניות זמינות
                </span>
              )}
              {plans.map((p) => {
                const selected = applicablePlanIds.includes(p.id);
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => togglePlanInForm(p.id)}
                    style={{
                      background: selected ? GOLD : "rgba(255,255,255,0.05)",
                      color: selected ? "#000" : "white",
                      border: selected ? `1px solid ${GOLD}` : `1px solid ${BORDER}`,
                      borderRadius: 999,
                      padding: "6px 14px",
                      fontSize: 12,
                      cursor: "pointer",
                      fontWeight: selected ? 700 : 400,
                    }}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          {errorMsg && (
            <div style={{ color: "#fca5a5", fontSize: 13 }}>{errorMsg}</div>
          )}

          <div>
            <button type="submit" disabled={submitting} style={buttonPrimary}>
              {submitting ? "שומר..." : "צור קופון"}
            </button>
          </div>
        </form>
      </section>

      {/* Coupons table */}
      <section>
        <h2 style={{ color: GOLD, fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
          קופונים קיימים
        </h2>
        {loading ? (
          <p style={{ color: "rgba(255,255,255,0.6)" }}>טוען...</p>
        ) : coupons.length === 0 ? (
          <p style={{ color: "rgba(255,255,255,0.5)" }}>אין קופונים עדיין</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {coupons.map((c) => {
              const active = c.isActive;
              const used = c._count?.redemptions ?? c.redemptionCount ?? 0;
              return (
                <div
                  key={c.id}
                  style={{
                    background: BG,
                    border: active ? `1px solid ${GOLD}` : `1px solid ${BORDER}`,
                    borderRadius: 12,
                    padding: 16,
                    opacity: active ? 1 : 0.55,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>קוד</div>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 16,
                        color: GOLD,
                        fontWeight: 700,
                      }}
                    >
                      {c.code}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>תיאור</div>
                    <div style={{ fontSize: 13, color: "white" }}>
                      {c.description || "—"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>הנחה</div>
                    <div style={{ fontSize: 13, color: "white" }}>{formatDiscount(c)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>מומשו</div>
                    <div style={{ fontSize: 13, color: "white" }}>{used}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>מקסימום</div>
                    <div style={{ fontSize: 13, color: "white" }}>
                      {c.maxRedemptions ?? "∞"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>תוקף עד</div>
                    <div style={{ fontSize: 13, color: "white" }}>
                      {formatDate(c.validUntil)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>סטטוס</div>
                    <div
                      style={{
                        display: "inline-block",
                        background: active
                          ? "rgba(34,197,94,0.15)"
                          : "rgba(255,255,255,0.08)",
                        color: active ? "#86efac" : "rgba(255,255,255,0.6)",
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {active ? "פעיל" : "לא פעיל"}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                      justifyContent: "flex-end",
                    }}
                  >
                    <button onClick={() => copyCode(c)} style={buttonSecondary}>
                      {copiedId === c.id ? "הועתק!" : "העתק"}
                    </button>
                    <button onClick={() => toggleActive(c)} style={buttonSecondary}>
                      {active ? "השבת" : "הפעל"}
                    </button>
                    <button onClick={() => deleteCoupon(c)} style={buttonDanger}>
                      מחק
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
