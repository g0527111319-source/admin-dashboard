"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, Plus, X, Phone, Mail, MapPin, FolderOpen, Trash2, Edit3,
  ChevronLeft, ChevronRight, User, CheckSquare, FileText, Palette,
  Calendar, Layout, Package, DollarSign, GitBranch, ArrowLeftRight,
  ThumbsUp, Clock, ClipboardCheck, CalendarClock, UserPlus, Sparkles,
  BarChart3, Lightbulb, ScrollText, Ruler
} from "lucide-react";

// ===== Client-specific CRM components (sub-tabs) =====
import CrmProjects from "@/components/crm/CrmProjects";
import CrmTasks from "@/components/crm/CrmTasks";
import CrmQuotes from "@/components/crm/CrmQuotes";
import CrmContracts from "@/components/crm/CrmContracts";
import CrmMoodboards from "@/components/crm/CrmMoodboards";
import CrmCalendar from "@/components/crm/CrmCalendar";
import CrmPlans from "@/components/crm/CrmPlans";
import CrmMaterials from "@/components/crm/CrmMaterials";
import CrmBudgetTracker from "@/components/crm/CrmBudgetTracker";
import CrmTimeline from "@/components/crm/CrmTimeline";
import CrmBeforeAfter from "@/components/crm/CrmBeforeAfter";
import CrmApprovals from "@/components/crm/CrmApprovals";
import CrmTimeTracking from "@/components/crm/CrmTimeTracking";
import CrmHandoffChecklist from "@/components/crm/CrmHandoffChecklist";
import CrmScheduler from "@/components/crm/CrmScheduler";
import CrmOnboarding from "@/components/crm/CrmOnboarding";
import CrmStyleQuiz from "@/components/crm/CrmStyleQuiz";
import CrmSurveys from "@/components/crm/CrmSurveys";
import CrmInspirationLibrary from "@/components/crm/CrmInspirationLibrary";

type CrmClient = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  projects: { id: string; name: string; status: string }[];
  _count: { projects: number };
};

type ClientSubTab =
  | "details" | "projects" | "tasks" | "quotes" | "contracts"
  | "moodboards" | "calendar" | "plans" | "materials" | "budget"
  | "timeline" | "before-after" | "approvals" | "time-tracking"
  | "handoff" | "scheduler" | "onboarding" | "style-quiz"
  | "surveys" | "inspiration";

const SUB_TABS: { key: ClientSubTab; label: string; icon: typeof User }[] = [
  { key: "details", label: "פרטים", icon: User },
  { key: "projects", label: "פרויקטים", icon: FolderOpen },
  { key: "tasks", label: "משימות", icon: CheckSquare },
  { key: "quotes", label: "הצעות מחיר", icon: FileText },
  { key: "contracts", label: "חוזים", icon: ScrollText },
  { key: "moodboards", label: "מודבורד", icon: Palette },
  { key: "calendar", label: "יומן", icon: Calendar },
  { key: "plans", label: "תכניות", icon: Layout },
  { key: "materials", label: "חומרים", icon: Package },
  { key: "budget", label: "תקציב", icon: DollarSign },
  { key: "timeline", label: "ציר זמן", icon: GitBranch },
  { key: "before-after", label: "לפני/אחרי", icon: ArrowLeftRight },
  { key: "approvals", label: "אישורים", icon: ThumbsUp },
  { key: "time-tracking", label: "מעקב שעות", icon: Clock },
  { key: "handoff", label: "מסירה", icon: ClipboardCheck },
  { key: "scheduler", label: "תזמון", icon: CalendarClock },
  { key: "onboarding", label: "אונבורדינג", icon: UserPlus },
  { key: "style-quiz", label: "שאלון סגנון", icon: Sparkles },
  { key: "surveys", label: "סקרים", icon: BarChart3 },
  { key: "inspiration", label: "השראה", icon: Lightbulb },
];

