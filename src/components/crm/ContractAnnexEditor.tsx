"use client";

/**
 * ContractAnnexEditor — inline editor for the per-client contract annex.
 *
 * UX goals:
 *  - Zero typing for the common case: the designer toggles a curated
 *    checklist of services instead of writing clauses.
 *  - One-click "save as defaults" so recurring setups are reused.
 *  - Clear visual separation so the designer sees exactly what the client
 *    will see.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Sparkles, Plus, X, CheckCircle2, FileText, Home, Calendar,
  Users, Ban, Bookmark, Save,
} from "lucide-react";
import {
  ContractAnnex,
  AnnexClause,
  VisitFrequency,
  VISIT_FREQUENCY_LABELS,
  emptyAnnex,
  newClauseId,
  saveDefaultsToLocalStorage,
  loadDefaultsFromLocalStorage,
} from "@/lib/contract-annex";

interface Props {
  value: ContractAnnex | null;
  onChange: (next: ContractAnnex) => void;
  /** Prefill helpers from the parent contract context. */
  projectAddress?: string | null;
  clientName?: string | null;
}

export default function ContractAnnexEditor({
  value,
  onChange,
  projectAddress,
}: Props) {
  const [annex, setAnnex] = useState<ContractAnnex>(() => value || emptyAnnex());
  const [savedDefaults, setSavedDefaults] = useState(false);
  const didInitFromProject = useRef(false);

  // Keep local state in sync when the parent replaces the annex (e.g. after
  // reloading the contract from the server).
  useEffect(() => {
    if (value) setAnnex(value);
  }, [value]);

  // Prefill property address from the project once.
  useEffect(() => {
    if (didInitFromProject.current) return;
    if (!annex.propertyAddress && projectAddress) {
      didInitFromProject.current = true;
      update({ propertyAddress: projectAddress });
    } else if (projectAddress) {
      didInitFromProject.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectAddress]);

  const update = useCallback(
    (patch: Partial<ContractAnnex>) => {
      setAnnex((prev) => {
        const next = { ...prev, ...patch };
        onChange(next);
        return next;
      });
    },
    [onChange]
  );

  const toggleEnabled = () => update({ enabled: !annex.enabled });

  const toggleService = (id: string) => {
    update({
      services: annex.services.map((s) =>
        s.id === id ? { ...s, included: !s.included } : s
      ),
    });
  };

  const setServiceDetail = (id: string, details: string) => {
    update({
      services: annex.services.map((s) =>
        s.id === id ? { ...s, details } : s
      ),
    });
  };

  const addCustomClause = () => {
    const clause: AnnexClause = { id: newClauseId(), title: "", text: "" };
    update({ customClauses: [...annex.customClauses, clause] });
  };

  const updateClause = (id: string, patch: Partial<AnnexClause>) => {
    update({
      customClauses: annex.customClauses.map((c) =>
        c.id === id ? { ...c, ...patch } : c
      ),
    });
  };

  const removeClause = (id: string) => {
    update({ customClauses: annex.customClauses.filter((c) => c.id !== id) });
  };

  const applySavedDefaults = () => {
    const defaults = loadDefaultsFromLocalStorage();
    if (!defaults) return;
    update({
      services: defaults.services ?? annex.services,
      visitCount: defaults.visitCount ?? annex.visitCount,
      visitFrequency: (defaults.visitFrequency as VisitFrequency | undefined) ?? annex.visitFrequency,
      supplierCoordination: defaults.supplierCoordination ?? annex.supplierCoordination,
      exclusions: defaults.exclusions ?? annex.exclusions,
      customClauses: defaults.customClauses ?? annex.customClauses,
    });
  };

  const saveAsDefaults = () => {
    saveDefaultsToLocalStorage(annex);
    setSavedDefaults(true);
    setTimeout(() => setSavedDefaults(false), 2000);
  };

  const hasSavedDefaults = typeof window !== "undefined" &&
    !!window.localStorage.getItem("crm:contract:annex:defaults");

  const includedCount = annex.services.filter((s) => s.included).length;

  return (
    <div className="card-static space-y-5" dir="rtl">
      {/* Enable toggle */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-gold/15 text-gold flex items-center justify-center flex-shrink-0">
            <Bookmark className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              נספח לחוזה — פרטי השיפוץ וההתחייבויות
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              פרטים שמתחלפים מלקוח ללקוח. ייצורף אוטומטית לחוזה ולחתימה.
            </p>
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
          <span className="text-xs text-text-muted">
            {annex.enabled ? "פעיל" : "כבוי"}
          </span>
          <button
            type="button"
            onClick={toggleEnabled}
            className={`relative w-10 h-6 rounded-full transition-colors ${
              annex.enabled ? "bg-gold" : "bg-bg-surface-2 border border-border-subtle"
            }`}
            aria-pressed={annex.enabled}
            aria-label="הפעל נספח"
          >
            <span
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                annex.enabled ? "right-0.5" : "right-[18px]"
              }`}
            />
          </button>
        </label>
      </div>

      {annex.enabled && (
        <>
          {/* Quick actions */}
          <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-border-subtle">
            {hasSavedDefaults && (
              <button
                type="button"
                onClick={applySavedDefaults}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gold/30 text-gold hover:bg-gold/5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                החל ברירות-מחדל שלי
              </button>
            )}
            <button
              type="button"
              onClick={saveAsDefaults}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border-subtle text-text-muted hover:text-text-primary hover:border-gold/40 transition-colors"
            >
              {savedDefaults ? (
                <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> נשמר כברירת-מחדל</>
              ) : (
                <><Save className="w-3.5 h-3.5" /> שמרי כברירת-מחדל לעתיד</>
              )}
            </button>
            <span className="text-2xs text-text-faint mr-auto">
              {includedCount} שירותים כלולים · {annex.customClauses.length} סעיפים מותאמים
            </span>
          </div>

          {/* Property details */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5" />
              פרטי הנכס
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="form-label">כתובת הנכס</label>
                <input
                  type="text"
                  value={annex.propertyAddress}
                  onChange={(e) => update({ propertyAddress: e.target.value })}
                  className="input-field"
                  placeholder="רחוב, מספר, עיר"
                />
              </div>
              <div>
                <label className="form-label">שטח (מ״ר)</label>
                <input
                  type="text"
                  value={annex.propertyArea}
                  onChange={(e) => update({ propertyArea: e.target.value })}
                  className="input-field"
                  placeholder="לדוגמה: 120"
                  dir="ltr"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="form-label">תיאור השיפוץ</label>
                <textarea
                  value={annex.renovationScope}
                  onChange={(e) => update({ renovationScope: e.target.value })}
                  className="input-field min-h-[80px] resize-none"
                  placeholder="תיאור קצר: מה כולל השיפוץ? (מטבח, אמבטיות, חדרי שינה...)"
                />
              </div>
              <div>
                <label className="form-label flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  תאריך התחלה
                </label>
                <input
                  type="date"
                  value={annex.startDate}
                  onChange={(e) => update({ startDate: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="form-label flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  תאריך סיום משוער
                </label>
                <input
                  type="date"
                  value={annex.estimatedEndDate}
                  onChange={(e) => update({ estimatedEndDate: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
          </section>

          {/* Services checklist */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              התחייבויות המעצבת — בחרי מה כלול
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {annex.services.map((service) => (
                <li
                  key={service.id}
                  className={`group flex items-start gap-2 p-2.5 rounded-lg border transition-all ${
                    service.included
                      ? "bg-gold/5 border-gold/30"
                      : "bg-bg-surface-2/30 border-border-subtle opacity-60"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleService(service.id)}
                    className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                      service.included
                        ? "bg-gold border-gold text-white"
                        : "bg-white border-border-subtle hover:border-gold"
                    }`}
                    aria-label={service.included ? "הסר" : "הוסף"}
                  >
                    {service.included && <CheckCircle2 className="w-3 h-3" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm ${service.included ? "text-text-primary font-medium" : "text-text-muted line-through"}`}>
                      {service.label}
                    </div>
                    {service.included && (
                      <input
                        type="text"
                        value={service.details ?? ""}
                        onChange={(e) => setServiceDetail(service.id, e.target.value)}
                        className="w-full mt-1.5 text-xs bg-transparent border-0 border-b border-dashed border-border-subtle outline-none focus:border-gold transition-colors placeholder:text-text-faint"
                        placeholder="הוסיפי פירוט (אופציונלי)"
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Visits + coordination */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              פיקוח ותיאום
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="form-label">תדירות ביקורים</label>
                <select
                  value={annex.visitFrequency}
                  onChange={(e) => update({ visitFrequency: e.target.value as VisitFrequency })}
                  className="select-field"
                >
                  {(Object.keys(VISIT_FREQUENCY_LABELS) as VisitFrequency[]).map((k) => (
                    <option key={k} value={k}>{VISIT_FREQUENCY_LABELS[k]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">מספר ביקורים משוער</label>
                <input
                  type="text"
                  value={annex.visitCount}
                  onChange={(e) => update({ visitCount: e.target.value })}
                  className="input-field"
                  placeholder="לדוגמה: 8 ביקורים"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-bg-surface-2/50 transition-colors">
              <input
                type="checkbox"
                checked={annex.supplierCoordination}
                onChange={(e) => update({ supplierCoordination: e.target.checked })}
                className="w-4 h-4 accent-gold"
              />
              <span className="text-sm text-text-primary">
                תיאום פעיל עם ספקים וקבלנים לאורך הפרויקט
              </span>
            </label>
          </section>

          {/* Exclusions */}
          <section className="space-y-2">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide flex items-center gap-1.5">
              <Ban className="w-3.5 h-3.5" />
              מה לא כלול בשירות
            </h4>
            <textarea
              value={annex.exclusions}
              onChange={(e) => update({ exclusions: e.target.value })}
              className="input-field min-h-[60px] resize-none"
              placeholder="לדוגמה: עבודות שיפוצים בפועל, עלויות חומרים, רכש מטעם הלקוח..."
            />
          </section>

          {/* Custom clauses */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                סעיפים מותאמים ללקוח
              </h4>
              <button
                type="button"
                onClick={addCustomClause}
                className="flex items-center gap-1 text-xs text-gold hover:text-gold/80 font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                הוסיפי סעיף
              </button>
            </div>
            {annex.customClauses.length === 0 ? (
              <p className="text-xs text-text-faint italic">
                אין סעיפים נוספים. הוסיפי כאן דברים ייחודיים ללקוח הזה שלא מופיעים בחוזה הראשי.
              </p>
            ) : (
              <ul className="space-y-2">
                {annex.customClauses.map((clause, idx) => (
                  <li key={clause.id} className="p-3 rounded-lg border border-border-subtle bg-bg-surface-2/30 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-2xs text-text-faint mt-2 w-5 text-center font-mono">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        value={clause.title}
                        onChange={(e) => updateClause(clause.id, { title: e.target.value })}
                        className="flex-1 input-field"
                        placeholder="כותרת הסעיף"
                      />
                      <button
                        type="button"
                        onClick={() => removeClause(clause.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-text-faint hover:text-red-500 transition-colors flex-shrink-0"
                        aria-label="הסר סעיף"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea
                      value={clause.text}
                      onChange={(e) => updateClause(clause.id, { text: e.target.value })}
                      className="input-field min-h-[60px] resize-none"
                      placeholder="תוכן הסעיף"
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
