"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Zap, Plus, X, Play, Pause, Edit3, Trash2, ChevronDown, ChevronUp,
  MessageCircle, Mail, Tag, Bell, DollarSign, Star, Users, Calendar,
  CheckCircle, AlertTriangle, Loader2,
} from "lucide-react";

type Trigger = "עסקה חדשה" | "מעצבת חדשה" | "דירוג הוזן" | "מנוי עומד לפוג" | "ספק לא פעיל";
type Action = "שלח WhatsApp" | "שלח מייל" | "הוסף תג" | "צור התראה";

interface Rule {
  id: string;
  trigger: Trigger;
  conditionValue: number | null;
  action: Action;
  actionDetail: string;
  enabled: boolean;
  executions: number;
}

const triggerOptions: Trigger[] = ["עסקה חדשה", "מעצבת חדשה", "דירוג הוזן", "מנוי עומד לפוג", "ספק לא פעיל"];
const actionOptions: Action[] = ["שלח WhatsApp", "שלח מייל", "הוסף תג", "צור התראה"];

const triggerIcons: Record<Trigger, React.ReactNode> = {
  "עסקה חדשה": <DollarSign className="w-5 h-5" />,
  "מעצבת חדשה": <Users className="w-5 h-5" />,
  "דירוג הוזן": <Star className="w-5 h-5" />,
  "מנוי עומד לפוג": <Calendar className="w-5 h-5" />,
  "ספק לא פעיל": <AlertTriangle className="w-5 h-5" />,
};

const actionIcons: Record<Action, React.ReactNode> = {
  "שלח WhatsApp": <MessageCircle className="w-5 h-5" />,
  "שלח מייל": <Mail className="w-5 h-5" />,
  "הוסף תג": <Tag className="w-5 h-5" />,
  "צור התראה": <Bell className="w-5 h-5" />,
};

function getConditionLabel(trigger: Trigger): string | null {
  switch (trigger) {
    case "עסקה חדשה": return "סכום > X";
    case "דירוג הוזן": return "דירוג < X";
    case "ספק לא פעיל": return "ימים לא פעיל > X";
    case "מנוי עומד לפוג": return "ימים לפני תפוגה < X";
    default: return null;
  }
}

function getConditionDescription(trigger: Trigger, value: number | null): string {
  if (value === null) return "אוטומטי";
  switch (trigger) {
    case "עסקה חדשה": return `סכום > ₪${value.toLocaleString()}`;
    case "דירוג הוזן": return `דירוג < ${value}`;
    case "ספק לא פעיל": return `לא פעיל > ${value} ימים`;
    case "מנוי עומד לפוג": return `${value} ימים לפני תפוגה`;
    default: return "";
  }
}

function buildPreview(trigger: Trigger, conditionValue: number | null, action: Action): string {
  const condPart = conditionValue !== null ? ` ${getConditionDescription(trigger, conditionValue)}` : "";
  const triggerMap: Record<Trigger, string> = {
    "עסקה חדשה": "כשמתקבלת עסקה חדשה",
    "מעצבת חדשה": "כשמצטרפת מעצבת חדשה",
    "דירוג הוזן": "כשמוזן דירוג",
    "מנוי עומד לפוג": "כשמנוי עומד לפוג",
    "ספק לא פעיל": "כשספק לא פעיל",
  };
  return `${triggerMap[trigger]}${condPart ? ` ב${condPart}` : ""} → ${action}`;
}

