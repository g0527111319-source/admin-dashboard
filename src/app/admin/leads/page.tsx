"use client";
// Admin leads list page.
//
// Shows every lead that came through the /find-designer intake form with:
//   • status filter tabs (with counts)
//   • search box (name / phone / email / city)
//   • per-row quick actions (view, archive, delete)
//
// Clicking a row navigates to /admin/leads/[id] for the full workflow
// (post-to-community, pick designers, etc.).

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Inbox, Search, Loader2, AlertTriangle, Archive, Trash2, Eye, Users,
  Phone, Mail, MapPin, Clock, Sparkles, CheckCircle2, XCircle, FileText,
} from "lucide-react";

type LeadStatus = "NEW" | "REVIEWING" | "POSTED_TO_COMMUNITY" | "DISTRIBUTED" | "CONVERTED" | "ARCHIVED";

interface LeadRow {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  city: string;
  sizeSqm: number | null;
  renovationBudget: number | null;
  designerBudget: number | null;
  startTiming: string | null;
  status: LeadStatus;
  createdAt: string;
  postedToCommunityAt: string | null;
  distributedAt: string | null;
  convertedAt: string | null;
  _count: { interests: number; assignments: number };
}

interface StatusCount {
  status: LeadStatus;
  _count: { _all: number };
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

const FILTER_TABS: { key: LeadStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "הכל" },
  { key: "NEW", label: "חדשים" },
  { key: "REVIEWING", label: "בבדיקה" },
  { key: "POSTED_TO_COMMUNITY", label: "בקהילה" },
  { key: "DISTRIBUTED", label: "הוקצו" },
  { key: "CONVERTED", label: "הומרו" },
  { key: "ARCHIVED", label: "ארכיון" },
];

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("he-IL") + " " + d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

