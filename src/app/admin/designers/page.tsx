"use client";
import React, { useState, useMemo, useEffect } from "react";
import {
  Palette, Plus, Search, Download, MapPin, Phone, Instagram, Trophy, TrendingUp,
  Calendar, SortAsc, SortDesc, Mail, Star, Award, Crown, Flame, X, Filter,
  Loader2, AlertTriangle, Briefcase, Home, Hash, ChevronDown, ChevronUp, Eye,
} from "lucide-react";
import { AREAS, SPECIALIZATIONS, formatCurrency } from "@/lib/utils";

// ==========================================
// Types
// ==========================================

type SortField = "fullName" | "totalDealsReported" | "totalDealAmount" | "yearsExperience" | "eventsAttended";
type ActivityLevel = "high" | "medium" | "low" | "none";

interface Designer {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  city: string;
  area: string;
  specialization: string;
  yearsExperience: number;
  instagram: string;
  totalDealsReported: number;
  totalDealAmount: number;
  lotteryEntriesTotal: number;
  lotteryWinsTotal: number;
  eventsAttended: number;
  joinDate: string;
  isActive: boolean;
  postsCount: number;
  // שדות מורחבים
  idNumber: string;
  whatsappPhone: string;
  callOnlyPhone: string;
  neighborhood: string;
  street: string;
  buildingNumber: string;
  apartmentNumber: string;
  floor: string;
  birthDate: string;
  hebrewBirthDate: string;
  employmentType: string;
  yearsAsIndependent: number | null;
  workTypes: string[];
  approvalStatus: string;
}

// ==========================================
// Demo Data — 8 designers
// ==========================================