export default function AutomationsPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [step, setStep] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/automations");
      if (!res.ok) throw new Error("שגיאה");
      const data = await res.json();
      setRules(data);
      setError(null);
    } catch {
      setError("שגיאה בטעינת אוטומציות");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  // form state
  const [formTrigger, setFormTrigger] = useState<Trigger>("עסקה חדשה");
  const [formCondition, setFormCondition] = useState<number | null>(null);
  const [formAction, setFormAction] = useState<Action>("שלח WhatsApp");
  const [formDetail, setFormDetail] = useState("");

  const resetForm = () => {
    setFormTrigger("עסקה חדשה");
    setFormCondition(null);
    setFormAction("שלח WhatsApp");
    setFormDetail("");
    setStep(1);
    setEditingRule(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (rule: Rule) => {
    setEditingRule(rule);
    setFormTrigger(rule.trigger);
    setFormCondition(rule.conditionValue);
    setFormAction(rule.action);
    setFormDetail(rule.actionDetail);
    setStep(1);
    setShowModal(true);
  };

  const saveRule = async () => {
    if (editingRule) {
      const updates = {
        trigger: formTrigger,
        conditionValue: formTrigger === "מעצבת חדשה" ? null : formCondition,
        action: formAction,
        actionDetail: formDetail,
      };
      setRules((prev) =>
        prev.map((r) => (r.id === editingRule.id ? { ...r, ...updates } : r))
      );
      await fetch("/api/admin/automations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingRule.id, ...updates }),
      });
    } else {
      const res = await fetch("/api/admin/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trigger: formTrigger,
          conditionValue: formTrigger === "מעצבת חדשה" ? null : formCondition,
          action: formAction,
          actionDetail: formDetail,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRules((prev) => [...prev, data.rule]);
      }
    }
    setShowModal(false);
    resetForm();
  };

  const deleteRule = async (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    await fetch("/api/admin/automations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "delete" }),
    });
  };

  const toggleRule = async (id: string) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
    await fetch("/api/admin/automations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "toggle" }),
    });
  };

  const needsCondition = formTrigger !== "מעצבת חדשה";
  const needsTextDetail = formAction === "שלח WhatsApp" || formAction === "שלח מייל";
  const needsTagInput = formAction === "הוסף תג";

  const conditionPlaceholder = (() => {
    switch (formTrigger) {
      case "עסקה חדשה": return "הזן סכום מינימלי";
      case "דירוג הוזן": return "הזן דירוג מקסימלי";
      case "ספק לא פעיל": return "הזן מספר ימים";
      case "מנוי עומד לפוג": return "הזן מספר ימים לפני תפוגה";
      default: return "";
    }
  })();

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen" dir="rtl">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto mb-3" />
          <p className="text-text-muted text-sm">טוען אוטומציות...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen" dir="rtl">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={fetchRules} className="btn-gold mt-4 px-4 py-2 rounded-lg text-sm">נסה שוב</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-in" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="w-7 h-7 text-gold" />
          <h1 className="font-heading text-2xl text-text-primary">מנוע אוטומציות</h1>
        </div>
        <button onClick={openCreate} className="btn-gold flex items-center gap-2 px-4 py-2 rounded-lg">
          <Plus className="w-4 h-4" />
          צור אוטומציה חדשה
        </button>
      </div>

      <div className="gold-separator" />

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-static p-4 text-center">
          <p className="text-text-muted text-sm">סה&quot;כ אוטומציות</p>
          <p className="text-2xl font-heading text-text-primary">{rules.length}</p>
        </div>
        <div className="card-static p-4 text-center">
          <p className="text-text-muted text-sm">פעילות</p>
          <p className="text-2xl font-heading text-gold">{rules.filter((r) => r.enabled).length}</p>
        </div>
        <div className="card-static p-4 text-center">
          <p className="text-text-muted text-sm">סה&quot;כ הפעלות</p>
          <p className="text-2xl font-heading text-text-primary">{rules.reduce((s, r) => s + r.executions, 0)}</p>
        </div>
      </div>

      {/* Rule Cards */}
      <div className="space-y-4">
        {rules.map((rule) => (
          <div key={rule.id} className={`card-static p-5 transition-all ${!rule.enabled ? "opacity-60" : ""}`}>
            <div className="flex items-center justify-between">
              {/* Left: trigger → action */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center gap-2 text-gold">{triggerIcons[rule.trigger]}<span className="font-heading text-sm">{rule.trigger}</span></div>
                <span className="text-text-muted text-xs hidden sm:inline">({getConditionDescription(rule.trigger, rule.conditionValue)})</span>
                <span className="text-text-muted mx-1">&larr;</span>
                <div className="flex items-center gap-2 text-text-primary">{actionIcons[rule.action]}<span className="text-sm">{rule.action}</span></div>
              </div>

              {/* Right: controls */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="badge-gold text-xs px-2 py-1 rounded-full">
                  <CheckCircle className="w-3 h-3 inline ml-1" />
                  הופעלה {rule.executions} פעמים
                </span>
                <button
                  onClick={() => toggleRule(rule.id)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${rule.enabled ? "bg-gold" : "bg-bg-surface"}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${rule.enabled ? "right-0.5" : "right-6"}`} />
                </button>
                <button onClick={() => setExpandedId(expandedId === rule.id ? null : rule.id)} className="btn-outline p-1.5 rounded-lg">
                  {expandedId === rule.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <button onClick={() => openEdit(rule)} className="btn-outline p-1.5 rounded-lg">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={() => deleteRule(rule.id)} className="btn-outline p-1.5 rounded-lg text-red-400 hover:text-red-300">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Expanded detail */}
            {expandedId === rule.id && (
              <div className="mt-4 pt-4 border-t border-white/10 space-y-2 text-sm text-text-muted">
                <p><strong className="text-text-primary">טריגר:</strong> {rule.trigger}</p>
                <p><strong className="text-text-primary">תנאי:</strong> {getConditionDescription(rule.trigger, rule.conditionValue)}</p>
                <p><strong className="text-text-primary">פעולה:</strong> {rule.action}</p>
                <p><strong className="text-text-primary">פרטי פעולה:</strong> {rule.actionDetail}</p>
                <p><strong className="text-text-primary">סטטוס:</strong> {rule.enabled ? "פעיל" : "מושבת"}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {rules.length === 0 && (
        <div className="card-static p-12 text-center">
          <Zap className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="text-text-muted">אין אוטומציות עדיין. צור את הראשונה!</p>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card-static w-full max-w-lg p-6 space-y-5 animate-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg text-text-primary">
                {editingRule ? "עריכת אוטומציה" : "צור אוטומציה חדשה"}
              </h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-text-muted hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="gold-separator" />

            {/* Step indicators */}
            <div className="flex items-center gap-2 justify-center text-xs">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center font-heading ${step >= s ? "bg-gold text-black" : "bg-bg-surface text-text-muted"}`}>
                  {s}
                </div>
              ))}
            </div>

            {/* Step 1: Select trigger */}
            {step === 1 && (
              <div className="space-y-3">
                <label className="text-text-primary text-sm font-heading">בחר טריגר</label>
                <select
                  value={formTrigger}
                  onChange={(e) => { setFormTrigger(e.target.value as Trigger); setFormCondition(null); }}
                  className="select-dark w-full p-2.5 rounded-lg"
                >
                  {triggerOptions.map((t) => (<option key={t} value={t}>{t}</option>))}
                </select>
                <div className="flex justify-end">
                  <button onClick={() => setStep(2)} className="btn-gold px-4 py-2 rounded-lg text-sm">הבא</button>
                </div>
              </div>
            )}

            {/* Step 2: Set condition */}
            {step === 2 && (
              <div className="space-y-3">
                <label className="text-text-primary text-sm font-heading">הגדר תנאי</label>
                {needsCondition ? (
                  <>
                    <p className="text-text-muted text-xs">{getConditionLabel(formTrigger)}</p>
                    <input
                      type="number"
                      value={formCondition ?? ""}
                      onChange={(e) => setFormCondition(e.target.value ? Number(e.target.value) : null)}
                      placeholder={conditionPlaceholder}
                      className="input-dark w-full p-2.5 rounded-lg"
                    />
                  </>
                ) : (
                  <p className="text-text-muted text-sm bg-bg-surface p-3 rounded-lg">טריגר זה פועל אוטומטית ללא תנאי.</p>
                )}
                <div className="flex justify-between">
                  <button onClick={() => setStep(1)} className="btn-outline px-4 py-2 rounded-lg text-sm">חזור</button>
                  <button onClick={() => setStep(3)} className="btn-gold px-4 py-2 rounded-lg text-sm">הבא</button>
                </div>
              </div>
            )}

            {/* Step 3: Choose action */}
            {step === 3 && (
              <div className="space-y-3">
                <label className="text-text-primary text-sm font-heading">בחר פעולה</label>
                <select
                  value={formAction}
                  onChange={(e) => setFormAction(e.target.value as Action)}
                  className="select-dark w-full p-2.5 rounded-lg"
                >
                  {actionOptions.map((a) => (<option key={a} value={a}>{a}</option>))}
                </select>
                <div className="flex justify-between">
                  <button onClick={() => setStep(2)} className="btn-outline px-4 py-2 rounded-lg text-sm">חזור</button>
                  <button onClick={() => setStep(4)} className="btn-gold px-4 py-2 rounded-lg text-sm">הבא</button>
                </div>
              </div>
            )}

            {/* Step 4: Configure action detail */}
            {step === 4 && (
              <div className="space-y-3">
                <label className="text-text-primary text-sm font-heading">הגדר פרטי פעולה</label>
                {needsTextDetail && (
                  <textarea
                    value={formDetail}
                    onChange={(e) => setFormDetail(e.target.value)}
                    placeholder={formAction === "שלח WhatsApp" ? "תבנית הודעת WhatsApp..." : "תבנית הודעת מייל..."}
                    rows={3}
                    className="input-dark w-full p-2.5 rounded-lg resize-none"
                  />
                )}
                {needsTagInput && (
                  <input
                    type="text"
                    value={formDetail}
                    onChange={(e) => setFormDetail(e.target.value)}
                    placeholder="שם התג"
                    className="input-dark w-full p-2.5 rounded-lg"
                  />
                )}
                {formAction === "צור התראה" && (
                  <input
                    type="text"
                    value={formDetail}
                    onChange={(e) => setFormDetail(e.target.value)}
                    placeholder="תוכן ההתראה"
                    className="input-dark w-full p-2.5 rounded-lg"
                  />
                )}

                {/* Preview */}
                <div className="bg-bg-surface p-3 rounded-lg border border-gold/20">
                  <p className="text-xs text-text-muted mb-1">תצוגה מקדימה:</p>
                  <p className="text-sm text-gold font-heading">
                    {buildPreview(formTrigger, needsCondition ? formCondition : null, formAction)}
                  </p>
                </div>

                <div className="flex justify-between">
                  <button onClick={() => setStep(3)} className="btn-outline px-4 py-2 rounded-lg text-sm">חזור</button>
                  <button onClick={saveRule} className="btn-gold px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    שמור אוטומציה
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