// ===== DEMO DATA — always available even without DB =====
const DEMO_CLIENTS: CrmClient[] = [
  {
    id: "demo-client-1",
    name: "רונית ואבי כהן",
    phone: "054-1234567",
    email: "ronit.cohen@example.com",
    address: "רחוב הרצל 42, תל אביב",
    notes: "לקוחה קבועה, מעדיפה סגנון מודרני מינימליסטי. תקציב גמיש. בעל מעורב בהחלטות.",
    createdAt: "2025-12-15T10:00:00.000Z",
    projects: [
      { id: "demo-proj-1", name: "שיפוץ דירת 4 חדרים — הרצל 42", status: "ACTIVE" },
    ],
    _count: { projects: 1 },
  },
  {
    id: "demo-client-2",
    name: "יוסי ומיכל לוי",
    phone: "052-9876543",
    email: "levi.family@example.com",
    address: "שדרות רוטשילד 15, רמת גן",
    notes: "זוג צעיר, דירה חדשה מקבלן. מעוניינים בעיצוב סקנדינבי. תקציב מוגבל.",
    createdAt: "2026-01-20T14:30:00.000Z",
    projects: [
      { id: "demo-proj-2", name: "עיצוב דירה חדשה — רוטשילד 15", status: "ACTIVE" },
    ],
    _count: { projects: 1 },
  },
  {
    id: "demo-client-3",
    name: "דנה אברהם",
    phone: "050-5555123",
    email: "dana.a@example.com",
    address: "נחלת בנימין 8, תל אביב",
    notes: "מעוניינת בשיפוץ מטבח בלבד. סגנון תעשייתי. מאוד מדויקת בפרטים.",
    createdAt: "2026-02-05T09:15:00.000Z",
    projects: [
      { id: "demo-proj-3", name: "שיפוץ מטבח — נחלת בנימין 8", status: "ACTIVE" },
    ],
    _count: { projects: 1 },
  },
  {
    id: "demo-client-4",
    name: "משפחת ברק",
    phone: "053-7771234",
    email: "barak.family@example.com",
    address: "אלנבי 120, תל אביב",
    notes: "שיפוץ דירת גן. מתעניינים בסגנון בוהו-שיק עם אלמנטים טבעיים. 3 ילדים.",
    createdAt: "2026-02-28T11:00:00.000Z",
    projects: [
      { id: "demo-proj-4", name: "שיפוץ דירת גן — אלנבי 120", status: "ON_HOLD" },
    ],
    _count: { projects: 1 },
  },
  {
    id: "demo-client-5",
    name: "ד״ר שרה מזרחי",
    phone: "058-6669876",
    email: "sara.mizrachi@example.com",
    address: "דרך השלום 50, גבעתיים",
    notes: "מרפאת שיניים + דירת מגורים. שני פרויקטים במקביל. מאוד עסוקה — לתאם פגישות מראש.",
    createdAt: "2026-03-01T16:45:00.000Z",
    projects: [
      { id: "demo-proj-5a", name: "עיצוב מרפאת שיניים — דרך השלום 50", status: "ACTIVE" },
      { id: "demo-proj-5b", name: "עיצוב סלון + מטבח — דירת מגורים", status: "COMPLETED" },
    ],
    _count: { projects: 2 },
  },
];

