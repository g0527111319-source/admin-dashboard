"use client";
// Designer-facing "לידים מהקהילה" — two tabs:
//
//   1. פיד הקהילה — anonymized leads open to ALL designers. They can tap
//      "אני מעוניינת" to add themselves to the interest list; admin later
//      picks up to 3 of them.
//
//   2. ההקצאות שלי — leads that were officially handed to this designer.
//      She sees full PII and can dismiss / mark-as-viewed / convert-to-client.
//
// Visibility rules match the API (community feed strips PII; assignments
// expose it only to the designer they were assigned to).

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Inbox, Sparkles, Users, Star, MapPin, Ruler, Banknote, Clock, Palette,
  Loader2, Heart, HeartOff, Eye, EyeOff, CheckCircle2,
  AlertCircle, AlertTriangle, Archive, RotateCw, User, Phone, Mail, Home,
  Handshake,
} from "lucide-react";
import { g } from "@/lib/gender";

type TabKey = "community" | "assignments";

interface CommunityLead {
  id: string;
  city: string;
  sizeSqm: number | null;
  scope: string;
  renovationBudget: number | null;
  designerBudget: number | null;
  startTiming: string | null;
  stylePreference: string | null;
  additionalNotes: string | null;
  postedToCommunityAt: string | null;
  createdAt: string;
  myInterest: boolean;
  totalInterested: number;
}

interface Assignment {
  id: string;
  assignedAt: string;
  viewedAt: string | null;
  dismissedAt: string | null;
  convertedAt: string | null;
  convertedToClientId: string | null;
  lead: {
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
    status: string;
    source: string | null;
    createdAt: string;
  };
}

