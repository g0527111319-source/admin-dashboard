"use client";
// Admin lead detail page.
//
// Top half = full lead data + admin notes + status actions.
// Bottom half = community workflow:
//   1. "Post to Community" → anonymized feed goes live for designers.
//   2. Interests roll in — admin sees each designer's deal count, specialty,
//      and subscription status (paid / free) to decide who to pick.
//   3. Admin checks up to 3 designers and clicks "Assign" — they get the
//      lead in their CRM inbox and an email.
//   4. Assignments tab shows which designers got it, if they viewed it,
//      dismissed, or converted to a CRM client (commission tracking).

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, Loader2, AlertTriangle, User, Phone, Mail, MapPin, Home, Ruler,
  Banknote, Clock, Palette, MessageSquare, Send, Archive, Trash2, RotateCw,
  CheckCircle2, Sparkles, Users, Eye, EyeOff, XCircle, CreditCard, Star,
  TrendingUp, Save, AlertCircle,
} from "lucide-react";

type LeadStatus = "NEW" | "REVIEWING" | "POSTED_TO_COMMUNITY" | "DISTRIBUTED" | "CONVERTED" | "ARCHIVED";

interface InterestRow {
  id: string;
  createdAt: string;
  designer: {
    id: string;
    fullName: string;
    city: string | null;
    specialization: string | null;
    yearsExperience: number | null;
    totalDealsReported: number | null;
    totalDealAmount: number | null;
    subscription: null | {
      status: string;
      plan: { slug: string; name: string; price: number } | null;
    };
  };
}

interface AssignmentRow {
  id: string;
  assignedAt: string;
  viewedAt: string | null;
  dismissedAt: string | null;
  convertedAt: string | null;
  convertedToClientId: string | null;
  designer: {
    id: string;
    fullName: string;
    city: string | null;
    email: string | null;
    phone: string | null;
  };
}

interface LeadFull {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string | null;
  city: string;
  sizeSqm: number | null;
  scope: string;
  renovationBudget: number | null;
  designerBudget: number | null;
  startTiming: string | null;
  stylePreference: string | null;
  additionalNotes: string | null;
  status: LeadStatus;
  source: string;
  consentedAt: string;
  ipAddress: string | null;
  postedToCommunityAt: string | null;
  distributedAt: string | null;
  convertedAt: string | null;
  convertedByDesignerId: string | null;
  convertedToClientId: string | null;
  archivedAt: string | null;
  adminNotes: string | null;
  createdAt: string;
  interests: InterestRow[];
  assignments: AssignmentRow[];
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "חדש",
  REVIEWING: "בבדיקה",
  POSTED_TO_COMMUNITY: "פורסם לקהילה",
  DISTRIBUTED: "הוקצה למעצבות",
  CONVERTED: "הומר ללקוח",
  ARCHIVED: "בארכיון",
};

