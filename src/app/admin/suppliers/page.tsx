"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Users, Plus, Search, Filter, Download, AlertTriangle, Phone, Mail,
  MapPin, Calendar, X, Edit3, Eye, MessageCircle, CheckCircle, Clock,
  Shield, ShieldCheck, ShieldAlert, ChevronDown, ChevronUp, Trash2,
  Bell, Pause, Play, FileText, BarChart3, TrendingUp, XCircle, Loader2,
  UserCheck,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import StarRating from "@/components/ui/StarRating";
import { formatDateShort, formatCurrency, SUPPLIER_CATEGORIES, AREAS } from "@/lib/utils";
import { buildCsv, downloadCsv, openWhatsApp } from "@/lib/export-csv";
import { useRouter } from "next/navigation";

// ==========================================
// Types
// ==========================================

type VerificationStatus = "unverified" | "pending" | "verified";

interface PendingRecommender {
  id: string;
  name: string;
  phone: string;
  trustVerified: boolean;
  serviceVerified: boolean;
  professionalismVerified: boolean;
  responsibilityVerified: boolean;
}

interface PendingSupplier {
  id: string;
  name: string;
  contactName: string;
  email: string | null;
  phone: string;
  category: string;
  city: string | null;
  recommenders: PendingRecommender[];
}

const RECOMMENDER_CRITERIA: { key: keyof Pick<PendingRecommender, "trustVerified" | "serviceVerified" | "professionalismVerified" | "responsibilityVerified">; label: string }[] = [
  { key: "trustVerified", label: "אמינות" },
  { key: "serviceVerified", label: "שירות" },
  { key: "professionalismVerified", label: "מקצועיות" },
  { key: "responsibilityVerified", label: "לקיחת אחריות" },
];

function isRecommenderFullyVerified(r: PendingRecommender): boolean {
  return r.trustVerified && r.serviceVerified && r.professionalismVerified && r.responsibilityVerified;
}

function countVerifiedRecommenders(s: PendingSupplier): number {
  return s.recommenders.filter(isRecommenderFullyVerified).length;
}

interface VerificationChecklist {
  license: boolean;
  insurance: boolean;
  portfolio: boolean;
  references: boolean;
}

interface Supplier {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  category: string;
  city: string;
  area: string;
  website: string;
  description: string;
  paymentStatus: string;
  monthlyFee: number;
  subscriptionStart: string;
  subscriptionEnd: string;
  totalPosts: number;
  postsThisMonth: number;
  totalDeals: number;
  totalDealAmount: number;
  averageRating: number;
  ratingCount: number;
  isActive: boolean;
  isSuspended: boolean;
  notes: string;
  verificationStatus: VerificationStatus;
  verificationChecklist: VerificationChecklist;
  lastActivityDate: string;
  monthlyDeals: number[];
}

// ==========================================
// Demo Data
// ==========================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSupplierFromApi(s: any): Supplier {
  const hasGallery = (s.gallery?.length || 0) > 0;
  const hasRecs = (s.ratingCount || 0) > 0;
  const hasWebsite = !!s.website;
  const now = new Date();
  const subEnd = s.subscriptionEnd ? new Date(s.subscriptionEnd) : null;
  const isSuspended = !s.isActive || s.isHidden || false;
  const verifiedCount = [hasWebsite, hasGallery, hasRecs].filter(Boolean).length;
  const verificationStatus: VerificationStatus =
    verifiedCount >= 3 ? "verified" : verifiedCount >= 1 ? "pending" : "unverified";
  return {
    id: s.id,
    name: s.name || "",
    contactName: s.contactName || "",
    phone: s.phone || "",
    email: s.email || "",
    category: s.category || "",
    city: s.city || "",
    area: s.area || "",
    website: s.website || "",
    description: s.description || "",
    paymentStatus: s.paymentStatus || "PENDING",
    monthlyFee: s.monthlyFee || 0,
    subscriptionStart: s.subscriptionStart ? new Date(s.subscriptionStart).toISOString().slice(0, 10) : "",
    subscriptionEnd: subEnd ? subEnd.toISOString().slice(0, 10) : "",
    totalPosts: s.totalPosts || 0,
    postsThisMonth: s.postsThisMonth || 0,
    totalDeals: s.totalDeals || 0,
    totalDealAmount: s.totalDealAmount || 0,
    averageRating: s.averageRating || 0,
    ratingCount: s.ratingCount || 0,
    isActive: s.isActive ?? true,
    isSuspended,
    notes: s.notes || "",
    verificationStatus,
    verificationChecklist: {
      license: hasWebsite,
      insurance: subEnd ? subEnd > now : false,
      portfolio: hasGallery,
      references: hasRecs,
    },
    lastActivityDate: s.updatedAt ? new Date(s.updatedAt).toISOString().slice(0, 10) : "",
    monthlyDeals: [],
  };
}

// ==========================================
// Mini Sparkline SVG
// ==========================================

