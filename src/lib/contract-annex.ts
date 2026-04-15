/**
 * Contract annex (נספח לחוזה) — client-specific renovation details that
 * live alongside the main contract.
 *
 * The annex is a structured, guided form instead of free text. The designer
 * toggles items from a curated checklist (supervision, material selection,
 * consulting, visits, supplier coordination, ...) and fills a few fields.
 * The resulting object is rendered as a clean extra page in both the
 * designer preview and the client signing view — so the client signs once
 * and the signature covers the contract + annex together.
 *
 * Storage: serialized as JSON under a reserved key in the contract's
 * `designerFieldValues` map (`__annex__`). This keeps the feature
 * migration-free; template fields never use keys starting with `__`.
 */
export const ANNEX_STORAGE_KEY = "__annex__";
export const ANNEX_DEFAULTS_LS_KEY = "crm:contract:annex:defaults";

export interface AnnexService {
  /** Stable id so we can reconcile with defaults across contracts. */
  id: string;
  /** Hebrew label shown to designer + client. */
  label: string;
  /** When false, the service is shown struck-through as "not included". */
  included: boolean;
  /** Optional per-service clarification (e.g. frequency, scope). */
  details?: string;
}

export interface AnnexClause {
  id: string;
  title: string;
  text: string;
}

export type VisitFrequency = "weekly" | "biweekly" | "monthly" | "milestones" | "custom";

export interface ContractAnnex {
  enabled: boolean;
  propertyAddress: string;
  propertyArea: string;      // string to accept "120" or "120–130 מ״ר"
  renovationScope: string;
  startDate: string;         // yyyy-mm-dd
  estimatedEndDate: string;  // yyyy-mm-dd
  services: AnnexService[];
  visitCount: string;
  visitFrequency: VisitFrequency;
  supplierCoordination: boolean;
  exclusions: string;
  customClauses: AnnexClause[];
}

/**
 * Curated checklist of the most common designer commitments in a renovation
 * contract. Each starts as "included". The designer toggles off anything
 * that isn't part of a particular engagement.
 */
export const DEFAULT_SERVICES: AnnexService[] = [
  { id: "supervision",      label: "פיקוח שוטף באתר השיפוץ",           included: true },
  { id: "materials",        label: "בחירת חומרים ומפרט טכני",            included: true },
  { id: "consulting",       label: "ליווי וייעוץ לאורך כל השיפוץ",       included: true },
  { id: "supplier-coord",   label: "תיאום עם ספקים וקבלנים",             included: true },
  { id: "furniture",        label: "בחירת ריהוט ופריטי עיצוב פנים",     included: true },
  { id: "lighting",         label: "תכנון תאורה",                          included: true },
  { id: "site-visits",      label: "ביקורי פיקוח קבועים באתר",           included: true },
  { id: "order-approval",   label: "אישור הזמנות מספקים לפני ביצוע",    included: true },
  { id: "samples",          label: "ליווי בבחירת דוגמאות (חיפוי, ריצוף, אריחים)", included: true },
  { id: "closure",          label: "סגירת פרויקט והסבת חשבונות",         included: true },
];

export const VISIT_FREQUENCY_LABELS: Record<VisitFrequency, string> = {
  weekly:     "ביקור שבועי",
  biweekly:   "ביקור דו-שבועי",
  monthly:    "ביקור חודשי",
  milestones: "ביקורים לפי אבני-דרך",
  custom:     "לפי תיאום אישי",
};

export function newClauseId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 11);
}

export function emptyAnnex(): ContractAnnex {
  return {
    enabled: false,
    propertyAddress: "",
    propertyArea: "",
    renovationScope: "",
    startDate: "",
    estimatedEndDate: "",
    services: DEFAULT_SERVICES.map((s) => ({ ...s })),
    visitCount: "",
    visitFrequency: "biweekly",
    supplierCoordination: true,
    exclusions: "",
    customClauses: [],
  };
}

/**
 * Read an annex out of a contract's designerFieldValues bag. Returns null
 * when the contract doesn't have one yet (caller can fall back to defaults).
 */
export function readAnnex(
  designerFieldValues: Record<string, string> | null | undefined
): ContractAnnex | null {
  if (!designerFieldValues) return null;
  const raw = designerFieldValues[ANNEX_STORAGE_KEY];
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ContractAnnex>;
    // Merge with defaults so new fields added later don't crash old contracts.
    const base = emptyAnnex();
    return {
      ...base,
      ...parsed,
      services: Array.isArray(parsed.services) && parsed.services.length > 0
        ? mergeServices(parsed.services)
        : base.services,
      customClauses: Array.isArray(parsed.customClauses) ? parsed.customClauses : [],
    };
  } catch {
    return null;
  }
}

/**
 * Merge a stored service list with the canonical defaults so curated items
 * always keep their original labels even if a designer renamed them before,
 * and new curated items appear in old annexes.
 */
function mergeServices(stored: AnnexService[]): AnnexService[] {
  const byId = new Map(stored.map((s) => [s.id, s]));
  const merged: AnnexService[] = DEFAULT_SERVICES.map((def) => {
    const existing = byId.get(def.id);
    if (existing) {
      byId.delete(def.id);
      return { ...def, ...existing, label: def.label };
    }
    return { ...def };
  });
  // Preserve any custom-added services (unknown ids) that aren't in defaults.
  Array.from(byId.values()).forEach((remaining) => merged.push(remaining));
  return merged;
}

/** Serialize back into the designerFieldValues bag. */
export function writeAnnex(
  designerFieldValues: Record<string, string>,
  annex: ContractAnnex
): Record<string, string> {
  return {
    ...designerFieldValues,
    [ANNEX_STORAGE_KEY]: JSON.stringify(annex),
  };
}

/** True when the annex is both toggled on and has something worth rendering. */
export function annexHasContent(annex: ContractAnnex | null | undefined): boolean {
  if (!annex || !annex.enabled) return false;
  return (
    annex.propertyAddress.trim().length > 0 ||
    annex.renovationScope.trim().length > 0 ||
    annex.services.some((s) => s.included) ||
    annex.customClauses.length > 0
  );
}

export function saveDefaultsToLocalStorage(annex: ContractAnnex): void {
  try {
    if (typeof window === "undefined") return;
    // Save the structural pieces only — don't persist per-client data like
    // addresses, dates, or the free-text scope.
    const defaults: Partial<ContractAnnex> = {
      services: annex.services,
      visitCount: annex.visitCount,
      visitFrequency: annex.visitFrequency,
      supplierCoordination: annex.supplierCoordination,
      exclusions: annex.exclusions,
      customClauses: annex.customClauses,
    };
    window.localStorage.setItem(ANNEX_DEFAULTS_LS_KEY, JSON.stringify(defaults));
  } catch {
    /* localStorage unavailable — swallow */
  }
}

export function loadDefaultsFromLocalStorage(): Partial<ContractAnnex> | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(ANNEX_DEFAULTS_LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<ContractAnnex>;
  } catch {
    return null;
  }
}