const STATUS_COLORS: Record<LeadStatus, string> = {
  NEW: "text-blue-600 bg-blue-50 border-blue-200",
  REVIEWING: "text-amber-600 bg-amber-50 border-amber-200",
  POSTED_TO_COMMUNITY: "text-purple-600 bg-purple-50 border-purple-200",
  DISTRIBUTED: "text-indigo-600 bg-indigo-50 border-indigo-200",
  CONVERTED: "text-emerald-600 bg-emerald-50 border-emerald-200",
  ARCHIVED: "text-gray-500 bg-gray-100 border-gray-300",
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("he-IL") + " " + d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

function fmtMoney(v: number | null | undefined): string {
  if (v == null) return "—";
  return `₪${v.toLocaleString("he-IL")}`;
}

export default function AdminLeadDetailPage() {
  const params = useParams<{ leadId: string }>();
  const router = useRouter();
  const leadId = params?.leadId as string;

  const [lead, setLead] = useState<LeadFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [savedNotes, setSavedNotes] = useState(false);
  const [selectedDesignerIds, setSelectedDesignerIds] = useState<Set<string>>(new Set());
  const [assignError, setAssignError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("fetch failed");
      const data = (await res.json()) as { lead: LeadFull };
      setLead(data.lead);
      setAdminNotes(data.lead.adminNotes || "");
      setSelectedDesignerIds(new Set());
    } catch {
      setError("שגיאה בטעינת הליד");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    if (leadId) load();
  }, [leadId, load]);

  const updateLead = async (body: Record<string, unknown>, action: string) => {
    setBusy(action);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        alert(err.error || "שגיאה");
      } else {
        await load();
      }
    } finally {
      setBusy(null);
    }
  };

  const saveNotes = async () => {
    setBusy("notes");
    try {
      await fetch(`/api/admin/leads/${leadId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ adminNotes }),
      });
      setSavedNotes(true);
      setTimeout(() => setSavedNotes(false), 2000);
    } finally {
      setBusy(null);
    }
  };

  const postToCommunity = async () => {
    if (!confirm("לפרסם את הליד בפיד הקהילה? הפרטים יוצגו לכל המעצבות בצורה אנונימית.")) return;
    setBusy("post-community");
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/post-community`, { method: "POST" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        alert(err.error || "שגיאה");
      } else {
        await load();
      }
    } finally {
      setBusy(null);
    }
  };

  const deleteLead = async () => {
    if (!confirm("למחוק את הליד לצמיתות? פעולה זו בלתי הפיכה.")) return;
    setBusy("delete");
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, { method: "DELETE" });
      if (res.ok) router.push("/admin/leads");
      else alert("שגיאה במחיקה");
    } finally {
      setBusy(null);
    }
  };

  const toggleDesigner = (id: string) => {
    setSelectedDesignerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        if (next.size >= 3) {
          setAssignError("אפשר לבחור עד 3 מעצבות");
          return prev;
        }
        next.add(id);
      }
      setAssignError(null);
      return next;
    });
  };

  const assignDesigners = async () => {
    if (selectedDesignerIds.size === 0 || selectedDesignerIds.size > 3) {
      setAssignError("יש לבחור בין מעצבת אחת לשלוש");
      return;
    }
    if (!confirm(`להקצות את הליד ל-${selectedDesignerIds.size} מעצבות? הן יקבלו את הפרטים המלאים במערכת CRM + אימייל.`)) return;
    setBusy("assign");
    setAssignError(null);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/assign`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ designerIds: Array.from(selectedDesignerIds) }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setAssignError(err.error || "שגיאה");
      } else {
        await load();
      }
    } finally {
      setBusy(null);
    }
  };

  const subscriptionBadge = (sub: InterestRow["designer"]["subscription"]) => {
    if (!sub || sub.status !== "active") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
          <CreditCard className="w-3 h-3" /> חינמי
        </span>
      );
    }
    const paid = sub.plan && sub.plan.price > 0;
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${
        paid ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-blue-50 text-blue-700 border border-blue-200"
      }`}>
        <CreditCard className="w-3 h-3" /> {sub.plan?.name || "מנוי"}
      </span>
    );
  };

  const canPostToCommunity = useMemo(() => {
    if (!lead) return false;
    return ["NEW", "REVIEWING"].includes(lead.status);
  }, [lead]);

  const canAssign = useMemo(() => {
    if (!lead) return false;
    return ["NEW", "REVIEWING", "POSTED_TO_COMMUNITY", "DISTRIBUTED"].includes(lead.status);
  }, [lead]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted gap-2">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>טוען ליד...</span>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="text-center py-20 text-red-500">
        <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-60" />
        <p>{error || "הליד לא נמצא"}</p>
        <Link href="/admin/leads" className="btn-outline mt-4 inline-flex items-center gap-2">
          <ArrowRight className="w-4 h-4" /> חזרה לרשימה
        </Link>
      </div>
    );
  }

  const leadName = `${lead.firstName} ${lead.lastName}`.trim();

  return (
    <div className="space-y-6 animate-in">
      {/* Back nav */}
      <Link href="/admin/leads" className="inline-flex items-center gap-1 text-text-muted hover:text-gold text-sm transition-colors">
        <ArrowRight className="w-4 h-4" />חזרה לרשימת הלידים
      </Link>

      {/* Header */}
      <div className="card-static">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center text-gold text-xl font-bold flex-shrink-0">
              {lead.firstName?.[0] || "?"}
            </div>
            <div>
              <h1 className="text-2xl font-heading text-text-primary">{leadName}</h1>
              <p className="text-text-muted text-sm mt-0.5">
                התקבל ב-{fmtDate(lead.createdAt)} · מקור: {lead.source}
              </p>
              <span className={`inline-block text-xs mt-2 px-2.5 py-1 rounded-full font-medium border ${STATUS_COLORS[lead.status]}`}>
                {STATUS_LABELS[lead.status]}
              </span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {lead.status === "NEW" && (
              <button
                onClick={() => updateLead({ status: "REVIEWING" }, "reviewing")}
                disabled={!!busy}
                className="btn-outline flex items-center gap-2 text-sm"
              >
                <Sparkles className="w-4 h-4" /> התחל בדיקה
              </button>
            )}
            {lead.status !== "ARCHIVED" ? (
              <button
                onClick={() => updateLead({ status: "ARCHIVED" }, "archive")}
                disabled={!!busy}
                className="btn-outline flex items-center gap-2 text-sm"
              >
                <Archive className="w-4 h-4" /> ארכיון
              </button>
            ) : (
              <button
                onClick={() => updateLead({ restore: true }, "restore")}
                disabled={!!busy}
                className="btn-outline flex items-center gap-2 text-sm"
              >
                <RotateCw className="w-4 h-4" /> שחזר
              </button>
            )}
            <button
              onClick={deleteLead}
              disabled={!!busy}
              className="btn-outline !border-red-300 !text-red-600 hover:!bg-red-50 flex items-center gap-2 text-sm"
            >
              <Trash2 className="w-4 h-4" /> מחיקה
            </button>
          </div>
        </div>

        {/* Lead data grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6 pt-6 border-t border-border/30">
          <DataField icon={User} label="שם מלא" value={leadName} />
          <DataField icon={Phone} label="טלפון" value={<a href={`tel:${lead.phone}`} className="hover:text-gold" dir="ltr">{lead.phone}</a>} />
          <DataField icon={Mail} label="אימייל" value={<a href={`mailto:${lead.email}`} className="hover:text-gold" dir="ltr">{lead.email}</a>} />
          <DataField icon={Home} label="כתובת הנכס" value={lead.address || "—"} />
          <DataField icon={MapPin} label="עיר" value={lead.city || "—"} />
          <DataField icon={Ruler} label="גודל הדירה" value={lead.sizeSqm ? `${lead.sizeSqm} מ״ר` : "—"} />
          <DataField icon={Banknote} label="תקציב שיפוץ" value={fmtMoney(lead.renovationBudget)} />
          <DataField icon={Banknote} label="תקציב למעצבת" value={fmtMoney(lead.designerBudget)} />
          <DataField icon={Clock} label="תזמון התחלה" value={lead.startTiming || "—"} />
          <DataField icon={Palette} label="סגנון מועדף" value={lead.stylePreference || "—"} />
        </div>

        {/* Scope */}
        <div className="mt-5 pt-5 border-t border-border/30">
          <h3 className="text-text-muted text-xs font-medium mb-2 flex items-center gap-1">
            <Home className="w-3 h-3" /> פירוט השיפוץ
          </h3>
          <p className="text-text-primary whitespace-pre-wrap bg-bg-surface/50 rounded-card p-3 text-sm">
            {lead.scope || "—"}
          </p>
        </div>

        {/* Additional notes */}
        {lead.additionalNotes && (
          <div className="mt-5 pt-5 border-t border-border/30">
            <h3 className="text-text-muted text-xs font-medium mb-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> דגש נוסף מהלקוח
            </h3>
            <p className="text-text-primary whitespace-pre-wrap bg-gold/5 border border-gold/20 rounded-card p-3 text-sm">
              {lead.additionalNotes}
            </p>
          </div>
        )}

        {/* Timeline */}
        <div className="mt-5 pt-5 border-t border-border/30 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {lead.postedToCommunityAt && <TimelineItem label="פורסם לקהילה" ts={lead.postedToCommunityAt} />}
          {lead.distributedAt && <TimelineItem label="הוקצה למעצבות" ts={lead.distributedAt} />}
          {lead.convertedAt && <TimelineItem label="הומר ללקוח" ts={lead.convertedAt} />}
          {lead.archivedAt && <TimelineItem label="הועבר לארכיון" ts={lead.archivedAt} />}
        </div>
      </div>

      {/* Admin notes */}
      <div className="card-static">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-text-primary font-heading flex items-center gap-2">
            <MessageSquare className="w-5 h-5" /> הערות פנימיות
          </h3>
          {savedNotes && <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> נשמר</span>}
        </div>
        <textarea
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          rows={3}
          className="input-dark w-full resize-none"
          placeholder="הערות למעקב פנימי (לא נשלחות לאף אחד)"
        />
        <button
          onClick={saveNotes}
          disabled={busy === "notes"}
          className="btn-outline mt-2 text-sm flex items-center gap-2"
        >
          {busy === "notes" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          שמור הערות
        </button>
      </div>

      {/* Community workflow */}
      <div className="card-static">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-text-primary font-heading flex items-center gap-2">
              <Users className="w-5 h-5" /> פיד הקהילה
            </h3>
            <p className="text-text-muted text-xs mt-1">
              פרסום לכל המעצבות (בצורה אנונימית) → איסוף הבעות עניין → בחירה של עד 3 מעצבות.
            </p>
          </div>
          {canPostToCommunity && (
            <button
              onClick={postToCommunity}
              disabled={!!busy}
              className="btn-gold flex items-center gap-2 text-sm"
            >
              <Send className="w-4 h-4" /> פרסם לקהילה
            </button>
          )}
          {lead.status === "POSTED_TO_COMMUNITY" && (
            <span className="text-xs text-purple-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> הליד פורסם בפיד, מחכים להבעות עניין
            </span>
          )}
        </div>

        {/* Interests table */}
        {lead.interests.length > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <h4 className="text-text-primary font-medium flex items-center gap-2">
                <Star className="w-4 h-4 text-gold" /> מעצבות שהביעו עניין
                <span className="text-text-muted text-sm">({lead.interests.length})</span>
              </h4>
              {canAssign && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-text-muted text-xs">
                    נבחרו {selectedDesignerIds.size} / 3
                  </span>
                  <button
                    onClick={assignDesigners}
                    disabled={!!busy || selectedDesignerIds.size === 0}
                    className="btn-gold flex items-center gap-2 text-sm disabled:opacity-40"
                  >
                    {busy === "assign" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    הקצה לנבחרות
                  </button>
                </div>
              )}
            </div>
            {assignError && (
              <div className="mb-3 text-xs text-red-600 flex items-center gap-1 bg-red-50 border border-red-200 px-3 py-2 rounded">
                <AlertTriangle className="w-4 h-4" /> {assignError}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full table-luxury">
                <thead>
                  <tr>
                    {canAssign && <th style={{ width: 40 }}>בחר</th>}
                    <th>מעצבת</th>
                    <th>עסקאות בקהילה</th>
                    <th>התמחות</th>
                    <th>ניסיון</th>
                    <th>מנוי</th>
                    <th>הביעה עניין</th>
                  </tr>
                </thead>
                <tbody>
                  {lead.interests.map((i) => {
                    const selected = selectedDesignerIds.has(i.designer.id);
                    return (
                      <tr
                        key={i.id}
                        className={canAssign ? "cursor-pointer" : ""}
                        onClick={canAssign ? () => toggleDesigner(i.designer.id) : undefined}
                      >
                        {canAssign && (
                          <td>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleDesigner(i.designer.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 accent-gold cursor-pointer"
                            />
                          </td>
                        )}
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold text-sm font-bold">
                              {i.designer.fullName[0]}
                            </div>
                            <div>
                              <p className="text-text-primary font-medium text-sm">{i.designer.fullName}</p>
                              {i.designer.city && <p className="text-text-muted text-xs">{i.designer.city}</p>}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-gold" />
                            <span className="font-mono font-bold text-gold">{i.designer.totalDealsReported ?? 0}</span>
                            {i.designer.totalDealAmount != null && i.designer.totalDealAmount > 0 && (
                              <span className="text-text-muted text-xs">({fmtMoney(i.designer.totalDealAmount)})</span>
                            )}
                          </div>
                        </td>
                        <td><span className="text-text-primary text-xs">{i.designer.specialization || "—"}</span></td>
                        <td><span className="text-text-muted text-xs">{i.designer.yearsExperience ?? "—"} שנים</span></td>
                        <td>{subscriptionBadge(i.designer.subscription)}</td>
                        <td><span className="text-text-muted text-xs">{fmtDate(i.createdAt)}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {lead.status === "POSTED_TO_COMMUNITY" && lead.interests.length === 0 && (
          <div className="mt-5 text-center py-6 text-text-muted">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">עדיין אין מעצבות שהביעו עניין</p>
          </div>
        )}
      </div>

      {/* Assignments */}
      {lead.assignments.length > 0 && (
        <div className="card-static">
          <h3 className="text-text-primary font-heading flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5" /> הוקצה ל-{lead.assignments.length} מעצבות
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full table-luxury">
              <thead>
                <tr>
                  <th>מעצבת</th>
                  <th>פרטי קשר</th>
                  <th>הוקצה</th>
                  <th>נצפה</th>
                  <th>בוטל</th>
                  <th>הומר ללקוח</th>
                </tr>
              </thead>
              <tbody>
                {lead.assignments.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold text-sm font-bold">
                          {a.designer.fullName[0]}
                        </div>
                        <div>
                          <p className="text-text-primary font-medium text-sm">{a.designer.fullName}</p>
                          {a.designer.city && <p className="text-text-muted text-xs">{a.designer.city}</p>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="text-xs space-y-0.5">
                        {a.designer.phone && <p dir="ltr" className="text-text-muted">{a.designer.phone}</p>}
                        {a.designer.email && <p dir="ltr" className="text-text-muted truncate max-w-[160px]">{a.designer.email}</p>}
                      </div>
                    </td>
                    <td><span className="text-xs text-text-muted">{fmtDate(a.assignedAt)}</span></td>
                    <td>
                      {a.viewedAt
                        ? <span className="text-xs text-emerald-600 flex items-center gap-1"><Eye className="w-3 h-3" /> {fmtDate(a.viewedAt)}</span>
                        : <span className="text-xs text-text-muted flex items-center gap-1"><EyeOff className="w-3 h-3" /> עוד לא</span>}
                    </td>
                    <td>
                      {a.dismissedAt
                        ? <span className="text-xs text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3" /> {fmtDate(a.dismissedAt)}</span>
                        : <span className="text-text-muted text-xs">—</span>}
                    </td>
                    <td>
                      {a.convertedAt
                        ? (
                          <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> {fmtDate(a.convertedAt)}
                          </span>
                        )
                        : <span className="text-text-muted text-xs">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function DataField({ icon: Icon, label, value }: {
  icon: typeof User; label: string; value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-text-muted text-xs flex items-center gap-1 mb-1">
        <Icon className="w-3 h-3" /> {label}
      </p>
      <p className="text-text-primary text-sm font-medium">{value}</p>
    </div>
  );
}

function TimelineItem({ label, ts }: { label: string; ts: string }) {
  return (
    <div className="flex items-start gap-2 bg-bg-surface/50 rounded-card p-2">
      <CheckCircle2 className="w-3.5 h-3.5 text-gold flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-text-muted text-[10px]">{label}</p>
        <p className="text-text-primary">{fmtDate(ts)}</p>
      </div>
    </div>
  );
}
