"use client";

import { useEffect, useState, useCallback } from "react";
import {
  UserPlus, Check, X, Phone, Mail, MapPin, Clock, Search,
  Briefcase, Loader2, AlertCircle, RefreshCw,
} from "lucide-react";

interface WaitlistDesigner {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  city: string | null;
  specialization: string | null;
  employmentType: "SALARIED" | "FREELANCE";
  yearsAsIndependent: number | null;
  createdAt: string;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
}

const ALL_WAITLIST_FILTER = "ALL";

export default function WaitlistPage() {
  const [designers, setDesigners] = useState<WaitlistDesigner[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("PENDING");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadDesigners = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("status", filter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/waitlist?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setDesigners(data.designers || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה בטעינת נתונים");
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    loadDesigners();
  }, [loadDesigners]);

  const pendingCount = designers.filter((d) => d.approvalStatus === "PENDING").length;

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setActionLoading(id);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/admin/waitlist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designerId: id, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setSuccessMsg(data.message);
      // Update local state immediately
      setDesigners((prev) =>
        prev.map((d) =>
          d.id === id
            ? { ...d, approvalStatus: action === "approve" ? "APPROVED" : "REJECTED" }
            : d
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה בעדכון");
    } finally {
      setActionLoading(null);
    }
  };

  function formatDate(iso: string | null | undefined): string {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleDateString("he-IL", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "-";
    }
  }

  // Client-side filter for display (API already filters by status, but we also handle search locally for responsiveness)
  const filtered = designers.filter((d) => {
    if (filter !== ALL_WAITLIST_FILTER && d.approvalStatus !== filter) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading text-text-primary flex items-center gap-2">
            <UserPlus className="w-7 h-7" />
            רשימת המתנה
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {filter === "PENDING" && !loading ? (
              filtered.length > 0 ? (
                <span className="text-yellow-500">
                  {filtered.length} מעצבות ממתינות לאישור
                </span>
              ) : (
                "אין בקשות ממתינות"
              )
            ) : (
              `${filtered.length} תוצאות`
            )}
          </p>
        </div>
        <button
          onClick={loadDesigners}
          className="btn-outline flex items-center gap-2 text-sm px-3 py-2"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          רענן
        </button>
      </div>

      {/* Success / Error messages */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <Check className="w-4 h-4" />
          {successMsg}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="card-static">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="חיפוש שם / מייל / עיר..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-dark pr-10"
            />
          </div>
          <div className="flex gap-2">
            {(
              [
                { value: "PENDING", label: "ממתינה" },
                { value: "APPROVED", label: "אושרו" },
                { value: "REJECTED", label: "נדחו" },
                { value: ALL_WAITLIST_FILTER, label: "הכל" },
              ] as const
            ).map((status) => (
              <button
                key={status.value}
                onClick={() => setFilter(status.value)}
                className={`px-3 py-2 rounded-btn text-xs transition-all ${
                  filter === status.value
                    ? "bg-gold text-bg font-bold"
                    : "bg-bg-surface text-text-muted hover:text-gold border border-border-subtle"
                }`}
              >
                {status.value === "PENDING"
                  ? `${status.label} (${pendingCount})`
                  : status.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-gold animate-spin" />
        </div>
      )}

      {/* Waitlist Cards */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((d) => (
            <div
              key={d.id}
              className={`card-static ${
                d.approvalStatus === "APPROVED"
                  ? "border-emerald-500/30"
                  : d.approvalStatus === "REJECTED"
                  ? "border-red-500/30"
                  : "border-gold/30"
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-heading text-text-primary text-lg font-bold">
                    {d.fullName}
                  </h3>
                  <div className="flex items-center gap-1 text-text-muted text-xs mt-1">
                    <Clock className="w-3 h-3" />
                    הגישה ב-{formatDate(d.createdAt)}
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    d.approvalStatus === "PENDING"
                      ? "bg-yellow-50 text-yellow-600"
                      : d.approvalStatus === "APPROVED"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  {d.approvalStatus === "PENDING"
                    ? "ממתינה"
                    : d.approvalStatus === "APPROVED"
                    ? "אושרה"
                    : "נדחתה"}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-text-muted" />
                  <span className="text-text-primary" dir="ltr">
                    {d.phone}
                  </span>
                </div>
                {d.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-text-muted" />
                    <span className="text-text-primary" dir="ltr">
                      {d.email}
                    </span>
                  </div>
                )}
                {d.city && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-text-muted" />
                    <span className="text-text-primary">{d.city}</span>
                  </div>
                )}
                {d.specialization && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-text-muted" />
                    <span className="text-text-primary">
                      {d.specialization}
                    </span>
                  </div>
                )}
              </div>

              {/* Employment info */}
              <div className="flex gap-2 mb-4 text-xs">
                <span className="bg-bg-surface rounded px-2 py-1 text-text-primary">
                  {d.employmentType === "FREELANCE" ? "עצמאית" : "שכירה"}
                </span>
                {d.yearsAsIndependent != null && (
                  <span className="bg-bg-surface rounded px-2 py-1 text-text-primary">
                    {d.yearsAsIndependent} שנות וותק
                  </span>
                )}
              </div>

              {/* Actions */}
              {d.approvalStatus === "PENDING" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(d.id, "approve")}
                    disabled={actionLoading === d.id}
                    className="btn-gold flex-1 flex items-center justify-center gap-2 text-sm py-2 disabled:opacity-50"
                  >
                    {actionLoading === d.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    אשר הצטרפות
                  </button>
                  <button
                    onClick={() => handleAction(d.id, "reject")}
                    disabled={actionLoading === d.id}
                    className="btn-outline flex-1 flex items-center justify-center gap-2 text-sm py-2 text-red-500 border-red-200 hover:bg-red-50 disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    דחה
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 text-text-muted">
          <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>אין בקשות בקטגוריה זו</p>
        </div>
      )}
    </div>
  );
}