export default function CrmClients() {
  const [clients, setClients] = useState<CrmClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingClient, setEditingClient] = useState<CrmClient | null>(null);
  const [selectedClient, setSelectedClient] = useState<CrmClient | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<ClientSubTab>("details");
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", address: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isUsingDemo, setIsUsingDemo] = useState(false);
  const subTabsRef = useRef<HTMLDivElement>(null);

  const fetchClients = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/designer/crm/clients?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setClients(data);
          setIsUsingDemo(false);
          setLoading(false);
          return;
        }
      }
      loadDemoClients();
    } catch {
      loadDemoClients();
    }
  }, [search]);

  const loadDemoClients = () => {
    setIsUsingDemo(true);
    let filtered = DEMO_CLIENTS;
    if (search) {
      const s = search.toLowerCase();
      filtered = DEMO_CLIENTS.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          c.phone?.includes(s) ||
          c.email?.toLowerCase().includes(s) ||
          c.address?.toLowerCase().includes(s)
      );
    }
    setClients(filtered);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchClients();
  }, [fetchClients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setSaving(true);
    setError("");

    if (isUsingDemo) {
      if (editingClient) {
        setClients((prev) =>
          prev.map((c) =>
            c.id === editingClient.id ? { ...c, ...formData } : c
          )
        );
      } else {
        const newClient: CrmClient = {
          id: `demo-new-${Date.now()}`,
          name: formData.name,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          notes: formData.notes || null,
          createdAt: new Date().toISOString(),
          projects: [],
          _count: { projects: 0 },
        };
        setClients((prev) => [newClient, ...prev]);
      }
      setShowAddForm(false);
      setEditingClient(null);
      setFormData({ name: "", phone: "", email: "", address: "", notes: "" });
      setSaving(false);
      return;
    }

    try {
      const url = editingClient
        ? `/api/designer/crm/clients/${editingClient.id}`
        : "/api/designer/crm/clients";
      const method = editingClient ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "שגיאה");
        return;
      }

      setShowAddForm(false);
      setEditingClient(null);
      setFormData({ name: "", phone: "", email: "", address: "", notes: "" });
      fetchClients();
    } catch {
      setError("שגיאת רשת");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (clientId: string) => {
    if (!confirm("למחוק את הלקוח?")) return;

    if (isUsingDemo) {
      setClients((prev) => prev.filter((c) => c.id !== clientId));
      if (selectedClient?.id === clientId) setSelectedClient(null);
      return;
    }

    try {
      await fetch(`/api/designer/crm/clients/${clientId}`, { method: "DELETE" });
      if (selectedClient?.id === clientId) setSelectedClient(null);
      fetchClients();
    } catch {
      console.error("Delete failed");
    }
  };

  const startEdit = (client: CrmClient) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      phone: client.phone || "",
      email: client.email || "",
      address: client.address || "",
      notes: client.notes || "",
    });
    setShowAddForm(true);
  };

  const statusLabel: Record<string, string> = {
    ACTIVE: "פעיל",
    ON_HOLD: "בהמתנה",
    COMPLETED: "הושלם",
    CANCELLED: "בוטל",
  };
  const statusColor: Record<string, string> = {
    ACTIVE: "bg-emerald-50 text-emerald-700",
    ON_HOLD: "bg-amber-50 text-amber-700",
    COMPLETED: "bg-blue-50 text-blue-700",
    CANCELLED: "bg-red-50 text-red-700",
  };

  // Scroll sub-tabs
  const scrollSubTabs = (direction: "left" | "right") => {
    if (subTabsRef.current) {
      const scrollAmount = 200;
      subTabsRef.current.scrollBy({
        left: direction === "right" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // =====================================================
  // CLIENT DETAIL VIEW — with sub-tabs
  // =====================================================
  if (selectedClient) {
    return (
      <div className="space-y-4 animate-in">
        {/* Back button + client name — Premium */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => { setSelectedClient(null); setActiveSubTab("details"); }}
            className="flex items-center gap-1.5 text-gold text-sm hover:underline font-medium group"
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            חזרה לרשימת לקוחות
          </button>
          <div className="flex items-center gap-3">
            <div className="avatar-gold">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center">
                <span className="text-gold font-bold text-sm">{selectedClient.name[0]}</span>
              </div>
            </div>
            <h2 className="text-lg font-heading font-bold text-gradient-gold">{selectedClient.name}</h2>
          </div>
        </div>

        {/* Sub-tabs navigation — horizontal scrollable, premium */}
        <div className="relative">
          <button
            onClick={() => scrollSubTabs("right")}
            className="absolute right-0 top-0 bottom-0 z-10 bg-gradient-to-l from-white via-white/80 to-transparent px-3 flex items-center text-text-muted hover:text-gold transition-all duration-200"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => scrollSubTabs("left")}
            className="absolute left-0 top-0 bottom-0 z-10 bg-gradient-to-r from-white via-white/80 to-transparent px-3 flex items-center text-text-muted hover:text-gold transition-all duration-200"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div
            ref={subTabsRef}
            className="flex gap-1 overflow-x-auto scrollbar-hide px-10 py-2 border-b border-border-subtle/50 bg-bg-surface/30 rounded-xl"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {SUB_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveSubTab(tab.key)}
                  className={`
                    relative flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium
                    whitespace-nowrap transition-all duration-200
                    ${isActive
                      ? "bg-gradient-to-br from-gold/15 to-gold/5 text-gold shadow-sm"
                      : "text-text-muted hover:bg-white/80 hover:text-text-primary hover:shadow-xs"
                    }
                  `}
                >
                  <Icon className={`w-3.5 h-3.5 transition-colors ${isActive ? "text-gold" : ""}`} />
                  {tab.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-gold rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub-tab content */}
        <div className="animate-in">
          {activeSubTab === "details" && (
            <div className="space-y-6">
              <div className="card-premium">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-heading font-bold text-text-primary">{selectedClient.name}</h2>
                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-text-muted">
                      {selectedClient.phone && (
                        <span className="flex items-center gap-1.5 hover:text-gold transition-colors">
                          <Phone className="w-3.5 h-3.5" /> {selectedClient.phone}
                        </span>
                      )}
                      {selectedClient.email && (
                        <span className="flex items-center gap-1.5 hover:text-gold transition-colors">
                          <Mail className="w-3.5 h-3.5" /> {selectedClient.email}
                        </span>
                      )}
                      {selectedClient.address && (
                        <span className="flex items-center gap-1.5 hover:text-gold transition-colors">
                          <MapPin className="w-3.5 h-3.5" /> {selectedClient.address}
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => startEdit(selectedClient)} className="p-2.5 rounded-xl text-text-muted hover:text-gold hover:bg-gold/5 transition-all duration-200">
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>

                {selectedClient.notes && (
                  <p className="text-text-muted text-sm bg-gradient-to-br from-bg-surface to-bg-surface-2 rounded-xl p-4 mb-4 leading-relaxed">
                    {selectedClient.notes}
                  </p>
                )}
              </div>

              {/* Projects summary — Premium */}
              <div className="card-glass">
                <h3 className="text-base font-heading font-bold text-text-primary mb-3 flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-gold" />
                  פרויקטים ({selectedClient.projects.length})
                </h3>
                {selectedClient.projects.length === 0 ? (
                  <div className="empty-state-premium py-8">
                    <FolderOpen className="w-8 h-8 text-gold/30 mx-auto mb-2" />
                    <p className="text-text-muted text-sm">אין פרויקטים עדיין</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedClient.projects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => setActiveSubTab("projects")}
                        className="list-item-premium w-full flex items-center justify-between p-3.5 bg-bg-surface/50 rounded-xl hover:bg-gold/5 transition-all duration-200 text-right"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
                            <FolderOpen className="w-4 h-4 text-gold" />
                          </div>
                          <span className="text-text-primary text-sm font-medium">{project.name}</span>
                        </div>
                        <span className={`badge text-xs px-2.5 py-1 rounded-full ${statusColor[project.status] || "bg-gray-100 text-gray-600"}`}>
                          {statusLabel[project.status] || project.status}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSubTab === "projects" && <CrmProjects />}
          {activeSubTab === "tasks" && <CrmTasks />}
          {activeSubTab === "quotes" && <CrmQuotes />}
          {activeSubTab === "contracts" && <CrmContracts />}
          {activeSubTab === "moodboards" && <CrmMoodboards />}
          {activeSubTab === "calendar" && <CrmCalendar />}
          {activeSubTab === "plans" && <CrmPlans />}
          {activeSubTab === "materials" && <CrmMaterials />}
          {activeSubTab === "budget" && <CrmBudgetTracker />}
          {activeSubTab === "timeline" && <CrmTimeline />}
          {activeSubTab === "before-after" && <CrmBeforeAfter />}
          {activeSubTab === "approvals" && <CrmApprovals />}
          {activeSubTab === "time-tracking" && <CrmTimeTracking />}
          {activeSubTab === "handoff" && <CrmHandoffChecklist />}
          {activeSubTab === "scheduler" && <CrmScheduler />}
          {activeSubTab === "onboarding" && <CrmOnboarding />}
          {activeSubTab === "style-quiz" && <CrmStyleQuiz designerId="" />}
          {activeSubTab === "surveys" && <CrmSurveys />}
          {activeSubTab === "inspiration" && <CrmInspirationLibrary />}
        </div>
      </div>
    );
  }

  // Add/Edit Form Modal
  if (showAddForm) {
    return (
      <div className="space-y-6 animate-in max-w-lg mx-auto">
        <button
          onClick={() => { setShowAddForm(false); setEditingClient(null); }}
          className="flex items-center gap-1 text-gold text-sm hover:underline"
        >
          <ChevronLeft className="w-4 h-4" />
          חזרה
        </button>
        <h2 className="text-xl font-heading text-text-primary">
          {editingClient ? "עריכת לקוח" : "לקוח חדש"}
        </h2>
        <form onSubmit={handleSubmit} className="card-static space-y-4">
          <div>
            <label className="text-text-secondary text-sm font-medium block mb-1">שם הלקוח *</label>
            <input
              type="text"
              className="input-field"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-text-secondary text-sm font-medium block mb-1">טלפון</label>
              <input
                type="tel"
                className="input-field"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-text-secondary text-sm font-medium block mb-1">מייל</label>
              <input
                type="email"
                className="input-field"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                dir="ltr"
              />
            </div>
          </div>
          <div>
            <label className="text-text-secondary text-sm font-medium block mb-1">כתובת</label>
            <input
              type="text"
              className="input-field"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
          <div>
            <label className="text-text-secondary text-sm font-medium block mb-1">הערות פנימיות</label>
            <textarea
              className="input-field h-20 resize-none"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={saving} className="btn-gold w-full">
            {saving ? "שומר..." : editingClient ? "עדכון לקוח" : "הוספת לקוח"}
          </button>
        </form>
      </div>
    );
  }

  // =====================================================
  // CLIENT LIST
  // =====================================================
  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading font-bold text-gradient-gold">הלקוחות שלי</h2>
        <button
          onClick={() => {
            setFormData({ name: "", phone: "", email: "", address: "", notes: "" });
            setEditingClient(null);
            setShowAddForm(true);
          }}
          className="btn-gold text-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          לקוח חדש
        </button>
      </div>

      {/* Search — Premium */}
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-faint" />
        <input
          type="text"
          placeholder="חיפוש לקוח לפי שם, טלפון, מייל..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pr-12"
        />
      </div>

      {loading ? (
        <div className="card-glass text-center py-12">
          <div className="w-10 h-10 border-2 border-gold/40 border-t-gold rounded-full animate-spin mx-auto mb-3" />
          <p className="text-text-muted text-sm">טוען לקוחות...</p>
        </div>
      ) : clients.length === 0 ? (
        <div className="empty-state-premium card-glass text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold/15 to-gold/5 flex items-center justify-center mx-auto mb-4 animate-float-subtle">
            <User className="w-7 h-7 text-gold/50" />
          </div>
          <p className="text-text-muted mb-1 font-medium">
            {search ? "לא נמצאו לקוחות" : "עדיין אין לקוחות"}
          </p>
          <p className="text-text-faint text-sm mb-5">
            {search ? "נסי לחפש עם מילה אחרת" : "הוסיפי את הלקוח הראשון כדי להתחיל!"}
          </p>
          {!search && (
            <button
              onClick={() => { setFormData({ name: "", phone: "", email: "", address: "", notes: "" }); setEditingClient(null); setShowAddForm(true); }}
              className="btn-gold text-sm flex items-center gap-1.5 mx-auto"
            >
              <Plus className="w-4 h-4" /> לקוח חדש
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((client, i) => (
            <div
              key={client.id}
              className={`list-item-premium card-glass hover:shadow-gold cursor-pointer transition-all duration-200 stagger-${Math.min(i + 1, 8)} animate-in`}
              onClick={() => setSelectedClient(client)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="avatar-gold flex-shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center">
                      <span className="text-gold font-bold text-lg">{client.name[0]}</span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-text-primary font-semibold truncate">{client.name}</p>
                    <div className="flex items-center gap-3 text-xs text-text-muted mt-1">
                      {client.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{client.phone}</span>}
                      <span className="flex items-center gap-1">
                        <FolderOpen className="w-3 h-3" />
                        {client._count.projects} פרויקטים
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 mr-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); startEdit(client); }}
                    className="p-2 rounded-lg text-text-muted hover:text-gold hover:bg-gold/5 transition-all duration-200"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }}
                    className="p-2 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-all duration-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