const WORK_TYPES_LIST = [
  "דירות מגורים", "בתים פרטיים", "פנטהאוזים / דופלקסים", "וילות",
  "משרדים", "חנויות / מסחרי", "מסעדות / בתי קפה", "מלונות / צימרים",
  "מרפאות / קליניקות", "גני ילדים / מוסדות חינוך", "מבני ציבור",
  "שיפוצים", "סטיילינג", "תכנון מטבחים", "תכנון חדרי רחצה", "ליווי קבלנים",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDesignerFromApi(d: any): Designer {
  return {
    id: d.id,
    fullName: d.fullName || "",
    firstName: d.firstName || "",
    lastName: d.lastName || "",
    phone: d.phone || "",
    email: d.email || "",
    city: d.city || "",
    area: d.area || "",
    specialization: d.specialization || "",
    yearsExperience: d.yearsExperience || 0,
    instagram: d.instagram || "",
    totalDealsReported: d.totalDealsReported || 0,
    totalDealAmount: d.totalDealAmount || 0,
    lotteryEntriesTotal: d.lotteryEntriesTotal || 0,
    lotteryWinsTotal: d.lotteryWinsTotal || 0,
    eventsAttended: d.eventsAttended || 0,
    joinDate: d.joinDate ? new Date(d.joinDate).toISOString().slice(0, 10) : "",
    isActive: d.isActive ?? true,
    postsCount: 0,
    // שדות מורחבים
    idNumber: d.idNumber || "",
    whatsappPhone: d.whatsappPhone || "",
    callOnlyPhone: d.callOnlyPhone || "",
    neighborhood: d.neighborhood || "",
    street: d.street || "",
    buildingNumber: d.buildingNumber || "",
    apartmentNumber: d.apartmentNumber || "",
    floor: d.floor || "",
    birthDate: d.birthDate ? new Date(d.birthDate).toISOString().slice(0, 10) : "",
    hebrewBirthDate: d.hebrewBirthDate || "",
    employmentType: d.employmentType || "FREELANCE",
    yearsAsIndependent: d.yearsAsIndependent ?? null,
    workTypes: Array.isArray(d.workTypes) ? d.workTypes : [],
    approvalStatus: d.approvalStatus || "APPROVED",
  };
}

// ==========================================
// Heatmap Data Generator
// ==========================================

function generateHeatmapData(designers: Designer[]): Record<string, ActivityLevel[]> {
  const result: Record<string, ActivityLevel[]> = {};
  const levels: ActivityLevel[] = ["high", "medium", "low", "none"];

  for (const d of designers) {
    const days: ActivityLevel[] = [];
    // More active designers have higher chance of high activity
    const activityBias = d.totalDealsReported > 15 ? 0.6 : d.totalDealsReported > 8 ? 0.4 : d.totalDealsReported > 4 ? 0.25 : 0.1;
    for (let i = 0; i < 30; i++) {
      const rand = Math.random();
      if (rand < activityBias) days.push("high");
      else if (rand < activityBias + 0.2) days.push("medium");
      else if (rand < activityBias + 0.4) days.push("low");
      else days.push("none");
    }
    result[d.id] = days;
  }
  return result;
}

const heatmapColors: Record<ActivityLevel, string> = {
  high: "bg-emerald-500",
  medium: "bg-amber-400",
  low: "bg-red-400",
  none: "bg-gray-200",
};

const heatmapLabels: Record<ActivityLevel, string> = {
  high: "פעילה מאוד",
  medium: "פעילות בינונית",
  low: "פעילות נמוכה",
  none: "לא פעילה",
};

// ==========================================
// Badge System
// ==========================================

interface Badge {
  label: string;
  icon: typeof Star;
  color: string;
  bgColor: string;
}

function computeBadges(designer: Designer, allDesigners: Designer[]): Badge[] {
  const badges: Badge[] = [];
  const sorted = [...allDesigners].sort((a, b) => b.totalDealsReported - a.totalDealsReported);

  // Star of the month — most deals
  if (sorted[0]?.id === designer.id) {
    badges.push({ label: "כוכבת החודש", icon: Crown, color: "text-amber-600", bgColor: "bg-amber-100" });
  }

  // Expert — most experience (15+ years)
  if (designer.yearsExperience >= 15) {
    badges.push({ label: "מומחית", icon: Award, color: "text-purple-600", bgColor: "bg-purple-100" });
  }

  // Active contributor — 10+ deals
  if (designer.totalDealsReported >= 10) {
    badges.push({ label: "תורמת פעילה", icon: Flame, color: "text-orange-600", bgColor: "bg-orange-100" });
  }

  // Lottery winner
  if (designer.lotteryWinsTotal > 0) {
    badges.push({ label: "זוכת הגרלה", icon: Trophy, color: "text-gold", bgColor: "bg-gold/10" });
  }

  return badges;
}

// ==========================================
// Unique cities from data
// ==========================================

function getUniqueCities(designers: Designer[]): string[] {
  return Array.from(new Set(designers.map(d => d.city))).sort();
}

// ==========================================
// Component
// ==========================================

export default function DesignersPage() {
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("הכל");
  const [specFilter, setSpecFilter] = useState("הכל");
  const [cityFilter, setCityFilter] = useState("הכל");
  const [activityFilter, setActivityFilter] = useState("הכל");
  const [employmentFilter, setEmploymentFilter] = useState("הכל");
  const [workTypeFilter, setWorkTypeFilter] = useState("הכל");
  const [statusFilter, setStatusFilter] = useState("הכל");
  const [dealsMin, setDealsMin] = useState("");
  const [dealsMax, setDealsMax] = useState("");
  const [sortField, setSortField] = useState<SortField>("totalDealsReported");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapData, setHeatmapData] = useState<Record<string, ActivityLevel[]>>({});
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/designers?all=true")
      .then((res) => { if (!res.ok) throw new Error("fetch failed"); return res.json(); })
      .then((data) => {
        if (Array.isArray(data)) {
          const mapped = data.map(mapDesignerFromApi);
          setDesigners(mapped);
          setHeatmapData(generateHeatmapData(mapped));
        }
      })
      .catch(() => setError("שגיאה בטעינת מעצבות. נסו לרענן את הדף."))
      .finally(() => setLoading(false));
  }, []);

  const cities = useMemo(() => getUniqueCities(designers), [designers]);

  // Active filter pills
  const activeFilters = useMemo(() => {
    const filters: { key: string; label: string; clear: () => void }[] = [];
    if (areaFilter !== "הכל") filters.push({ key: "area", label: `אזור: ${areaFilter}`, clear: () => setAreaFilter("הכל") });
    if (specFilter !== "הכל") filters.push({ key: "spec", label: `התמחות: ${specFilter}`, clear: () => setSpecFilter("הכל") });
    if (cityFilter !== "הכל") filters.push({ key: "city", label: `עיר: ${cityFilter}`, clear: () => setCityFilter("הכל") });
    if (activityFilter !== "הכל") filters.push({ key: "activity", label: `פעילות: ${activityFilter}`, clear: () => setActivityFilter("הכל") });
    if (employmentFilter !== "הכל") filters.push({ key: "employment", label: `סוג: ${employmentFilter === "FREELANCE" ? "עצמאית" : "שכירה"}`, clear: () => setEmploymentFilter("הכל") });
    if (workTypeFilter !== "הכל") filters.push({ key: "workType", label: `עבודות: ${workTypeFilter}`, clear: () => setWorkTypeFilter("הכל") });
    if (statusFilter !== "הכל") filters.push({ key: "status", label: `סטטוס: ${statusFilter}`, clear: () => setStatusFilter("הכל") });
    if (dealsMin) filters.push({ key: "dealsMin", label: `מינימום ${dealsMin} עסקאות`, clear: () => setDealsMin("") });
    if (dealsMax) filters.push({ key: "dealsMax", label: `מקסימום ${dealsMax} עסקאות`, clear: () => setDealsMax("") });
    return filters;
  }, [areaFilter, specFilter, cityFilter, activityFilter, employmentFilter, workTypeFilter, statusFilter, dealsMin, dealsMax]);

  const clearAllFilters = () => {
    setSearch("");
    setAreaFilter("הכל");
    setSpecFilter("הכל");
    setCityFilter("הכל");
    setActivityFilter("הכל");
    setEmploymentFilter("הכל");
    setWorkTypeFilter("הכל");
    setStatusFilter("הכל");
    setDealsMin("");
    setDealsMax("");
  };

  const filteredDesigners = useMemo(() => {
    const filtered = designers.filter((d) => {
      const matchSearch = !search || d.fullName.includes(search) || d.city.includes(search) || d.email.includes(search) || d.phone.includes(search) || d.idNumber.includes(search);
      const matchArea = areaFilter === "הכל" || d.area === areaFilter;
      const matchSpec = specFilter === "הכל" || d.specialization === specFilter;
      const matchCity = cityFilter === "הכל" || d.city === cityFilter;
      const matchDealsMin = !dealsMin || d.totalDealsReported >= parseInt(dealsMin);
      const matchDealsMax = !dealsMax || d.totalDealsReported <= parseInt(dealsMax);
      const matchEmployment = employmentFilter === "הכל" || d.employmentType === employmentFilter;
      const matchWorkType = workTypeFilter === "הכל" || d.workTypes.includes(workTypeFilter);
      const matchStatus = statusFilter === "הכל" || d.approvalStatus === statusFilter;

      let matchActivity = true;
      if (activityFilter === "גבוהה") matchActivity = d.totalDealsReported >= 10;
      else if (activityFilter === "בינונית") matchActivity = d.totalDealsReported >= 5 && d.totalDealsReported < 10;
      else if (activityFilter === "נמוכה") matchActivity = d.totalDealsReported < 5;

      return matchSearch && matchArea && matchSpec && matchCity && matchDealsMin && matchDealsMax && matchActivity && matchEmployment && matchWorkType && matchStatus;
    });
    return filtered.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === "asc" ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });
  }, [designers, search, areaFilter, specFilter, cityFilter, activityFilter, employmentFilter, workTypeFilter, statusFilter, dealsMin, dealsMax, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <SortAsc className="w-3 h-3 opacity-30" />;
    return sortDir === "asc" ? <SortAsc className="w-3 h-3 text-gold" /> : <SortDesc className="w-3 h-3 text-gold" />;
  };

  const totalDeals = designers.reduce((s, d) => s + d.totalDealsReported, 0);
  const totalAmount = designers.reduce((s, d) => s + d.totalDealAmount, 0);

  // Feature 6: Hall of Fame
  const hallOfFame = useMemo(() => {
    const sorted = [...designers].sort((a, b) => b.totalDealsReported - a.totalDealsReported);
    return sorted.slice(0, 3);
  }, [designers]);

  // Last 30 days labels
  const dayLabels = useMemo(() => {
    const labels: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(`${d.getDate()}/${d.getMonth() + 1}`);
    }
    return labels;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted gap-2">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>טוען מעצבות...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-400">
        <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-60" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-heading text-text-primary flex items-center gap-2">
            <Palette className="w-7 h-7" />ניהול מעצבות
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {designers.length} מעצבות רשומות — {designers.filter(d => d.isActive).length} פעילות
            {designers.filter(d => d.approvalStatus === "PENDING").length > 0 && (
              <span className="text-amber-600 mr-2">
                ({designers.filter(d => d.approvalStatus === "PENDING").length} ממתינות לאישור)
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowHeatmap(!showHeatmap)} className={`btn-outline flex items-center gap-2 text-sm ${showHeatmap ? "!bg-gold/10 !text-gold !border-gold/30" : ""}`}>
            <TrendingUp className="w-4 h-4" />{showHeatmap ? "הסתר מפת חום" : "מפת חום"}
          </button>
          <button className="btn-outline flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" />ייצוא Excel
          </button>
          <button className="btn-gold flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />הוסף מעצבת
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card-static text-center py-3">
          <p className="text-gold font-mono text-xl font-bold">{designers.length}</p>
          <p className="text-text-muted text-xs">סה&quot;כ מעצבות</p>
        </div>
        <div className="card-static text-center py-3">
          <p className="text-gold font-mono text-xl font-bold">{totalDeals}</p>
          <p className="text-text-muted text-xs">עסקאות שדווחו</p>
        </div>
        <div className="card-static text-center py-3">
          <p className="text-emerald-600 font-mono text-xl font-bold">{formatCurrency(totalAmount)}</p>
          <p className="text-text-muted text-xs">סכום עסקאות</p>
        </div>
        <div className="card-static text-center py-3">
          <p className="text-gold font-mono text-xl font-bold">{designers.reduce((s, d) => s + d.lotteryWinsTotal, 0)}</p>
          <p className="text-text-muted text-xs">זכיות בהגרלות</p>
        </div>
      </div>

      {/* ============ Feature 6: Hall of Fame ============ */}
      <div className="card-static">
        <h3 className="text-text-primary font-heading mb-4 flex items-center gap-2">
          <Crown className="w-5 h-5 text-gold" />היכל התהילה — מצטיינות החודש
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {hallOfFame.map((d, i) => {
            const badges = computeBadges(d, designers);
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉";
            return (
              <div key={d.id} className={`bg-bg-surface rounded-xl p-4 text-center ${i === 0 ? "ring-2 ring-gold/30" : ""}`}>
                <div className="text-2xl mb-2">{medal}</div>
                <div className="w-14 h-14 rounded-full bg-gold/20 flex items-center justify-center text-gold text-xl font-bold mx-auto">
                  {d.fullName[0]}
                </div>
                <p className="text-text-primary font-medium mt-2">{d.fullName}</p>
                <p className="text-text-muted text-xs">{d.specialization} • {d.city}</p>
                <div className="flex justify-center gap-2 mt-2">
                  <span className="text-gold font-mono font-bold">{d.totalDealsReported}</span>
                  <span className="text-text-muted text-xs">עסקאות</span>
                  <span className="text-emerald-600 font-mono font-bold">{formatCurrency(d.totalDealAmount)}</span>
                </div>
                <div className="flex flex-wrap justify-center gap-1 mt-2">
                  {badges.map((b, bi) => {
                    const BadgeIcon = b.icon;
                    return (
                      <span key={bi} className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${b.bgColor} ${b.color}`}>
                        <BadgeIcon className="w-3 h-3" />{b.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============ Feature 4: Advanced Filters ============ */}
      <div className="card-static">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-text-muted" />
          <h3 className="text-text-primary font-heading text-sm">סינון מתקדם</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="relative col-span-2 md:col-span-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input type="text" placeholder="חיפוש שם / עיר / מייל / ת.ז. ..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-dark pr-10" />
          </div>
          <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="select-dark">
            <option value="הכל">כל האזורים</option>
            {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={specFilter} onChange={(e) => setSpecFilter(e.target.value)} className="select-dark">
            <option value="הכל">כל ההתמחויות</option>
            {SPECIALIZATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="select-dark">
            <option value="הכל">כל הערים</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={activityFilter} onChange={(e) => setActivityFilter(e.target.value)} className="select-dark">
            <option value="הכל">כל רמות הפעילות</option>
            <option value="גבוהה">גבוהה (10+)</option>
            <option value="בינונית">בינונית (5-9)</option>
            <option value="נמוכה">נמוכה (&lt;5)</option>
          </select>
          <select value={employmentFilter} onChange={(e) => setEmploymentFilter(e.target.value)} className="select-dark">
            <option value="הכל">סוג העסקה</option>
            <option value="FREELANCE">עצמאית</option>
            <option value="SALARIED">שכירה</option>
          </select>
          <select value={workTypeFilter} onChange={(e) => setWorkTypeFilter(e.target.value)} className="select-dark">
            <option value="הכל">סוגי עבודות</option>
            {WORK_TYPES_LIST.map((wt) => <option key={wt} value={wt}>{wt}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select-dark">
            <option value="הכל">כל הסטטוסים</option>
            <option value="APPROVED">מאושרת</option>
            <option value="PENDING">ממתינה</option>
            <option value="REJECTED">נדחתה</option>
          </select>
          <div className="flex gap-2">
            <input type="number" placeholder="מינ׳ עסקאות" value={dealsMin} onChange={(e) => setDealsMin(e.target.value)} className="input-dark w-full" min="0" />
            <input type="number" placeholder="מקס׳" value={dealsMax} onChange={(e) => setDealsMax(e.target.value)} className="input-dark w-full" min="0" />
          </div>
        </div>

        {/* Active filter pills */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 items-center">
            {activeFilters.map(f => (
              <button key={f.key} onClick={f.clear} className="flex items-center gap-1 text-xs bg-gold/10 text-gold px-2.5 py-1 rounded-full hover:bg-gold/20 transition-colors">
                {f.label}
                <X className="w-3 h-3" />
              </button>
            ))}
            <button onClick={clearAllFilters} className="text-xs text-red-500 hover:text-red-600 hover:underline">
              נקה הכל
            </button>
            <span className="text-text-muted text-xs mr-auto">{filteredDesigners.length} תוצאות</span>
          </div>
        )}
      </div>

      {/* ============ Feature 5: Activity Heatmap ============ */}
      {showHeatmap && (
        <div className="card-static overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-text-primary font-heading flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />מפת חום — פעילות 30 ימים אחרונים
            </h3>
            <div className="flex items-center gap-3 text-[10px] text-text-muted">
              {(Object.entries(heatmapColors) as [ActivityLevel, string][]).map(([level, color]) => (
                <div key={level} className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded-sm ${color}`} />
                  <span>{heatmapLabels[level]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="min-w-[700px]">
            {/* Day labels */}
            <div className="flex items-center mb-1">
              <div className="w-28 flex-shrink-0" />
              <div className="flex-1 flex">
                {dayLabels.map((label, i) => (
                  <div key={i} className="flex-1 text-center text-[8px] text-text-muted" style={{ minWidth: "16px" }}>
                    {i % 5 === 0 ? label : ""}
                  </div>
                ))}
              </div>
            </div>
            {/* Designer rows */}
            {filteredDesigners.map((d) => (
              <div key={d.id} className="flex items-center mb-0.5 group">
                <div className="w-28 flex-shrink-0 text-xs text-text-primary truncate pl-2">{d.fullName}</div>
                <div className="flex-1 flex gap-[1px]">
                  {(heatmapData[d.id] || []).map((level, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-4 rounded-[2px] ${heatmapColors[level]} hover:ring-1 hover:ring-gold cursor-default transition-all`}
                      title={`${d.fullName} • ${dayLabels[i]} • ${heatmapLabels[level]}`}
                      style={{ minWidth: "14px" }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============ Designers Table ============ */}
      <div className="card-static overflow-x-auto">
        <table className="w-full table-luxury">
          <thead>
            <tr>
              <th style={{ width: 32 }}></th>
              <th className="cursor-pointer" onClick={() => handleSort("fullName")}>
                <span className="flex items-center gap-1">שם<SortIcon field="fullName" /></span>
              </th>
              <th>טלפון</th>
              <th>מייל</th>
              <th>עיר</th>
              <th>סוג העסקה</th>
              <th>סטטוס</th>
              <th className="cursor-pointer" onClick={() => handleSort("totalDealsReported")}>
                <span className="flex items-center gap-1">עסקאות<SortIcon field="totalDealsReported" /></span>
              </th>
              <th className="cursor-pointer" onClick={() => handleSort("totalDealAmount")}>
                <span className="flex items-center gap-1">סכום<SortIcon field="totalDealAmount" /></span>
              </th>
              <th>תגים</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {filteredDesigners.map((d) => {
              const badges = computeBadges(d, designers);
              const isExpanded = expandedRow === d.id;
              const statusLabel = d.approvalStatus === "APPROVED" ? "מאושרת" : d.approvalStatus === "PENDING" ? "ממתינה" : "נדחתה";
              const statusColor = d.approvalStatus === "APPROVED" ? "text-emerald-600 bg-emerald-50" : d.approvalStatus === "PENDING" ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50";
              const fullAddress = [d.street, d.buildingNumber ? `${d.buildingNumber}` : "", d.neighborhood, d.city].filter(Boolean).join(", ");

              return (
                <React.Fragment key={d.id}>
                <tr className="cursor-pointer" onClick={() => setExpandedRow(isExpanded ? null : d.id)}>
                  <td>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gold" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                  </td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold text-sm font-bold flex-shrink-0">
                        {d.fullName[0]}
                      </div>
                      <div>
                        <p className="text-text-primary font-medium">{d.fullName}</p>
                        <p className="text-text-muted text-xs">{d.joinDate}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="space-y-0.5">
                      <a href={`tel:${d.phone}`} className="text-text-primary hover:text-gold text-xs block" dir="ltr">{d.phone}</a>
                      {d.whatsappPhone && d.whatsappPhone !== d.phone && (
                        <span className="text-text-muted text-[10px]" dir="ltr">WA: {d.whatsappPhone}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <a href={`mailto:${d.email}`} className="text-text-primary hover:text-gold text-xs truncate block max-w-[140px]" dir="ltr">{d.email}</a>
                  </td>
                  <td>
                    <span className="flex items-center gap-1 text-sm"><MapPin className="w-3 h-3 text-text-muted" />{d.city}</span>
                  </td>
                  <td>
                    <span className="text-xs text-text-muted">
                      {d.employmentType === "FREELANCE" ? "עצמאית" : "שכירה"}
                      {d.yearsAsIndependent != null && d.yearsAsIndependent > 0 ? ` (${d.yearsAsIndependent} שנים)` : ""}
                    </span>
                  </td>
                  <td>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </td>
                  <td><span className="font-mono text-gold font-bold">{d.totalDealsReported}</span></td>
                  <td className="font-mono">{formatCurrency(d.totalDealAmount)}</td>
                  <td>
                    <div className="flex flex-wrap gap-1 max-w-[150px]">
                      {badges.map((b, bi) => {
                        const BadgeIcon = b.icon;
                        return (
                          <span key={bi} className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full ${b.bgColor} ${b.color}`} title={b.label}>
                            <BadgeIcon className="w-2.5 h-2.5" />{b.label}
                          </span>
                        );
                      })}
                      {badges.length === 0 && <span className="text-text-muted text-[9px]">—</span>}
                    </div>
                  </td>
                  <td>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <a href={`tel:${d.phone}`} className="text-text-muted hover:text-gold transition-colors"><Phone className="w-4 h-4" /></a>
                      <a href={`mailto:${d.email}`} className="text-text-muted hover:text-gold transition-colors"><Mail className="w-4 h-4" /></a>
                      {d.instagram && <span className="text-text-muted hover:text-gold transition-colors cursor-pointer"><Instagram className="w-4 h-4" /></span>}
                    </div>
                  </td>
                </tr>
                {/* שורת פרטים מורחבת */}
                {isExpanded && (
                  <tr>
                    <td colSpan={11} className="!p-0">
                      <div className="bg-bg-surface/50 border-t border-b border-border/30 p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          {/* פרטים אישיים */}
                          <div>
                            <h4 className="text-text-muted text-xs font-medium mb-2 flex items-center gap-1">
                              <Hash className="w-3 h-3" />פרטים אישיים
                            </h4>
                            <div className="space-y-1 text-text-primary text-xs">
                              {d.firstName && <p><span className="text-text-muted">שם פרטי:</span> {d.firstName}</p>}
                              {d.lastName && <p><span className="text-text-muted">שם משפחה:</span> {d.lastName}</p>}
                              {d.idNumber && <p><span className="text-text-muted">ת.ז.:</span> {d.idNumber}</p>}
                              {d.birthDate && <p><span className="text-text-muted">תאריך לידה:</span> {d.birthDate}</p>}
                              {d.hebrewBirthDate && <p><span className="text-text-muted">ת.ל. עברי:</span> {d.hebrewBirthDate}</p>}
                            </div>
                          </div>
                          {/* כתובת */}
                          <div>
                            <h4 className="text-text-muted text-xs font-medium mb-2 flex items-center gap-1">
                              <Home className="w-3 h-3" />כתובת מלאה
                            </h4>
                            <div className="space-y-1 text-text-primary text-xs">
                              {fullAddress && <p>{fullAddress}</p>}
                              {d.apartmentNumber && <p><span className="text-text-muted">דירה:</span> {d.apartmentNumber}</p>}
                              {d.floor && <p><span className="text-text-muted">קומה:</span> {d.floor}</p>}
                              {d.callOnlyPhone && <p><span className="text-text-muted">טלפון לשיחות:</span> <span dir="ltr">{d.callOnlyPhone}</span></p>}
                            </div>
                          </div>
                          {/* מקצועי */}
                          <div>
                            <h4 className="text-text-muted text-xs font-medium mb-2 flex items-center gap-1">
                              <Briefcase className="w-3 h-3" />פרטים מקצועיים
                            </h4>
                            <div className="space-y-1 text-text-primary text-xs">
                              {d.specialization && <p><span className="text-text-muted">התמחות:</span> {d.specialization}</p>}
                              <p><span className="text-text-muted">סוג העסקה:</span> {d.employmentType === "FREELANCE" ? "עצמאית" : "שכירה"}</p>
                              {d.yearsAsIndependent != null && <p><span className="text-text-muted">שנות וותק:</span> {d.yearsAsIndependent}</p>}
                              {d.yearsExperience > 0 && <p><span className="text-text-muted">ניסיון:</span> {d.yearsExperience} שנים</p>}
                            </div>
                          </div>
                          {/* פעילות */}
                          <div>
                            <h4 className="text-text-muted text-xs font-medium mb-2 flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />נתוני פעילות
                            </h4>
                            <div className="space-y-1 text-text-primary text-xs">
                              <p><span className="text-text-muted">הגרלות:</span> {d.lotteryWinsTotal} זכיות / {d.lotteryEntriesTotal} השתתפויות</p>
                              <p><span className="text-text-muted">אירועים:</span> {d.eventsAttended}</p>
                              <p><span className="text-text-muted">הצטרפות:</span> {d.joinDate}</p>
                            </div>
                          </div>
                        </div>
                        {/* סוגי עבודות */}
                        {d.workTypes.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border/20">
                            <h4 className="text-text-muted text-xs font-medium mb-2 flex items-center gap-1">
                              <Briefcase className="w-3 h-3" />סוגי עבודות
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {d.workTypes.map((wt, wi) => (
                                <span key={wi} className="text-[10px] px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
                                  {wt}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {filteredDesigners.length === 0 && (
          <div className="text-center py-8 text-text-muted">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>לא נמצאו מעצבות עם הסינון הנוכחי</p>
          </div>
        )}
      </div>

      {/* Activity Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-static">
          <h3 className="text-text-primary font-heading mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />TOP 5 — הכי פעילות
          </h3>
          <div className="space-y-3">
            {[...designers].sort((a, b) => b.totalDealsReported - a.totalDealsReported).slice(0, 5).map((d, i) => (
              <div key={d.id} className="flex items-center gap-3">
                <span className="text-gold font-mono font-bold w-6 text-center">{i + 1}</span>
                <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold text-sm font-bold">{d.fullName[0]}</div>
                <div className="flex-1">
                  <p className="text-text-primary text-sm">{d.fullName}</p>
                  <p className="text-text-muted text-xs">{d.specialization} | {d.city}</p>
                </div>
                <div className="text-left">
                  <p className="text-gold font-mono font-bold">{d.totalDealsReported}</p>
                  <p className="text-text-muted text-xs">עסקאות</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-static">
          <h3 className="text-text-primary font-heading mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5" />זכו בהגרלות
          </h3>
          <div className="space-y-3">
            {designers.filter(d => d.lotteryWinsTotal > 0).sort((a, b) => b.lotteryWinsTotal - a.lotteryWinsTotal).map((d) => (
              <div key={d.id} className="flex items-center gap-3 bg-bg-surface rounded-card p-3">
                <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-gold" />
                </div>
                <div className="flex-1">
                  <p className="text-text-primary font-medium">{d.fullName}</p>
                  <p className="text-text-muted text-xs">{d.city}</p>
                </div>
                <div className="text-left">
                  <p className="text-gold font-mono font-bold text-lg">{d.lotteryWinsTotal}</p>
                  <p className="text-text-muted text-xs">זכיות</p>
                </div>
              </div>
            ))}
            {designers.filter(d => d.lotteryWinsTotal > 0).length === 0 && (
              <p className="text-text-muted text-center py-4">עדיין אין זוכות</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
