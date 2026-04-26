"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  Plus,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Users,
  CreditCard,
  CheckCircle2,
  X,
  Link as LinkIcon,
} from "lucide-react";

interface ReferralDesigner {
  id: string;
  fullName: string;
  email: string | null;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  subscriptionStatus: string | null;
}

interface ReferralLink {
  id: string;
  code: string;
  partnerName: string;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  stats: { registered: number; approved: number; paid: number };
  designers: ReferralDesigner[];
}

const PAID_STATUSES = new Set(["active", "trialing", "grace", "past_due"]);

const APPROVAL_LABEL: Record<ReferralDesigner["approvalStatus"], string> = {
  PENDING: "ממתינה",
  APPROVED: "מאושרת",
  REJECTED: "נדחתה",
};

const APPROVAL_CLASS: Record<ReferralDesigner["approvalStatus"], string> = {
  PENDING: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  APPROVED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  REJECTED: "bg-red-500/10 text-red-500 border-red-500/20",
};

export default function AdminReferralsPage() {
  const [items, setItems] = useState<ReferralLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newPartnerName, setNewPartnerName] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/referrals", { cache: "no-store" });
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/admin/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCode,
          partnerName: newPartnerName,
          notes: newNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || "שגיאה ביצירה");
        return;
      }
      setNewCode("");
      setNewPartnerName("");
      setNewNotes("");
      setShowForm(false);
      load();
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (item: ReferralLink) => {
    await fetch("/api/admin/referrals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, active: !item.active }),
    });
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, active: !item.active } : it)));
  };

  const remove = async (item: ReferralLink) => {
    const has = item.stats.registered > 0;
    const msg = has
      ? `הלינק "${item.code}" כולל ${item.stats.registered} הרשמות. למחוק בכל זאת? (המעצבות יישארו, רק הקישוץ יוסר)`
      : `למחוק את הלינק "${item.code}"?`;
    if (!confirm(msg)) return;
    await fetch(`/api/admin/referrals?id=${item.id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((it) => it.id !== item.id));
  };

  const copy = async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1500);
    } catch {
      // fallback: select via prompt
      window.prompt("העתק את הלינק:", url);
    }
  };

  const totals = items.reduce(
    (acc, it) => {
      acc.registered += it.stats.registered;
      acc.approved += it.stats.approved;
      acc.paid += it.stats.paid;
      return acc;
    },
    { registered: 0, approved: 0, paid: 0 },
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-text-primary">
            לינקי שותפים — מעקב הרשמות
          </h1>
          <p className="text-sm text-text-muted mt-1 max-w-2xl">
            צור לינק ייעודי לשותף (לדוגמה: בית ספר לעיצוב). מעצבות שנרשמות דרך הלינק יקושצו אוטומטית
            ותוכלי לראות כמה נרשמו, כמה אושרו וכמה פתחו מנוי בתשלום.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gold hover:bg-gold-dark text-white font-semibold"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "סגירה" : "לינק חדש"}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="לינקים פעילים" value={items.filter((i) => i.active).length} icon={LinkIcon} />
        <StatCard label="סה״כ הרשמות" value={totals.registered} icon={Users} />
        <StatCard label="אושרו" value={totals.approved} icon={CheckCircle2} />
        <StatCard label="במנוי" value={totals.paid} icon={CreditCard} accent />
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-border-subtle bg-bg-card p-4 sm:p-5 shadow-sm space-y-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                קוד <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="BEZALEL"
                className="w-full px-3 py-2 rounded-lg bg-bg-surface-2 border border-border-subtle text-text-primary font-mono uppercase focus:outline-none focus:ring-2 focus:ring-gold/40"
                dir="ltr"
                maxLength={64}
                required
              />
              <p className="text-[11px] text-text-muted mt-1">אותיות לועזיות, ספרות, מקף או קו תחתון</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                שם השותף <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newPartnerName}
                onChange={(e) => setNewPartnerName(e.target.value)}
                placeholder="בית ספר בצלאל"
                className="w-full px-3 py-2 rounded-lg bg-bg-surface-2 border border-border-subtle text-text-primary focus:outline-none focus:ring-2 focus:ring-gold/40"
                maxLength={120}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              הערות (אופציונלי)
            </label>
            <textarea
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="לדוגמה: עמלה 20% למנוי בתשלום, איש קשר: ..."
              className="w-full px-3 py-2 rounded-lg bg-bg-surface-2 border border-border-subtle text-text-primary focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </div>
          {createError && (
            <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              {createError}
            </div>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 rounded-lg bg-gold hover:bg-gold-dark text-white font-semibold inline-flex items-center gap-2 disabled:opacity-60"
            >
              {creating && <Loader2 className="w-4 h-4 animate-spin" />}
              יצירת לינק
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="py-12 flex items-center justify-center text-text-muted">
          <Loader2 className="w-5 h-5 animate-spin ml-2" /> טוען...
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-text-muted">אין לינקים עדיין — צרי את הראשון</div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => {
            const url = `${origin}/register?ref=${encodeURIComponent(it.code)}`;
            const expanded = expandedId === it.id;
            const conv = it.stats.registered > 0
              ? Math.round((it.stats.paid / it.stats.registered) * 100)
              : 0;
            return (
              <article
                key={it.id}
                className={`rounded-xl border bg-bg-card p-4 sm:p-5 shadow-sm ${
                  it.active ? "border-border-subtle" : "border-border-subtle opacity-60"
                }`}
              >
                <header className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-heading font-bold text-text-primary">{it.partnerName}</h3>
                      <code className="px-2 py-0.5 rounded bg-bg-surface-2 text-text-primary text-xs font-mono">
                        {it.code}
                      </code>
                      {!it.active && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-text-muted/10 text-text-muted">
                          מושבת
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-muted" dir="ltr">
                      <span className="truncate max-w-md select-all" title={url}>
                        {url}
                      </span>
                      <button
                        type="button"
                        onClick={() => copy(it.id, url)}
                        className="p-1 rounded hover:bg-bg-surface-2 text-text-muted hover:text-gold"
                        title="העתק"
                      >
                        {copiedId === it.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded hover:bg-bg-surface-2 text-text-muted hover:text-gold"
                        title="פתח"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    {it.notes && (
                      <p className="text-xs text-text-muted mt-2 whitespace-pre-wrap">{it.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleActive(it)}
                      className="p-1.5 rounded-lg hover:bg-bg-surface-2 text-text-muted hover:text-gold"
                      title={it.active ? "השבת" : "הפעל"}
                    >
                      {it.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(it)}
                      className="p-1.5 rounded-lg hover:bg-bg-surface-2 text-text-muted hover:text-red-500"
                      title="מחק"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </header>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <MiniStat label="נרשמו" value={it.stats.registered} />
                  <MiniStat label="אושרו" value={it.stats.approved} />
                  <MiniStat label="במנוי" value={it.stats.paid} accent />
                  <MiniStat label="המרה" value={`${conv}%`} />
                </div>

                {it.designers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : it.id)}
                    className="mt-3 text-xs text-gold hover:underline inline-flex items-center gap-1"
                  >
                    {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {expanded ? "הסתרת רשימה" : `הצגת רשימת מעצבות (${it.designers.length})`}
                  </button>
                )}

                {expanded && it.designers.length > 0 && (
                  <div className="mt-3 border-t border-border-subtle pt-3 space-y-1.5">
                    {it.designers.map((d) => {
                      const isPaid = d.subscriptionStatus && PAID_STATUSES.has(d.subscriptionStatus);
                      return (
                        <div
                          key={d.id}
                          className="flex flex-wrap items-center gap-2 text-xs px-2 py-1.5 rounded bg-bg-surface-2"
                        >
                          <span className="font-medium text-text-primary">{d.fullName}</span>
                          {d.email && (
                            <span className="text-text-muted" dir="ltr">
                              {d.email}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded border ${APPROVAL_CLASS[d.approvalStatus]}`}>
                            {APPROVAL_LABEL[d.approvalStatus]}
                          </span>
                          {isPaid && (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              במנוי {d.subscriptionStatus}
                            </span>
                          )}
                          <span className="ms-auto text-text-muted">
                            {new Date(d.createdAt).toLocaleDateString("he-IL")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className={`text-2xl font-bold mt-1 ${accent ? "text-gold" : "text-text-primary"}`}>
        {value}
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-bg-surface-2 px-3 py-2">
      <div className="text-[11px] text-text-muted">{label}</div>
      <div className={`text-base font-bold ${accent ? "text-gold" : "text-text-primary"}`}>{value}</div>
    </div>
  );
}
