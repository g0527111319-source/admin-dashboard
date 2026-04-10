"use client";

import { useEffect, useState, useCallback } from "react";
import {
  UserPlus, Check, X, Phone, Mail, MapPin, Clock, Search,
  Briefcase, Loader2, AlertCircle, RefreshCw, Globe,
} from "lucide-react";

interface WaitlistSupplier {
  id: string;
  name: string;
  contactName: string;
  email: string | null;
  phone: string;
  category: string;
  city: string | null;
  website: string | null;
  description: string | null;
  createdAt: string;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
}

const ALL_WAITLIST_FILTER = "ALL";

export default function SuppliersWaitlistPage() {
  const [suppliers, setSuppliers] = useState<WaitlistSupplier[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("PENDING");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("status", filter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/suppliers-waitlist?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setSuppliers(data.suppliers || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה בטעינת נתונים");
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const pendingCount = suppliers.filter((s) => s.approvalStatus === "PENDING").length;

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setActionLoading(id);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/admin/suppliers-waitlist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId: id, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setSuccessMsg(data.message);
      // Update local state immediately
      setSuppliers((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, approvalStatus: action === "approve" ? "APPROVED" : "REJECTED" }
            : s
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

  // Client-side filter for display
  const filtered = suppliers.filter((s) => {
    if (filter !== ALL_WAITLIST_FILTER && s.approvalStatus !== filter) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading text-text-primary flex items-center gap-2">
            <UserPlus className="w-7 h-7" />
            רשימת המתנה - ספקים
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {filter === "PENDING" && !loading ? (
              filtered.length > 0 ? (
                <span className="text-yellow-500">
                  {filtered.length} ספקים ממתינים לאישור
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
          onClick={loadSuppliers}
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
              placeholder="חיפוש שם עסק / איש קשר / מייל / עיר..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-dark pr-10"
            />
          </div>
          <div className="flex gap-2">
            {(
              [
                { value: "PENDING", label: "ממתין" },
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
          {filtered.map((s) => (
            <div
              key={s.id}
              className={`card-static ${
                s.approvalStatus === "APPROVED"
                  ? "border-emerald-500/30"
                  : s.approvalStatus === "REJECTED"
                  ? "border-red-500/30"
                  : "border-gold/30"
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-heading text-text-primary text-lg font-bold">
                    {s.name}
                  </h3>
                  <p className="text-text-muted text-sm">{s.contactName}</p>
                  <div className="flex items-center gap-1 text-text-muted text-xs mt-1">
                    <Clock className="w-3 h-3" />
                    הגיש ב-{formatDate(s.createdAt)}
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    s.approvalStatus === "PENDING"
                      ? "bg-yellow-50 text-yellow-600"
                      : s.approvalStatus === "APPROVED"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  {s.approvalStatus === "PENDING"
                    ? "ממתין"
                    : s.approvalStatus === "APPROVED"
                    ? "אושר"
                    : "נדחה"}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-text-muted" />
                  <span className="text-text-primary" dir="ltr">
                    {s.phone}
                  </span>
                </div>
                {s.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-text-muted" />
                    <span className="text-text-primary" dir="ltr">
                      {s.email}
                    </span>
                  </div>
                )}
                {s.city && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-text-muted" />
                    <span className="text-text-primary">{s.city}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-text-muted" />
                  <span className="text-text-primary">{s.category}</span>
                </div>
                {s.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-text-muted" />
                    <span className="text-text-primary" dir="ltr">
                      {s.website}
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              {s.description && (
                <div className="mb-4 text-xs text-text-muted bg-bg-surface rounded px-3 py-2">
                  {s.description}
                </div>
              )}

              {/* Actions */}
              {s.approvalStatus === "PENDING" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(s.id, "approve")}
                    disabled={actionLoading === s.id}
                    className="btn-gold flex-1 flex items-center justify-center gap-2 text-sm py-2 disabled:opacity-50"
                  >
                    {actionLoading === s.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    אשר הצטרפות
                  </button>
                  <button
                    onClick={() => handleAction(s.id, "reject")}
                    disabled={actionLoading === s.id}
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