// Human-readable Hebrew label for Lead.source. The source is usually
// "landing" (the main find-designer form) or
// "designer-portfolio:<designerId>" (the public portfolio contact form
// on /projects?designer=<id>). We don't resolve the designer id because
// the list is already scoped to this designer.
function sourceLabel(source: string | null | undefined): string {
  if (!source) return "—";
  if (source === "landing") return "דף נחיתה ראשי";
  if (source.startsWith("designer-portfolio:")) return "תיק עבודות ציבורי";
  return source;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("he-IL") + " " + d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

function fmtMoney(v: number | null | undefined): string {
  if (v == null) return "—";
  return `₪${v.toLocaleString("he-IL")}`;
}

export default function CommunityLeadsFeed({ gender = "female" }: { gender?: string }) {
  const [activeTab, setActiveTab] = useState<TabKey>("community");
  const [communityLeads, setCommunityLeads] = useState<CommunityLead[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [showDismissed, setShowDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // When the designer taps "אני מעוניינת" we first show a commission
  // disclosure modal. Only after she actively confirms do we POST interest.
  // Unchecking interest (removing) bypasses the modal — no agreement is
  // being made, just undoing a previous declaration.
  const [pendingInterestLeadId, setPendingInterestLeadId] = useState<string | null>(null);

  const loadCommunity = useCallback(async () => {
    try {
      const res = await fetch("/api/designer/leads/community", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { leads: CommunityLead[] };
      setCommunityLeads(data.leads || []);
    } catch {
      setError("שגיאה בטעינת פיד הקהילה");
    }
  }, []);

  const loadAssignments = useCallback(async () => {
    try {
      const url = showDismissed
        ? "/api/designer/leads/assignments?includeDismissed=1"
        : "/api/designer/leads/assignments";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { assignments: Assignment[] };
      setAssignments(data.assignments || []);
    } catch {
      setError("שגיאה בטעינת ההקצאות");
    }
  }, [showDismissed]);

  const reloadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([loadCommunity(), loadAssignments()]);
    setLoading(false);
  }, [loadCommunity, loadAssignments]);

  useEffect(() => { reloadAll(); }, [reloadAll]);

  // Entry point from the card button. Adding interest routes through the
  // commission-disclosure modal; removing interest is a direct un-declare.
  const toggleInterest = (leadId: string, current: boolean) => {
    if (current) {
      void removeInterest(leadId);
    } else {
      setPendingInterestLeadId(leadId);
    }
  };

  const removeInterest = async (leadId: string) => {
    setBusy(`interest-${leadId}`);
    try {
      const res = await fetch(`/api/designer/leads/community/${leadId}/interest`, { method: "DELETE" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        alert(err.error || "שגיאה");
      } else {
        await loadCommunity();
      }
    } finally {
      setBusy(null);
    }
  };

  // Called only after the designer explicitly accepts the commission
  // disclosure modal. The server also logs the agreement server-side via
  // `commissionAgreed: true` so we have a record beyond client state.
  const confirmInterest = async () => {
    const leadId = pendingInterestLeadId;
    if (!leadId) return;
    setBusy(`interest-${leadId}`);
    setPendingInterestLeadId(null);
    try {
      const res = await fetch(`/api/designer/leads/community/${leadId}/interest`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ commissionAgreed: true, commissionPercent: 8 }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        alert(err.error || "שגיאה");
      } else {
        await loadCommunity();
      }
    } finally {
      setBusy(null);
    }
  };

  const markViewed = async (assignmentId: string) => {
    try {
      await fetch(`/api/designer/leads/assignments/${assignmentId}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ viewed: true }),
      });
      await loadAssignments();
    } catch { /* swallow */ }
  };

  const dismiss = async (assignmentId: string) => {
    setBusy(`dismiss-${assignmentId}`);
    try {
      await fetch(`/api/designer/leads/assignments/${assignmentId}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ dismiss: true }),
      });
      await loadAssignments();
    } finally {
      setBusy(null);
    }
  };

  const undismiss = async (assignmentId: string) => {
    setBusy(`undismiss-${assignmentId}`);
    try {
      await fetch(`/api/designer/leads/assignments/${assignmentId}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ undismiss: true }),
      });
      await loadAssignments();
    } finally {
      setBusy(null);
    }
  };

  const convert = async (a: Assignment) => {
    if (!confirm(`להעביר את ${a.lead.firstName} ${a.lead.lastName} לרשימת הלקוחות שלך? הליד יופיע במערכת ה-CRM ותוכלי להמשיך לעבוד איתו משם.`)) return;
    setBusy(`convert-${a.id}`);
    try {
      const res = await fetch(`/api/designer/leads/assignments/${a.id}/convert`, { method: "POST" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        alert(err.error || "שגיאה");
      } else {
        const data = (await res.json()) as { clientId?: string };
        alert("הליד הועבר ללקוחות בהצלחה!");
        await loadAssignments();
        if (data.clientId) {
          // Give visual feedback; user can navigate manually.
          window.location.hash = "clients";
        }
      }
    } finally {
      setBusy(null);
    }
  };

  const pendingAssignments = useMemo(
    () => assignments.filter((a) => !a.convertedAt && !a.dismissedAt),
    [assignments]
  );
  const unreadCount = useMemo(
    () => pendingAssignments.filter((a) => !a.viewedAt).length,
    [pendingAssignments]
  );

  return (
    <div className="space-y-5 animate-in">
      {/* Header */}
      <div className="card-static">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-heading text-text-primary flex items-center gap-2">
              <Inbox className="w-6 h-6 text-gold" /> לידים מהקהילה
            </h2>
            <p className="text-text-muted text-sm mt-1">
              לקוחות פרטיים ש{g(gender, "פנו", "פנו")} לקהילה — {g(gender, "תוכל לציין עניין בלידים הפתוחים", "תוכלי לציין עניין בלידים הפתוחים")} ולראות כאן את מה ש{g(gender, "הוקצה לך", "הוקצה לך")}.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4 border-b border-border-subtle pb-0 -mb-px">
          <TabButton
            active={activeTab === "community"}
            onClick={() => setActiveTab("community")}
            icon={Users}
            label="פיד הקהילה"
            count={communityLeads.length}
          />
          <TabButton
            active={activeTab === "assignments"}
            onClick={() => setActiveTab("assignments")}
            icon={Sparkles}
            label={g(gender, "הוקצו לי", "הוקצו לי")}
            count={pendingAssignments.length}
            badge={unreadCount > 0 ? unreadCount : undefined}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-text-muted gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>טוען...</span>
        </div>
      ) : error ? (
        <div className="text-center py-10 text-red-500">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-60" />
          <p>{error}</p>
        </div>
      ) : activeTab === "community" ? (
        <CommunityTab
          leads={communityLeads}
          busy={busy}
          onToggleInterest={toggleInterest}
          gender={gender}
        />
      ) : (
        <AssignmentsTab
          assignments={assignments}
          showDismissed={showDismissed}
          onToggleDismissed={() => setShowDismissed((v) => !v)}
          busy={busy}
          onMarkViewed={markViewed}
          onDismiss={dismiss}
          onUndismiss={undismiss}
          onConvert={convert}
          gender={gender}
        />
      )}

      {pendingInterestLeadId && (
        <CommissionAgreementModal
          gender={gender}
          onCancel={() => setPendingInterestLeadId(null)}
          onConfirm={confirmInterest}
        />
      )}
    </div>
  );
}

// ==========================================
// Commission agreement modal
// ==========================================
// Shown before a designer declares interest in a community lead. She cannot
// add herself to the interest list without actively confirming the 8%
// commission clause — this gives us a UX-level audit trail (and the server
// logs the same consent via the `commissionAgreed` POST body).

function CommissionAgreementModal({ gender, onCancel, onConfirm }: {
  gender: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [accepted, setAccepted] = useState(false);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="commission-agreement-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in"
      onClick={onCancel}
    >
      <div
        className="card-static max-w-lg w-full relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-11 h-11 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
            <Handshake className="w-5 h-5 text-gold" />
          </div>
          <div className="flex-1">
            <h3
              id="commission-agreement-title"
              className="text-lg font-heading text-text-primary"
            >
              {g(gender, "אישור הסכמה לעמלת קהילה", "אישור הסכמה לעמלת קהילה")}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              תנאי יסוד לקבלת ליד מפיד הקהילה של זירת האדריכלות
            </p>
          </div>
        </div>

        <div className="mt-5 text-sm text-text-primary leading-relaxed space-y-3">
          <p>
            {g(
              gender,
              "הריני מאשר כי ידוע לי שהליד הופנה אליי דרך קהילת ",
              "הריני מאשרת כי ידוע לי שהליד הופנה אליי דרך קהילת ",
            )}
            <strong>זירת האדריכלות</strong>
            {g(gender, " בניהולה של תמר גולדשמיד.", " בניהולה של תמר גולדשמיד.")}
          </p>
          <p>
            {g(
              gender,
              "במידה והליד יבשיל לעסקה בפועל והלקוח/ה ישלם/תשלם לי על שירותי העיצוב — אני מתחייב להעביר ",
              "במידה והליד יבשיל לעסקה בפועל והלקוח/ה ישלם/תשלם לי על שירותי העיצוב — אני מתחייבת להעביר ",
            )}
            <strong className="text-gold">8% מסך העמלה</strong>
            {g(
              gender,
              " שאקבל מהלקוח/ה לתמר גולדשמיד, כעמלת הפניה והפעלת הקהילה, תוך 14 יום ממועד קבלת התשלום.",
              " שאקבל מהלקוח/ה לתמר גולדשמיד, כעמלת הפניה והפעלת הקהילה, תוך 14 יום ממועד קבלת התשלום.",
            )}
          </p>
          <p className="text-xs text-text-muted">
            ההצהרה נרשמת במערכת עם חותמת זמן ומהווה אסמכתא להסכם העמלה.
          </p>
        </div>

        <label className="mt-5 flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-gold"
          />
          <span className="text-sm text-text-primary">
            {g(
              gender,
              "קראתי, הבנתי ואני מסכים לתנאים.",
              "קראתי, הבנתי ואני מסכימה לתנאים.",
            )}
          </span>
        </label>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-btn text-sm text-text-muted hover:text-text-primary hover:bg-bg-surface transition-colors"
          >
            ביטול
          </button>
          <button
            onClick={onConfirm}
            disabled={!accepted}
            className="btn-gold inline-flex items-center gap-2 !px-5 !py-2 !text-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            {g(gender, "אני מאשר וקבל את הליד", "אני מאשרת וקבלת הליד")}
          </button>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label, count, badge }: {
  active: boolean; onClick: () => void; icon: typeof Users; label: string; count: number; badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all text-sm ${
        active
          ? "border-gold text-gold font-semibold"
          : "border-transparent text-text-muted hover:text-text-primary"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
      <span className={`text-xs ${active ? "text-gold/80" : "text-text-muted"}`}>({count})</span>
      {badge && badge > 0 && (
        <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
          {badge}
        </span>
      )}
    </button>
  );
}

// ==========================================
// Community tab — anonymized open leads
// ==========================================

function CommunityTab({ leads, busy, onToggleInterest, gender }: {
  leads: CommunityLead[];
  busy: string | null;
  onToggleInterest: (leadId: string, current: boolean) => void;
  gender: string;
}) {
  if (leads.length === 0) {
    return (
      <div className="card-static text-center py-12 text-text-muted">
        <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p>{g(gender, "אין כרגע לידים פתוחים בקהילה. נעדכן אותך כשיגיעו חדשים.", "אין כרגע לידים פתוחים בקהילה. נעדכן אותך כשיגיעו חדשים.")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {leads.map((l) => {
        const isBusy = busy === `interest-${l.id}`;
        return (
          <div key={l.id} className="card-static hover-lift">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-text-muted text-xs">
                  <Clock className="w-3 h-3" />
                  <span>פורסם {fmtDate(l.postedToCommunityAt || l.createdAt)}</span>
                </div>
                <h3 className="text-lg font-heading text-text-primary mt-1 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gold" />
                  {l.city || "עיר לא צוינה"}
                </h3>
              </div>
              <div className="flex items-center gap-1 text-xs text-text-muted bg-bg-surface rounded-full px-2 py-1">
                <Star className="w-3 h-3 text-gold" />
                <span>{l.totalInterested} {g(gender, "הביעו עניין", "הביעו עניין")}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
              {l.sizeSqm != null && (
                <InfoRow icon={Ruler} label="גודל" value={`${l.sizeSqm} מ״ר`} />
              )}
              {l.renovationBudget != null && (
                <InfoRow icon={Banknote} label="תקציב שיפוץ" value={fmtMoney(l.renovationBudget)} />
              )}
              {l.designerBudget != null && (
                <InfoRow icon={Banknote} label="תקציב למעצבת" value={fmtMoney(l.designerBudget)} />
              )}
              {l.startTiming && (
                <InfoRow icon={Clock} label="תזמון" value={l.startTiming} />
              )}
              {l.stylePreference && (
                <InfoRow icon={Palette} label="סגנון" value={l.stylePreference} />
              )}
            </div>

            {l.scope && (
              <div className="mt-4">
                <p className="text-text-muted text-xs mb-1">פירוט השיפוץ</p>
                <p className="text-text-primary text-sm bg-bg-surface/50 rounded-card p-2.5 whitespace-pre-wrap line-clamp-4">
                  {l.scope}
                </p>
              </div>
            )}

            {l.additionalNotes && (
              <div className="mt-3">
                <p className="text-text-muted text-xs mb-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> דגש נוסף מהלקוח
                </p>
                <p className="text-text-primary text-sm bg-gold/5 border border-gold/20 rounded-card p-2.5 whitespace-pre-wrap line-clamp-3">
                  {l.additionalNotes}
                </p>
              </div>
            )}

            <button
              onClick={() => onToggleInterest(l.id, l.myInterest)}
              disabled={isBusy}
              className={`w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-btn font-semibold text-sm transition-all ${
                l.myInterest
                  ? "bg-gold/10 text-gold border border-gold/30 hover:bg-gold/15"
                  : "bg-gold text-white hover:bg-gold/90"
              } disabled:opacity-50`}
            >
              {isBusy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : l.myInterest ? (
                <>
                  <HeartOff className="w-4 h-4" />
                  {g(gender, "בטל עניין", "בטלי עניין")}
                </>
              ) : (
                <>
                  <Heart className="w-4 h-4" />
                  {g(gender, "אני מעוניין", "אני מעוניינת")}
                </>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ==========================================
// Assignments tab — my assigned leads
// ==========================================

function AssignmentsTab({ assignments, showDismissed, onToggleDismissed, busy, onMarkViewed, onDismiss, onUndismiss, onConvert, gender }: {
  assignments: Assignment[];
  showDismissed: boolean;
  onToggleDismissed: () => void;
  busy: string | null;
  onMarkViewed: (id: string) => void;
  onDismiss: (id: string) => void;
  onUndismiss: (id: string) => void;
  onConvert: (a: Assignment) => void;
  gender: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button
          onClick={onToggleDismissed}
          className="text-xs text-text-muted hover:text-gold flex items-center gap-1 transition-colors"
        >
          {showDismissed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {showDismissed ? "הסתר הקצאות שנדחו" : "הצג גם הקצאות שנדחו"}
        </button>
      </div>

      {assignments.length === 0 ? (
        <div className="card-static text-center py-12 text-text-muted">
          <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>{g(gender, "עוד לא הוקצה לך אף ליד", "עוד לא הוקצה לך אף ליד")}</p>
          <p className="text-xs mt-1">
            {g(gender, "תוכל לציין עניין בלידים בפיד הקהילה כדי להיבחר ע״י מנהלת הקהילה", "תוכלי לציין עניין בלידים בפיד הקהילה כדי להיבחר ע״י מנהלת הקהילה")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {assignments.map((a) => (
            <AssignmentCard
              key={a.id}
              assignment={a}
              busy={busy}
              onMarkViewed={onMarkViewed}
              onDismiss={onDismiss}
              onUndismiss={onUndismiss}
              onConvert={onConvert}
              gender={gender}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AssignmentCard({ assignment, busy, onMarkViewed, onDismiss, onUndismiss, onConvert, gender }: {
  assignment: Assignment;
  busy: string | null;
  onMarkViewed: (id: string) => void;
  onDismiss: (id: string) => void;
  onUndismiss: (id: string) => void;
  onConvert: (a: Assignment) => void;
  gender: string;
}) {
  const a = assignment;
  const lead = a.lead;
  const name = `${lead.firstName} ${lead.lastName}`.trim();
  const isDismissed = !!a.dismissedAt;
  const isConverted = !!a.convertedAt;
  const isUnread = !a.viewedAt && !isDismissed && !isConverted;
  const leadShortId = lead.id.slice(0, 8);

  useEffect(() => {
    if (isUnread) {
      const t = setTimeout(() => onMarkViewed(a.id), 1500);
      return () => clearTimeout(t);
    }
  }, [isUnread, a.id, onMarkViewed]);

  return (
    <div className={`card-static relative ${isDismissed ? "opacity-60" : ""} ${isUnread ? "ring-2 ring-gold/40" : ""}`}>
      {isUnread && (
        <span className="absolute -top-2 right-4 bg-gold text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
          חדש
        </span>
      )}
      {isConverted && (
        <span className="absolute -top-2 right-4 bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> הועבר ללקוחות
        </span>
      )}
      {isDismissed && !isConverted && (
        <span className="absolute -top-2 right-4 bg-gray-400 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
          נדחה
        </span>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold text-lg font-bold flex-shrink-0">
            {lead.firstName[0] || "?"}
          </div>
          <div>
            <h3 className="text-base font-heading text-text-primary">{name}</h3>
            <p className="text-text-muted text-xs">#{leadShortId} · הוקצה {fmtDate(a.assignedAt)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-sm">
        <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-text-primary hover:text-gold" dir="ltr">
          <Phone className="w-4 h-4 text-gold flex-shrink-0" />
          <span className="truncate">{lead.phone}</span>
        </a>
        <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-text-primary hover:text-gold" dir="ltr">
          <Mail className="w-4 h-4 text-gold flex-shrink-0" />
          <span className="truncate">{lead.email}</span>
        </a>
        <InfoRow icon={Sparkles} label="מקור הפנייה" value={sourceLabel(lead.source)} />
        {lead.address && <InfoRow icon={Home} label="כתובת" value={lead.address} />}
        {lead.city && <InfoRow icon={MapPin} label="עיר" value={lead.city} />}
        {lead.sizeSqm != null && <InfoRow icon={Ruler} label="גודל" value={`${lead.sizeSqm} מ״ר`} />}
        {lead.renovationBudget != null && <InfoRow icon={Banknote} label="תקציב שיפוץ" value={fmtMoney(lead.renovationBudget)} />}
        {lead.designerBudget != null && <InfoRow icon={Banknote} label="תקציב למעצבת" value={fmtMoney(lead.designerBudget)} />}
        {lead.startTiming && <InfoRow icon={Clock} label="תזמון" value={lead.startTiming} />}
        {lead.stylePreference && <InfoRow icon={Palette} label="סגנון" value={lead.stylePreference} />}
      </div>

      {lead.scope && (
        <div className="mt-4">
          <p className="text-text-muted text-xs mb-1">פירוט השיפוץ</p>
          <p className="text-text-primary text-sm bg-bg-surface/50 rounded-card p-2.5 whitespace-pre-wrap">
            {lead.scope}
          </p>
        </div>
      )}

      {lead.additionalNotes && (
        <div className="mt-3">
          <p className="text-text-muted text-xs mb-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> דגש נוסף מהלקוח
          </p>
          <p className="text-text-primary text-sm bg-gold/5 border border-gold/20 rounded-card p-2.5 whitespace-pre-wrap">
            {lead.additionalNotes}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-border-subtle">
        {!isConverted && (
          <button
            onClick={() => onConvert(a)}
            disabled={!!busy || isDismissed}
            className="btn-gold flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {busy === `convert-${a.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Handshake className="w-4 h-4" />}
            {g(gender, "העבר ללקוחות", "העבירי ללקוחות")}
          </button>
        )}
        {isConverted && (
          <span className="inline-flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-btn text-sm">
            <CheckCircle2 className="w-4 h-4" />
            הועבר ב-{fmtDate(a.convertedAt)}
          </span>
        )}
        {!isConverted && !isDismissed && (
          <button
            onClick={() => onDismiss(a.id)}
            disabled={!!busy}
            className="btn-outline flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {busy === `dismiss-${a.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
            {g(gender, "הסתר", "הסתירי")}
          </button>
        )}
        {isDismissed && !isConverted && (
          <button
            onClick={() => onUndismiss(a.id)}
            disabled={!!busy}
            className="btn-outline flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {busy === `undismiss-${a.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
            שחזר
          </button>
        )}
      </div>
    </div>
  );
}

// ==========================================
// Reusable helpers
// ==========================================

function InfoRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-text-muted text-[10px] uppercase tracking-wide">{label}</p>
        <p className="text-text-primary text-sm truncate">{value}</p>
      </div>
    </div>
  );
}
