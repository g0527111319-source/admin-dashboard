"use client";

import { useEffect, useState, FormEvent } from "react";
import { Check, Copy, Power, Trash2, Ticket, Calendar, Hash } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

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
  const [showInactive, setShowInactive] = useState(false);

  // Form state
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed" | "free_months">("percent");
  const [discountValue, setDiscountValue] = useState<string>("10");
  const [durationMonths, setDurationMonths] = useState<string>("1");
  const [maxRedemptions, setMaxRedemptions] = useState<string>("");
  const [validFrom, setValidFrom] = useState<string>("");
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
    setValidFrom("");
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
          validFrom: validFrom || null,
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
    if (c.isActive && !confirm(`להשבית את הקופון "${c.code}"? ניתן להפעיל אותו מחדש אחר כך.`)) return;
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
    <div dir="rtl" className="flex flex-col gap-8">
      {/* Create form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gold-50 text-gold">
              <Ticket className="w-5 h-5" />
            </span>
            יצירת קופון חדש
          </CardTitle>
          <CardDescription>צרי קופון הנחה חדש לשימוש המעצבות</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="code" required>קוד</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="WELCOME10"
                  className="font-mono tracking-wider uppercase"
                />
              </div>
              <div>
                <Label htmlFor="description" optional>תיאור</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="הנחת ברוכים הבאים"
                />
              </div>
              <div>
                <Label htmlFor="discountValue" required>ערך הנחה</Label>
                <Input
                  id="discountValue"
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="durationMonths" required>משך (חודשים)</Label>
                <Input
                  id="durationMonths"
                  type="number"
                  min={1}
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="maxRedemptions" optional>מקסימום מימושים</Label>
                <Input
                  id="maxRedemptions"
                  type="number"
                  value={maxRedemptions}
                  onChange={(e) => setMaxRedemptions(e.target.value)}
                  placeholder="ללא הגבלה"
                />
              </div>
              <div>
                <Label htmlFor="validFrom" optional>תקף מתאריך</Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="validUntil" optional>תוקף עד</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>סוג הנחה</Label>
              <div className="flex gap-3 flex-wrap">
                {(["percent", "fixed", "free_months"] as const).map((t) => {
                  const selected = discountType === t;
                  return (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setDiscountType(t)}
                      className={cn(
                        "px-4 py-2 rounded-btn text-sm font-medium transition-all duration-200 border",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-1",
                        selected
                          ? "bg-gold text-white border-gold shadow-gold"
                          : "bg-white text-text-secondary border-border-subtle hover:border-gold/50 hover:text-gold"
                      )}
                    >
                      {DISCOUNT_TYPE_LABELS[t]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label>תוכניות רלוונטיות <span className="font-normal text-xs text-text-faint">(ריק = כל התוכניות)</span></Label>
              <div className="flex flex-wrap gap-2 p-3 rounded-btn bg-bg-surface border border-border-subtle">
                {plans.length === 0 && (
                  <span className="text-text-faint text-sm">אין תוכניות זמינות</span>
                )}
                {plans.map((p) => {
                  const selected = applicablePlanIds.includes(p.id);
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => togglePlanInForm(p.id)}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-xs font-medium border transition-all duration-200",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-1",
                        selected
                          ? "bg-gold text-white border-gold shadow-gold"
                          : "bg-white text-text-secondary border-border-subtle hover:border-gold/40"
                      )}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {errorMsg && (
              <div className="rounded-btn bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {errorMsg}
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button type="submit" loading={submitting} size="lg">
                {submitting ? "שומר..." : "צור קופון"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Coupons list */}
      <section>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="font-heading text-xl font-bold text-text-primary tracking-tight">
            קופונים קיימים
          </h2>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="w-4 h-4 accent-gold"
              />
              הצג גם לא פעילים
            </label>
            {!loading && coupons.length > 0 && (
              <Badge variant="outline" size="sm">
                {coupons.filter((c) => showInactive || c.isActive).length} קופונים
              </Badge>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} padding="md">
                <div className="flex items-center gap-4">
                  <Skeleton variant="circle" className="w-10 h-10" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : coupons.filter((c) => showInactive || c.isActive).length === 0 ? (
          <Card padding="lg">
            <EmptyState
              icon={<Ticket />}
              title={coupons.length === 0 ? "אין קופונים עדיין" : "אין קופונים פעילים"}
              description={coupons.length === 0 ? "צרי קופון ראשון בטופס למעלה." : "סמני ״הצג גם לא פעילים״ כדי לראות קופונים שהושבתו."}
            />
          </Card>
        ) : (
          <div className="grid gap-3">
            {coupons.filter((c) => showInactive || c.isActive).map((c) => {
              const active = c.isActive;
              const used = c._count?.redemptions ?? c.redemptionCount ?? 0;
              return (
                <Card
                  key={c.id}
                  padding="md"
                  variant={active ? "gold" : "static"}
                  className={cn("transition-opacity", !active && "opacity-60")}
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 items-center">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-text-faint mb-1 flex items-center gap-1">
                        <Hash className="w-3 h-3" /> קוד
                      </div>
                      <div className="font-mono text-base text-gold font-bold tracking-wider">
                        {c.code}
                      </div>
                    </div>
                    <div className="col-span-1 md:col-span-1 lg:col-span-1">
                      <div className="text-[10px] uppercase tracking-wider text-text-faint mb-1">תיאור</div>
                      <div className="text-sm text-text-primary truncate">{c.description || "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-text-faint mb-1">הנחה</div>
                      <div className="text-sm font-semibold text-text-primary">{formatDiscount(c)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-text-faint mb-1">מומשו</div>
                      <div className="text-sm text-text-primary">
                        {used}
                        {c.maxRedemptions && (
                          <span className="text-text-faint">/{c.maxRedemptions}</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-text-faint mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> תוקף עד
                      </div>
                      <div className="text-sm text-text-primary">{formatDate(c.validUntil)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-text-faint mb-1">סטטוס</div>
                      <Badge variant={active ? "green" : "gray"} size="sm" dot>
                        {active ? "פעיל" : "לא פעיל"}
                      </Badge>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end col-span-2 md:col-span-4 lg:col-span-1">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => copyCode(c)}
                        iconLeft={copiedId === c.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      >
                        {copiedId === c.id ? "הועתק" : "העתק"}
                      </Button>
                      <Button
                        variant={active ? "danger" : "secondary"}
                        size="xs"
                        onClick={() => toggleActive(c)}
                        iconLeft={active ? <Trash2 className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                      >
                        {active ? "השבת" : "הפעל מחדש"}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