function formatCurrencyShort(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1_000_000) return `₪${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `₪${Math.round(v / 1_000)}K`;
  return `₪${v}`;
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [counts, setCounts] = useState<Record<LeadStatus, number>>({
    NEW: 0, REVIEWING: 0, POSTED_TO_COMMUNITY: 0, DISTRIBUTED: 0, CONVERTED: 0, ARCHIVED: 0,
  });
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/admin/leads?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("fetch failed");
      const data = (await res.json()) as { leads: LeadRow[]; counts: StatusCount[] };
      setLeads(data.leads || []);
      const c: Record<LeadStatus, number> = { NEW: 0, REVIEWING: 0, POSTED_TO_COMMUNITY: 0, DISTRIBUTED: 0, CONVERTED: 0, ARCHIVED: 0 };
      for (const row of data.counts || []) {
        c[row.status] = row._count._all;
      }
      setCounts(c);
    } catch {
      setError("שגיאה בטעינת הלידים");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const quickAction = async (leadId: string, action: "archive" | "restore" | "delete") => {
    if (action === "delete" && !confirm("למחוק את הליד לצמיתות? פעולה זו בלתי הפיכה.")) return;
    setBusy(leadId);
    try {
      if (action === "archive") {
        await fetch(`/api/admin/leads/${leadId}`, {
          method: "PATCH", headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: "ARCHIVED" }),
        });
      } else if (action === "restore") {
        await fetch(`/api/admin/leads/${leadId}`, {
          method: "PATCH", headers: { "content-type": "application/json" },
          body: JSON.stringify({ restore: true }),
        });
      } else if (action === "delete") {
        await fetch(`/api/admin/leads/${leadId}`, { method: "DELETE" });
      }
      await load();
    } catch {
      alert("שגיאה בביצוע הפעולה");
    } finally {
      setBusy(null);
    }
  };

  const totalAll = useMemo(() => Object.values(counts).reduce((a, b) => a + b, 0), [counts]);

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-heading text-text-primary flex items-center gap-2">
            <Inbox className="w-7 h-7" />לידים מהקהילה
          </h1>
          <p className="text-text-muted text-sm mt-1">
            לקוחות פרטיים שמילאו את הטופס ״אני מחפש/ת מעצבת״ — {totalAll} סה״כ
          </p>
        </div>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="חדשים" value={counts.NEW} color="text-blue-600" icon={Sparkles} />
        <StatCard label="בבדיקה" value={counts.REVIEWING} color="text-amber-600" icon={Clock} />
        <StatCard label="בקהילה" value={counts.POSTED_TO_COMMUNITY} color="text-purple-600" icon={Users} />
        <StatCard label="הוקצו" value={counts.DISTRIBUTED} color="text-indigo-600" icon={FileText} />
        <StatCard label="הומרו ללקוחות" value={counts.CONVERTED} color="text-emerald-600" icon={CheckCircle2} />
        <StatCard label="ארכיון" value={counts.ARCHIVED} color="text-gray-500" icon={Archive} />
      </div>

      {/* Filters + search */}
      <div className="card-static">
        <div className="flex flex-wrap gap-2 mb-3">
          {FILTER_TABS.map((tab) => {
            const c = tab.key === "ALL" ? totalAll : counts[tab.key as LeadStatus];
            const active = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                  active
                    ? "bg-gold text-white shadow-sm"
                    : "bg-bg-surface text-text-muted hover:text-text-primary hover:bg-gold/5"
                }`}
              >
                {tab.label}
                <span className={`mr-1.5 text-xs ${active ? "text-white/80" : "text-text-muted"}`}>
                  ({c})
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="חיפוש לפי שם / טלפון / מייל / עיר..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark pr-10 w-full"
          />
        </div>
      </div>

      {/* Loading / error */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-text-muted gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>טוען לידים...</span>
        </div>
      ) : error ? (
        <div className="text-center py-20 text-red-500">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-60" />
          <p>{error}</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="card-static text-center py-12 text-text-muted">
          <Inbox className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>לא נמצאו לידים בסינון הנוכחי</p>
        </div>
      ) : (
        <div className="card-static overflow-x-auto">
          <table className="w-full table-luxury">
            <thead>
              <tr>
                <th>לקוח</th>
                <th>פרטי קשר</th>
                <th>עיר / גודל</th>
                <th>תקציבים</th>
                <th>תזמון</th>
                <th>סטטוס</th>
                <th>התקדמות</th>
                <th>התקבל</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => {
                const name = `${l.firstName} ${l.lastName}`.trim();
                const isArchived = l.status === "ARCHIVED";
                return (
                  <tr key={l.id}>
                    <td>
                      <Link href={`/admin/leads/${l.id}`} className="flex items-center gap-3 group">
                        <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold text-sm font-bold flex-shrink-0">
                          {l.firstName?.[0] || "?"}
                        </div>
                        <div>
                          <p className="text-text-primary font-medium group-hover:text-gold transition-colors">{name || "—"}</p>
                          <p className="text-text-muted text-xs">#{l.id.slice(0, 8)}</p>
                        </div>
                      </Link>
                    </td>
                    <td>
                      <div className="space-y-0.5">
                        <a href={`tel:${l.phone}`} className="text-text-primary hover:text-gold text-xs flex items-center gap-1" dir="ltr">
                          <Phone className="w-3 h-3" /> {l.phone}
                        </a>
                        <a href={`mailto:${l.email}`} className="text-text-muted hover:text-gold text-xs flex items-center gap-1 truncate max-w-[180px]" dir="ltr">
                          <Mail className="w-3 h-3 flex-shrink-0" /> {l.email}
                        </a>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="w-3 h-3 text-text-muted" />
                        <span>{l.city || "—"}</span>
                      </div>
                      {l.sizeSqm && <p className="text-text-muted text-xs mt-0.5">{l.sizeSqm} מ״ר</p>}
                    </td>
                    <td>
                      <div className="text-xs space-y-0.5">
                        <p>
                          <span className="text-text-muted">שיפוץ:</span>{" "}
                          <span className="font-mono">{formatCurrencyShort(l.renovationBudget)}</span>
                        </p>
                        <p>
                          <span className="text-text-muted">מעצבת:</span>{" "}
                          <span className="font-mono">{formatCurrencyShort(l.designerBudget)}</span>
                        </p>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs text-text-muted">{l.startTiming || "—"}</span>
                    </td>
                    <td>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${STATUS_COLORS[l.status]}`}>
                        {STATUS_LABELS[l.status]}
                      </span>
                    </td>
                    <td>
                      <div className="text-xs text-text-muted space-y-0.5">
                        {l._count.interests > 0 && (
                          <p className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> {l._count.interests} מעוניינות
                          </p>
                        )}
                        {l._count.assignments > 0 && (
                          <p className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> {l._count.assignments} הוקצו
                          </p>
                        )}
                        {l._count.interests === 0 && l._count.assignments === 0 && <span>—</span>}
                      </div>
                    </td>
                    <td>
                      <span className="text-xs text-text-muted">{formatDateTime(l.createdAt)}</span>
                    </td>
                    <td>
                      <div className="flex gap-1.5">
                        <Link
                          href={`/admin/leads/${l.id}`}
                          className="p-1.5 rounded-md text-text-muted hover:text-gold hover:bg-gold/5 transition-colors"
                          title="צפה בליד"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {isArchived ? (
                          <button
                            onClick={() => quickAction(l.id, "restore")}
                            disabled={busy === l.id}
                            className="p-1.5 rounded-md text-text-muted hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-40"
                            title="שחזר מארכיון"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => quickAction(l.id, "archive")}
                            disabled={busy === l.id}
                            className="p-1.5 rounded-md text-text-muted hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-40"
                            title="העבר לארכיון"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => quickAction(l.id, "delete")}
                          disabled={busy === l.id}
                          className="p-1.5 rounded-md text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                          title="מחיקה"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, icon: Icon }: {
  label: string; value: number; color: string; icon: typeof Inbox;
}) {
  return (
    <div className="card-static py-3 px-3 text-center">
      <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
      <p className={`font-mono text-xl font-bold ${color}`}>{value}</p>
      <p className="text-text-muted text-xs">{label}</p>
    </div>
  );
}