function MiniSparkline({ data, color = "#C9A84C" }: { data: number[]; color?: string }) {
  const w = 80, h = 24;
  if (!data || data.length < 2) {
    return <svg width={w} height={h} className="inline-block" aria-hidden />;
  }
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="inline-block">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ==========================================
// Verification helpers
// ==========================================

const verificationLabels: Record<keyof VerificationChecklist, string> = {
  license: "רישיון עסק",
  insurance: "ביטוח",
  portfolio: "תיק עבודות",
  references: "המלצות",
};

function getVerificationProgress(checklist: VerificationChecklist): number {
  const items = Object.values(checklist);
  return items.filter(Boolean).length / items.length;
}

const verificationStatusConfig: Record<VerificationStatus, { label: string; icon: typeof Shield; color: string; bg: string }> = {
  unverified: { label: "לא מאומת", icon: ShieldAlert, color: "text-red-400", bg: "bg-red-400/10" },
  pending: { label: "בבדיקה", icon: Clock, color: "text-yellow-400", bg: "bg-yellow-400/10" },
  verified: { label: "מאומת ✅", icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-400/10" },
};

// ==========================================
// Form
// ==========================================

interface SupplierFormData {
  name: string; contactName: string; phone: string; email: string;
  category: string; city: string; area: string; website: string;
  description: string; monthlyFee: string; notes: string;
}

const emptyForm: SupplierFormData = {
  name: "", contactName: "", phone: "", email: "",
  category: "", city: "", area: "", website: "",
  description: "", monthlyFee: "", notes: "",
};

const ALL = "__ALL__";

// ==========================================
// Component
// ==========================================

const SUPPLIER_CSV_COLUMNS = [
  { key: "name", label: "שם העסק" },
  { key: "contactName", label: "איש קשר" },
  { key: "phone", label: "טלפון" },
  { key: "email", label: "מייל" },
  { key: "category", label: "קטגוריה" },
  { key: "city", label: "עיר" },
  { key: "area", label: "אזור" },
  { key: "paymentStatus", label: "סטטוס תשלום" },
  { key: "monthlyFee", label: "תשלום חודשי ₪" },
  { key: "totalDeals", label: "סה״כ עסקאות" },
  { key: "totalDealAmount", label: "סה״כ סכום עסקאות" },
  { key: "averageRating", label: "דירוג ממוצע" },
  { key: "ratingCount", label: "כמות דירוגים" },
  { key: "postsThisMonth", label: "פרסומים החודש" },
  { key: "isActive", label: "פעיל", format: (r: Supplier) => (r.isActive ? "כן" : "לא") },
  { key: "subscriptionEnd", label: "חוזה עד" },
];

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);

  useEffect(() => {
    setLoading(true);
    fetch("/api/suppliers")
      .then((res) => { if (!res.ok) throw new Error("fetch failed"); return res.json(); })
      .then((data) => {
        if (Array.isArray(data)) {
          setSuppliers(data.map(mapSupplierFromApi));
        }
      })
      .catch(() => setError("שגיאה בטעינת ספקים. נסו לרענן את הדף."))
      .finally(() => setLoading(false));
  }, []);

  const [verificationFilter, setVerificationFilter] = useState(ALL);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<string | null>(null);
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);
  const [formData, setFormData] = useState<SupplierFormData>(emptyForm);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"all" | "queue">("all");
  const [confirmSuspend, setConfirmSuspend] = useState<string | null>(null);

  // Filters
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const matchSearch = !search || s.name.includes(search) || s.contactName.includes(search) || s.city.includes(search);
      const matchCategory = categoryFilter === ALL || s.category === categoryFilter;
      const matchStatus = statusFilter === ALL || s.paymentStatus === statusFilter;
      const matchVerification = verificationFilter === ALL || s.verificationStatus === verificationFilter;
      return matchSearch && matchCategory && matchStatus && matchVerification;
    });
  }, [suppliers, search, categoryFilter, statusFilter, verificationFilter]);

  // ===== New verification queue (pending suppliers + recommenders) =====
  const [pendingSuppliers, setPendingSuppliers] = useState<PendingSupplier[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const res = await fetch("/api/admin/suppliers/queue");
      if (!res.ok) throw new Error("queue fetch failed");
      const data = await res.json();
      if (Array.isArray(data)) setPendingSuppliers(data as PendingSupplier[]);
    } catch (err) {
      console.error("Queue load error:", err);
    } finally {
      setQueueLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const toggleRecommenderFlag = useCallback(async (
    supplierId: string,
    recommenderId: string,
    field: keyof Pick<PendingRecommender, "trustVerified" | "serviceVerified" | "professionalismVerified" | "responsibilityVerified">,
  ) => {
    const supplier = pendingSuppliers.find(s => s.id === supplierId);
    const rec = supplier?.recommenders.find(r => r.id === recommenderId);
    if (!supplier || !rec) return;
    const next = !rec[field];
    setPendingSuppliers(prev => prev.map(s => s.id !== supplierId ? s : {
      ...s,
      recommenders: s.recommenders.map(r => r.id !== recommenderId ? r : { ...r, [field]: next }),
    }));
    try {
      await fetch(`/api/admin/suppliers/recommenders/${recommenderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: next }),
      });
    } catch (err) {
      console.error("Toggle recommender flag error:", err);
      setPendingSuppliers(prev => prev.map(s => s.id !== supplierId ? s : {
        ...s,
        recommenders: s.recommenders.map(r => r.id !== recommenderId ? r : { ...r, [field]: !next }),
      }));
    }
  }, [pendingSuppliers]);

  const approveSupplier = useCallback(async (supplierId: string) => {
    setApprovingId(supplierId);
    try {
      const res = await fetch("/api/admin/suppliers-waitlist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, action: "approve" }),
      });
      if (!res.ok) throw new Error("approve failed");
      setPendingSuppliers(prev => prev.filter(s => s.id !== supplierId));
      const fresh = await fetch("/api/suppliers").then(r => r.json()).catch(() => []);
      if (Array.isArray(fresh)) setSuppliers(fresh.map(mapSupplierFromApi));
    } catch (err) {
      console.error("Approve supplier error:", err);
    } finally {
      setApprovingId(null);
    }
  }, []);

  // Legacy: kept only so old fetch hooks still compile. The actual queue tab
  // now uses pendingSuppliers instead.
  const verificationQueue = pendingSuppliers;

  // Selection
  const selectedCount = Object.values(selectedIds).filter(Boolean).length;
  const allSelected = filteredSuppliers.length > 0 && filteredSuppliers.every(s => selectedIds[s.id]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds({});
    } else {
      const next: Record<string, boolean> = {};
      filteredSuppliers.forEach(s => { next[s.id] = true; });
      setSelectedIds(next);
    }
  }, [allSelected, filteredSuppliers]);

  const clearSelection = useCallback(() => setSelectedIds({}), []);

  // Suspend/Activate
  const toggleSuspend = useCallback(async (id: string) => {
    const current = suppliers.find((s) => s.id === id);
    if (!current) return;
    const nextActive = current.isSuspended; // if suspended → activate; if active → suspend
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, isSuspended: !s.isSuspended, isActive: nextActive } : s));
    setConfirmSuspend(null);
    try {
      await fetch(`/api/admin/suppliers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
    } catch (err) {
      console.error("Toggle suspend error:", err);
    }
  }, [suppliers]);

  // Verification
  const toggleVerificationItem = useCallback((id: string, key: keyof VerificationChecklist) => {
    setSuppliers(prev => prev.map(s => {
      if (s.id !== id) return s;
      const updated = { ...s.verificationChecklist, [key]: !s.verificationChecklist[key] };
      const allDone = Object.values(updated).every(Boolean);
      return { ...s, verificationChecklist: updated, verificationStatus: allDone ? "verified" as VerificationStatus : "pending" as VerificationStatus };
    }));
  }, []);

  // Form handlers
  const handleOpenAdd = useCallback(() => { setFormData(emptyForm); setEditingSupplier(null); setShowAddForm(true); }, []);
  const handleOpenEdit = useCallback((supplier: Supplier) => {
    setFormData({
      name: supplier.name, contactName: supplier.contactName, phone: supplier.phone,
      email: supplier.email || "", category: supplier.category, city: supplier.city || "",
      area: supplier.area || "", website: supplier.website || "", description: supplier.description || "",
      monthlyFee: supplier.monthlyFee?.toString() || "", notes: supplier.notes || "",
    });
    setEditingSupplier(supplier.id);
    setShowAddForm(true);
  }, []);
  const handleSubmitForm = useCallback(async () => {
    try {
      const payload = {
        name: formData.name.trim(),
        contactName: formData.contactName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        category: formData.category,
        city: formData.city.trim() || undefined,
        area: formData.area || undefined,
        website: formData.website.trim() || undefined,
        description: formData.description.trim() || undefined,
        monthlyFee: formData.monthlyFee ? Number(formData.monthlyFee) : undefined,
        notes: formData.notes.trim() || undefined,
      };
      if (editingSupplier) {
        await fetch(`/api/admin/suppliers/${editingSupplier}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      const fresh = await fetch("/api/suppliers").then((r) => r.json()).catch(() => []);
      if (Array.isArray(fresh)) setSuppliers(fresh.map(mapSupplierFromApi));
    } catch (err) {
      console.error("Supplier save error:", err);
    } finally {
      setShowAddForm(false); setFormData(emptyForm); setEditingSupplier(null);
    }
  }, [formData, editingSupplier]);

  // Export suppliers to Excel (CSV with BOM)
  const exportAll = useCallback(() => {
    const csv = buildCsv(filteredSuppliers, SUPPLIER_CSV_COLUMNS);
    downloadCsv(`ziratadrichalut-suppliers-${new Date().toISOString().slice(0, 10)}`, csv);
  }, [filteredSuppliers]);

  const exportSelected = useCallback(() => {
    const rows = suppliers.filter((s) => selectedIds[s.id]);
    if (rows.length === 0) return;
    const csv = buildCsv(rows, SUPPLIER_CSV_COLUMNS);
    downloadCsv(`ziratadrichalut-suppliers-selected-${new Date().toISOString().slice(0, 10)}`, csv);
  }, [suppliers, selectedIds]);

  // Bulk suspend selected
  const bulkSuspend = useCallback(async () => {
    const ids = Object.keys(selectedIds).filter((id) => selectedIds[id]);
    if (ids.length === 0) return;
    if (!confirm(`להשעות ${ids.length} ספקים? ניתן להפעיל מחדש.`)) return;
    setBulkBusy(true);
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/admin/suppliers/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: false }),
          }).catch(() => null),
        ),
      );
      const fresh = await fetch("/api/suppliers").then((r) => r.json()).catch(() => []);
      if (Array.isArray(fresh)) setSuppliers(fresh.map(mapSupplierFromApi));
      setSelectedIds({});
    } finally {
      setBulkBusy(false);
    }
  }, [selectedIds]);

  // Bulk send reminder via WhatsApp (opens first selected; for multiple show sequential)
  const bulkReminder = useCallback(() => {
    const ids = Object.keys(selectedIds).filter((id) => selectedIds[id]);
    if (ids.length === 0) return;
    const chosen = suppliers.filter((s) => ids.includes(s.id));
    const msg = "שלום, רק מזכירים שטרם הגיע התשלום החודשי במערכת זירת האדריכלות. נודה להסדרה. תודה 🌟";
    chosen.forEach((s, idx) => {
      if (s.phone) {
        setTimeout(() => openWhatsApp(s.phone, `${s.contactName ? s.contactName + "," : ""} ${msg}`), idx * 250);
      }
    });
  }, [selectedIds, suppliers]);

  const viewProfile = useCallback((id: string) => {
    router.push(`/supplier/${id}`);
  }, [router]);

  const sendWhatsApp = useCallback((supplier: Supplier) => {
    const msg = `שלום ${supplier.contactName || ""} 👋`;
    openWhatsApp(supplier.phone, msg);
  }, []);

  // Stats
  const totalRevenue = suppliers.filter(s => s.isActive && s.paymentStatus === "PAID").reduce((sum, s) => sum + (s.monthlyFee || 0), 0);
  const verifiedCount = suppliers.filter(s => s.verificationStatus === "verified").length;
  const suspendedCount = suppliers.filter(s => s.isSuspended).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted gap-2">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>טוען ספקים...</span>
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
            <Users className="w-7 h-7" />ניהול ספקים
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {suppliers.length} ספקים רשומים — {suppliers.filter(s => s.isActive).length} פעילים
            {" | "}
            <span className="text-emerald-600">הכנסה חודשית: {formatCurrency(totalRevenue)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportAll} className="btn-outline flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" />ייצוא Excel
          </button>
          <button onClick={handleOpenAdd} className="btn-gold flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />הוסף ספק חדש
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="card-static text-center py-3">
          <p className="text-gold font-mono text-xl font-bold">{suppliers.filter(s => s.paymentStatus === "PAID").length}</p>
          <p className="text-text-muted text-xs">שילמו</p>
        </div>
        <div className="card-static text-center py-3">
          <p className="text-red-500 font-mono text-xl font-bold">{suppliers.filter(s => s.paymentStatus === "OVERDUE").length}</p>
          <p className="text-text-muted text-xs">באיחור</p>
        </div>
        <div className="card-static text-center py-3">
          <p className="text-yellow-400 font-mono text-xl font-bold">{suppliers.filter(s => s.postsThisMonth === 0 && s.isActive).length}</p>
          <p className="text-text-muted text-xs">לא פרסמו החודש</p>
        </div>
        <div className="card-static text-center py-3">
          <p className="text-emerald-400 font-mono text-xl font-bold">{verifiedCount}</p>
          <p className="text-text-muted text-xs flex items-center justify-center gap-1"><ShieldCheck className="w-3 h-3" /> מאומתים</p>
        </div>
        <div className="card-static text-center py-3">
          <p className="text-red-400 font-mono text-xl font-bold">{suspendedCount}</p>
          <p className="text-text-muted text-xs">מושעים</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border-subtle pb-1">
        <button onClick={() => setActiveTab("all")}
          className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${activeTab === "all" ? "bg-gold/10 text-gold font-semibold border-b-2 border-gold" : "text-text-muted hover:text-text-primary"}`}>
          כל הספקים ({suppliers.length})
        </button>
        <button onClick={() => setActiveTab("queue")}
          className={`px-4 py-2 text-sm rounded-t-lg transition-colors flex items-center gap-2 ${activeTab === "queue" ? "bg-gold/10 text-gold font-semibold border-b-2 border-gold" : "text-text-muted hover:text-text-primary"}`}>
          <Shield className="w-4 h-4" /> תור אימות ({verificationQueue.length})
        </button>
      </div>

      {/* ============ VERIFICATION QUEUE TAB ============ */}
      {activeTab === "queue" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-text-muted text-sm">
              ספקים בהמתנה לאישור — סמני 4 קריטריונים לכל מעצבת ממליצה ולחצי "הוסף ספק לקהילה":
            </p>
            <button
              onClick={loadQueue}
              disabled={queueLoading}
              className="btn-outline text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {queueLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              רענן
            </button>
          </div>

          {queueLoading && pendingSuppliers.length === 0 ? (
            <div className="card-static text-center py-12 text-text-muted">
              <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" />
              <p>טוען ספקים בהמתנה…</p>
            </div>
          ) : pendingSuppliers.length === 0 ? (
            <div className="card-static text-center py-12 text-text-muted">
              <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
              <p className="font-heading text-lg">אין ספקים בהמתנה 🎉</p>
              <p className="text-xs mt-1">ספקים חדשים יופיעו כאן אחרי הרשמה.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingSuppliers.map(supplier => {
                const verifiedCount = countVerifiedRecommenders(supplier);
                const allDone = supplier.recommenders.length === 3 && verifiedCount === 3;
                const isApproving = approvingId === supplier.id;
                return (
                  <div key={supplier.id} className="card-static">
                    {/* Header */}
                    <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                      <div>
                        <h3 className="font-heading text-text-primary font-bold text-lg flex items-center gap-2">
                          {supplier.name}
                          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-500">
                            <Clock className="w-3 h-3 inline ml-1" />ממתין לאישור
                          </span>
                        </h3>
                        <p className="text-text-muted text-sm">
                          {supplier.contactName} · {supplier.category}
                          {supplier.city ? ` · ${supplier.city}` : ""}
                        </p>
                        <div className="text-xs text-text-muted mt-1 flex items-center gap-3" dir="ltr">
                          <a href={`tel:${supplier.phone}`} className="hover:text-gold flex items-center gap-1">
                            <Phone className="w-3 h-3" />{supplier.phone}
                          </a>
                          {supplier.email && (
                            <a href={`mailto:${supplier.email}`} className="hover:text-gold flex items-center gap-1">
                              <Mail className="w-3 h-3" />{supplier.email}
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-text-muted">
                        מעצבות מאומתות:{" "}
                        <span className={`font-mono font-bold ${allDone ? "text-emerald-400" : "text-gold"}`}>
                          {verifiedCount} / {supplier.recommenders.length || 3}
                        </span>
                      </div>
                    </div>

                    {/* Recommenders table */}
                    {supplier.recommenders.length === 0 ? (
                      <div className="text-sm text-red-400 bg-red-400/5 rounded p-3">
                        לא נשלחו המלצות עם הרשמה זו. (ספק ישן לפני עדכון הקריטריונים)
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-text-muted text-xs">
                              <th className="text-right pb-2 pl-3 font-normal">מעצבת ממליצה</th>
                              {RECOMMENDER_CRITERIA.map(c => (
                                <th key={c.key} className="text-center pb-2 px-2 font-normal whitespace-nowrap">
                                  {c.label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {supplier.recommenders.map(rec => (
                              <tr key={rec.id} className="border-t border-border-subtle">
                                <td className="py-2 pl-3">
                                  <div className="text-text-primary font-medium">{rec.name}</div>
                                  <a
                                    href={`tel:${rec.phone}`}
                                    className="text-text-muted text-xs hover:text-gold"
                                    dir="ltr"
                                  >
                                    {rec.phone}
                                  </a>
                                </td>
                                {RECOMMENDER_CRITERIA.map(c => {
                                  const checked = rec[c.key];
                                  return (
                                    <td key={c.key} className="py-2 px-2 text-center">
                                      <button
                                        type="button"
                                        onClick={() => toggleRecommenderFlag(supplier.id, rec.id, c.key)}
                                        aria-label={`${c.label} — ${rec.name}`}
                                        className={`w-7 h-7 rounded-md border-2 flex items-center justify-center mx-auto transition-colors ${
                                          checked
                                            ? "bg-emerald-400 border-emerald-400 text-white"
                                            : "bg-transparent border-border-subtle hover:border-gold"
                                        }`}
                                      >
                                        {checked && <CheckCircle className="w-4 h-4" />}
                                      </button>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Approve button */}
                    <div className="mt-4 flex items-center justify-end gap-2">
                      <span className="text-xs text-text-muted">
                        {allDone
                          ? "כל הקריטריונים סומנו ✓"
                          : `נדרשים כל 12 הסימונים (${verifiedCount * 4 + supplier.recommenders.reduce((acc, r) => acc + (isRecommenderFullyVerified(r) ? 0 : [r.trustVerified, r.serviceVerified, r.professionalismVerified, r.responsibilityVerified].filter(Boolean).length), 0)} / 12)`}
                      </span>
                      <button
                        type="button"
                        disabled={!allDone || isApproving}
                        onClick={() => approveSupplier(supplier.id)}
                        className="px-4 py-2 rounded-lg font-semibold inline-flex items-center gap-2 bg-emerald-500 text-white hover:bg-emerald-600 disabled:bg-bg-surface disabled:text-text-muted disabled:cursor-not-allowed disabled:hover:bg-bg-surface"
                      >
                        {isApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                        הוסף ספק לקהילה
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============ ALL SUPPLIERS TAB ============ */}
      {activeTab === "all" && (
        <>
          {/* Bulk Actions Toolbar */}
          {selectedCount > 0 && (
            <div className="card-static bg-gold/5 border-gold/20 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="text-gold font-semibold text-sm">{selectedCount} נבחרו</span>
                <button onClick={clearSelection} className="text-text-muted text-xs hover:text-red-400 transition-colors">
                  <X className="w-3 h-3 inline ml-1" />בטל בחירה
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={bulkReminder} className="btn-outline text-xs flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5" />שלח תזכורת
                </button>
                <button onClick={bulkSuspend} disabled={bulkBusy} className="btn-outline text-xs flex items-center gap-1.5 text-red-400 border-red-400/30 hover:bg-red-400/10 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Pause className="w-3.5 h-3.5" />השעה נבחרים
                </button>
                <button onClick={exportSelected} className="btn-outline text-xs flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" />ייצוא נבחרים
                </button>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="card-static">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="relative md:col-span-2">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input type="text" placeholder="חיפוש ספק..." value={search}
                  onChange={(e) => setSearch(e.target.value)} className="input-dark pr-10" />
              </div>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="select-dark">
                <option value={ALL}>כל הקטגוריות</option>
                {SUPPLIER_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select-dark">
                <option value={ALL}>כל הסטטוסים</option>
                <option value="PAID">שולם</option>
                <option value="PENDING">ממתין</option>
                <option value="OVERDUE">באיחור</option>
                <option value="CANCELLED">מבוטל</option>
              </select>
              <select value={verificationFilter} onChange={(e) => setVerificationFilter(e.target.value)} className="select-dark">
                <option value={ALL}>כל האימותים</option>
                <option value="verified">מאומת ✅</option>
                <option value="pending">בבדיקה ⏳</option>
                <option value="unverified">לא מאומת ❌</option>
              </select>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-text-muted text-sm">
                  <Filter className="w-4 h-4 ml-1" />
                  {filteredSuppliers.length} תוצאות
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setViewMode("grid")}
                    className={`p-2 rounded ${viewMode === "grid" ? "bg-gold/20 text-gold" : "text-text-muted"}`}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                      <rect width="6" height="6" /><rect x="8" width="6" height="6" /><rect y="8" width="6" height="6" /><rect x="8" y="8" width="6" height="6" />
                    </svg>
                  </button>
                  <button onClick={() => setViewMode("table")}
                    className={`p-2 rounded ${viewMode === "table" ? "bg-gold/20 text-gold" : "text-text-muted"}`}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                      <rect width="14" height="3" /><rect y="5.5" width="14" height="3" /><rect y="11" width="14" height="3" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ========== GRID VIEW ========== */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSuppliers.map(supplier => {
                const vConfig = verificationStatusConfig[supplier.verificationStatus];
                const VIcon = vConfig.icon;
                return (
                  <div key={supplier.id}
                    className={`card group cursor-pointer relative ${supplier.isSuspended ? "opacity-60" : ""} ${selectedIds[supplier.id] ? "ring-2 ring-gold" : ""}`}>
                    {/* Select checkbox */}
                    <div className="absolute top-3 left-3">
                      <button onClick={(e) => { e.stopPropagation(); toggleSelect(supplier.id); }}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedIds[supplier.id] ? "bg-gold border-gold text-white" : "border-border-subtle hover:border-gold"}`}>
                        {selectedIds[supplier.id] && <CheckCircle className="w-3 h-3" />}
                      </button>
                    </div>

                    <div onClick={() => setExpandedSupplier(expandedSupplier === supplier.id ? null : supplier.id)}>
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3 pr-0 pl-6">
                        <div>
                          <h3 className="font-heading text-text-primary text-lg font-bold flex items-center gap-2">
                            {supplier.name}
                            {supplier.verificationStatus === "verified" && (
                              <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            )}
                            {supplier.isSuspended && (
                              <span className="text-xs bg-red-400/10 text-red-400 px-2 py-0.5 rounded-full">מושעה</span>
                            )}
                          </h3>
                          <p className="text-text-muted text-sm">{supplier.contactName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={supplier.paymentStatus} />
                          <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(supplier); }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-gold">
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Category & Location + Verification */}
                      <div className="flex items-center gap-3 mb-3 text-sm flex-wrap">
                        <span className="badge-gold">{supplier.category}</span>
                        <span className="text-text-muted flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{supplier.city}
                        </span>
                        <span className={`flex items-center gap-1 text-xs ${vConfig.color}`}>
                          <VIcon className="w-3 h-3" />{vConfig.label}
                        </span>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                        <div className="bg-bg-surface rounded p-2">
                          <p className="text-gold font-mono font-bold">{supplier.postsThisMonth}</p>
                          <p className="text-text-muted text-[10px]">פרסומים החודש</p>
                        </div>
                        <div className="bg-bg-surface rounded p-2">
                          <p className="text-gold font-mono font-bold">{supplier.totalDeals}</p>
                          <p className="text-text-muted text-[10px]">עסקאות</p>
                        </div>
                        <div className="bg-bg-surface rounded p-2">
                          <div className="flex items-center justify-center gap-1">
                            <StarRating rating={supplier.averageRating} size={12} />
                          </div>
                          <p className="text-text-muted text-[10px]">{supplier.ratingCount} דירוגים</p>
                        </div>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {expandedSupplier === supplier.id && (
                      <div className="animate-in space-y-3 mb-3">
                        <div className="gold-separator" />
                        <p className="text-text-primary text-sm">{supplier.description}</p>

                        {/* Monthly deals sparkline */}
                        <div className="bg-bg-surface rounded-lg p-3">
                          <p className="text-text-muted text-xs mb-2 flex items-center gap-1">
                            <BarChart3 className="w-3 h-3" /> מגמת עסקאות (6 חודשים)
                          </p>
                          <MiniSparkline data={supplier.monthlyDeals} />
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-text-muted">סה״כ עסקאות: </span>
                            <span className="text-gold font-mono">{formatCurrency(supplier.totalDealAmount)}</span>
                          </div>
                          <div>
                            <span className="text-text-muted">תשלום חודשי: </span>
                            <span className="text-gold font-mono">{formatCurrency(supplier.monthlyFee)}</span>
                          </div>
                          <div>
                            <span className="text-text-muted">פעילות אחרונה: </span>
                            <span className="text-text-primary">{supplier.lastActivityDate ? formatDateShort(supplier.lastActivityDate) : "—"}</span>
                          </div>
                          <div>
                            <span className="text-text-muted">אזור: </span>
                            <span className="text-text-primary">{supplier.area}</span>
                          </div>
                        </div>

                        {/* Verification checklist in expanded */}
                        <div className="bg-bg-surface rounded-lg p-3">
                          <p className="text-text-muted text-xs mb-2">אימות ספק:</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {(Object.keys(supplier.verificationChecklist) as Array<keyof VerificationChecklist>).map(key => (
                              <div key={key} className={`flex items-center gap-1.5 text-xs ${supplier.verificationChecklist[key] ? "text-emerald-400" : "text-text-muted"}`}>
                                {supplier.verificationChecklist[key] ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                {verificationLabels[key]}
                              </div>
                            ))}
                          </div>
                        </div>

                        {supplier.notes && (
                          <div className="bg-yellow-400/5 border border-yellow-400/20 rounded p-2 text-xs text-yellow-400">
                            📝 {supplier.notes}
                          </div>
                        )}

                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => viewProfile(supplier.id)} className="btn-outline text-xs flex items-center gap-1">
                            <Eye className="w-3 h-3" />צפה בפרופיל
                          </button>
                          <button onClick={() => sendWhatsApp(supplier)} className="btn-outline text-xs flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />שלח WhatsApp
                          </button>
                          {confirmSuspend === supplier.id ? (
                            <div className="flex gap-1">
                              <button onClick={() => toggleSuspend(supplier.id)}
                                className="text-xs px-3 py-1.5 rounded bg-red-500 text-white hover:bg-red-600 transition-colors">
                                {supplier.isSuspended ? "הפעל" : "השעה"} — אישור
                              </button>
                              <button onClick={() => setConfirmSuspend(null)}
                                className="text-xs px-2 py-1.5 rounded text-text-muted hover:text-text-primary">
                                ביטול
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmSuspend(supplier.id)}
                              className={`text-xs flex items-center gap-1 px-3 py-1.5 rounded border transition-colors ${
                                supplier.isSuspended
                                  ? "border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10"
                                  : "border-red-400/30 text-red-400 hover:bg-red-400/10"
                              }`}>
                              {supplier.isSuspended ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                              {supplier.isSuspended ? "הפעל מחדש" : "השעה ספק"}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Contact */}
                    <div className="space-y-1 mb-3 text-xs">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-text-muted flex-shrink-0" />
                        <a href={`tel:${supplier.phone}`} className="text-text-primary hover:text-gold transition-colors" dir="ltr">
                          {supplier.phone}
                        </a>
                      </div>
                      {supplier.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3 h-3 text-text-muted flex-shrink-0" />
                          <a href={`mailto:${supplier.email}`} className="text-text-primary hover:text-gold transition-colors truncate" dir="ltr">
                            {supplier.email}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
                      <div className="flex gap-2">
                        <a href={`tel:${supplier.phone}`} className="text-text-muted hover:text-gold transition-colors">
                          <Phone className="w-4 h-4" />
                        </a>
                        <a href={`mailto:${supplier.email}`} className="text-text-muted hover:text-gold transition-colors">
                          <Mail className="w-4 h-4" />
                        </a>
                      </div>
                      <div className="flex items-center gap-1 text-text-muted text-xs">
                        <Calendar className="w-3 h-3" />חוזה עד {supplier.subscriptionEnd ? formatDateShort(supplier.subscriptionEnd) : "—"}
                      </div>
                    </div>

                    {/* Warning if no posts */}
                    {supplier.postsThisMonth === 0 && supplier.isActive && (
                      <div className="mt-3 flex items-center gap-2 text-yellow-400 text-xs bg-yellow-400/5 rounded p-2">
                        <AlertTriangle className="w-3 h-3" />לא פרסם החודש
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ========== TABLE VIEW ========== */}
          {viewMode === "table" && (
            <div className="card-static overflow-x-auto">
              <table className="w-full table-luxury">
                <thead>
                  <tr>
                    <th>
                      <button onClick={toggleSelectAll}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          allSelected ? "bg-gold border-gold text-white" : "border-border-subtle hover:border-gold"}`}>
                        {allSelected && <CheckCircle className="w-3 h-3" />}
                      </button>
                    </th>
                    <th>ספק</th>
                    <th>טלפון</th>
                    <th>קטגוריה</th>
                    <th>עיר</th>
                    <th>סטטוס</th>
                    <th>אימות</th>
                    <th>תשלום ₪</th>
                    <th>עסקאות</th>
                    <th>מגמה</th>
                    <th>דירוג</th>
                    <th>פעילות אחרונה</th>
                    <th>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map(s => {
                    const vConfig = verificationStatusConfig[s.verificationStatus];
                    const VIcon = vConfig.icon;
                    return (
                      <tr key={s.id} className={`${s.isSuspended ? "opacity-50" : ""} ${selectedIds[s.id] ? "bg-gold/5" : ""}`}>
                        <td>
                          <button onClick={() => toggleSelect(s.id)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              selectedIds[s.id] ? "bg-gold border-gold text-white" : "border-border-subtle hover:border-gold"}`}>
                            {selectedIds[s.id] && <CheckCircle className="w-3 h-3" />}
                          </button>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="text-text-primary font-medium flex items-center gap-1">
                                {s.name}
                                {s.verificationStatus === "verified" && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
                                {s.isSuspended && <span className="text-[10px] bg-red-400/10 text-red-400 px-1.5 py-0.5 rounded-full">מושעה</span>}
                              </p>
                              <p className="text-text-muted text-xs">{s.contactName}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <a href={`tel:${s.phone}`} className="text-text-primary hover:text-gold text-xs" dir="ltr">{s.phone}</a>
                        </td>
                        <td><span className="badge-gold text-xs">{s.category}</span></td>
                        <td className="text-text-muted">{s.city}</td>
                        <td><StatusBadge status={s.paymentStatus} /></td>
                        <td>
                          <span className={`flex items-center gap-1 text-xs ${vConfig.color}`}>
                            <VIcon className="w-3 h-3" />{vConfig.label}
                          </span>
                        </td>
                        <td className="font-mono">{formatCurrency(s.monthlyFee)}</td>
                        <td className="font-mono">{s.totalDeals}</td>
                        <td><MiniSparkline data={s.monthlyDeals} /></td>
                        <td>
                          <div className="flex items-center gap-1">
                            <StarRating rating={s.averageRating} size={12} />
                            <span className="text-xs font-mono text-gold">{s.averageRating}</span>
                          </div>
                        </td>
                        <td className="text-text-muted text-xs">{s.lastActivityDate ? formatDateShort(s.lastActivityDate) : "—"}</td>
                        <td>
                          <div className="flex gap-1">
                            <button onClick={() => handleOpenEdit(s)} className="text-text-muted hover:text-gold">
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setConfirmSuspend(s.id)} className={`${s.isSuspended ? "text-emerald-400 hover:text-emerald-300" : "text-text-muted hover:text-red-400"}`}>
                              {s.isSuspended ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                            </button>
                            <a href={`tel:${s.phone}`} className="text-text-muted hover:text-gold">
                              <Phone className="w-4 h-4" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Suspend Confirmation Modal */}
      {confirmSuspend && viewMode === "table" && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-bg-surface border border-border-gold rounded-card p-6 max-w-sm w-full text-center">
            {(() => {
              const s = suppliers.find(x => x.id === confirmSuspend);
              if (!s) return null;
              return (
                <>
                  <div className={`w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center ${s.isSuspended ? "bg-emerald-400/10" : "bg-red-400/10"}`}>
                    {s.isSuspended ? <Play className="w-6 h-6 text-emerald-400" /> : <Pause className="w-6 h-6 text-red-400" />}
                  </div>
                  <h3 className="text-text-primary font-heading text-lg mb-2">
                    {s.isSuspended ? "הפעלת ספק" : "השעיית ספק"}
                  </h3>
                  <p className="text-text-muted text-sm mb-4">
                    {s.isSuspended
                      ? `האם להפעיל מחדש את "${s.name}"?`
                      : `האם להשעות את "${s.name}"? הפרופיל לא יופיע למעצבות.`}
                  </p>
                  <div className="flex gap-3">
                    <button onClick={() => toggleSuspend(s.id)}
                      className={`flex-1 py-2 rounded-btn font-medium transition-colors ${s.isSuspended ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-red-500 text-white hover:bg-red-600"}`}>
                      {s.isSuspended ? "הפעל" : "השעה"}
                    </button>
                    <button onClick={() => setConfirmSuspend(null)} className="btn-outline flex-1">ביטול</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Add/Edit Supplier Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-bg-surface border border-border-gold rounded-card p-6 max-w-2xl w-full my-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-heading text-text-primary">
                {editingSupplier ? "עריכת ספק" : "הוספת ספק חדש"}
              </h3>
              <button onClick={() => { setShowAddForm(false); setEditingSupplier(null); }} className="text-text-muted hover:text-gold">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-text-muted text-sm mb-1">שם העסק *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-dark" placeholder="סטון דיזיין" />
              </div>
              <div>
                <label className="block text-text-muted text-sm mb-1">שם איש קשר *</label>
                <input type="text" value={formData.contactName} onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="input-dark" placeholder="יוסי כהן" />
              </div>
              <div>
                <label className="block text-text-muted text-sm mb-1">טלפון (WhatsApp) *</label>
                <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-dark" placeholder="0521234567" dir="ltr" />
              </div>
              <div>
                <label className="block text-text-muted text-sm mb-1">מייל</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-dark" placeholder="info@example.co.il" dir="ltr" />
              </div>
              <div>
                <label className="block text-text-muted text-sm mb-1">קטגוריה *</label>
                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="select-dark">
                  <option value="">בחר קטגוריה</option>
                  {SUPPLIER_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-text-muted text-sm mb-1">עיר</label>
                <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="input-dark" placeholder="תל אביב" />
              </div>
              <div>
                <label className="block text-text-muted text-sm mb-1">אזור שירות</label>
                <select value={formData.area} onChange={(e) => setFormData({ ...formData, area: e.target.value })} className="select-dark">
                  <option value="">בחר אזור</option>
                  {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-text-muted text-sm mb-1">תשלום חודשי ₪</label>
                <input type="number" value={formData.monthlyFee} onChange={(e) => setFormData({ ...formData, monthlyFee: e.target.value })}
                  className="input-dark" placeholder="500" dir="ltr" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-text-muted text-sm mb-1">אתר אינטרנט</label>
                <input type="url" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="input-dark" placeholder="https://example.co.il" dir="ltr" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-text-muted text-sm mb-1">תיאור קצר</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-dark h-20 resize-none" placeholder="תיאור קצר לפרופיל הספק..." />
              </div>
              <div className="md:col-span-2">
                <label className="block text-text-muted text-sm mb-1">הערות פנימיות (רק את רואה)</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-dark h-16 resize-none" placeholder="הערות פנימיות לתמר..." />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleSubmitForm}
                disabled={!formData.name || !formData.contactName || !formData.phone || !formData.category}
                className="btn-gold flex-1 disabled:opacity-50 disabled:cursor-not-allowed">
                {editingSupplier ? "שמור שינויים" : "הוסף ספק"}
              </button>
              <button onClick={() => { setShowAddForm(false); setEditingSupplier(null); }} className="btn-outline flex-1">ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
