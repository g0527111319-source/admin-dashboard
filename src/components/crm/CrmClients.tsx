"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, Plus, X, Phone, Mail, MapPin, FolderOpen, Trash2, Edit3,
  ChevronLeft, ChevronRight, User, CheckSquare, FileText, Palette,
  Calendar, Layout, Package, DollarSign, GitBranch, ArrowLeftRight,
  ThumbsUp, Clock, ClipboardCheck, CalendarClock, UserPlus, Sparkles,
  BarChart3, Lightbulb, ScrollText, Ruler, Link2, Copy, ExternalLink,
  MessageCircle, Building2, Archive, RotateCcw, ChevronDown, ChevronUp,
  Home, Users
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
  isArchived?: boolean;
  // Structured fields
  firstName?: string | null;
  lastName?: string | null;
  partner1FirstName?: string | null;
  partner1LastName?: string | null;
  partner1Phone?: string | null;
  partner1Email?: string | null;
  street?: string | null;
  floor?: string | null;
  apartment?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  renovationSameAddress?: boolean;
  renovationStreet?: string | null;
  renovationFloor?: string | null;
  renovationApartment?: string | null;
  renovationNeighborhood?: string | null;
  renovationCity?: string | null;
  renovationDetails?: string | null;
  renovationPurpose?: string | null;
  estimatedBudget?: string | null;
  accessInstructions?: string | null;
  // Email language preference ("he" | "en"). Optional for back-compat with
  // rows created before the column existed.
  language?: string | null;
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

const EMPTY_FORM = {
  firstName: "", lastName: "", phone: "", email: "",
  partner1FirstName: "", partner1LastName: "", partner1Phone: "", partner1Email: "",
  street: "", floor: "", apartment: "", neighborhood: "", city: "",
  renovationSameAddress: false,
  renovationStreet: "", renovationFloor: "", renovationApartment: "", renovationNeighborhood: "", renovationCity: "",
  renovationDetails: "", renovationPurpose: "", estimatedBudget: "",
  accessInstructions: "",
  notes: "",
  // NEW: every client now gets a first project auto-created. If the designer
  // leaves this blank the server defaults it to "פרויקט ראשון".
  firstProjectName: "",
  // NEW: email language for client-facing messages. Default Hebrew.
  language: "he" as "he" | "en",
};

export default function CrmClients({ gender }: { gender?: string }) {
  const [clients, setClients] = useState<CrmClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showArchive, setShowArchive] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingClient, setEditingClient] = useState<CrmClient | null>(null);
  const [selectedClient, setSelectedClient] = useState<CrmClient | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<ClientSubTab>("details");
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [showPartner, setShowPartner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedProject, setSelectedProject] = useState<{ id: string; name: string; status: string } | null>(null);
  const subTabsRef = useRef<HTMLDivElement>(null);
  const [portalUrl, setPortalUrl] = useState("");
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalCopied, setPortalCopied] = useState(false);
  const [portalEmailSent, setPortalEmailSent] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/designer/crm/clients?${params}`);
      if (res.ok) {
        const data = await res.json();
        setClients(Array.isArray(data) ? data : data.data || []);
      } else {
        setClients([]);
      }
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    setLoading(true);
    fetchClients();
  }, [fetchClients]);

  // Compute display name from structured fields
  const computeDisplayName = (data: typeof formData) => {
    let fullName = `${data.firstName} ${data.lastName}`.trim();
    if (data.partner1FirstName.trim()) {
      const partnerName = `${data.partner1FirstName} ${data.partner1LastName}`.trim();
      fullName = `${fullName} ו${partnerName}`;
    }
    return fullName;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim()) return;
    setSaving(true);
    setError("");

    const computedName = computeDisplayName(formData);

    try {
      const url = editingClient
        ? `/api/designer/crm/clients/${editingClient.id}`
        : "/api/designer/crm/clients";
      const method = editingClient ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, name: computedName }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "שגיאה");
        return;
      }

      setShowAddForm(false);
      setEditingClient(null);
      setShowPartner(false);
      setFormData({ ...EMPTY_FORM });
      fetchClients();
    } catch {
      setError("שגיאת רשת");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (clientId: string) => {
    if (!confirm("למחוק את הלקוח?")) return;
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
      firstName: client.firstName || "",
      lastName: client.lastName || "",
      phone: client.phone || "",
      email: client.email || "",
      partner1FirstName: client.partner1FirstName || "",
      partner1LastName: client.partner1LastName || "",
      partner1Phone: client.partner1Phone || "",
      partner1Email: client.partner1Email || "",
      street: client.street || "",
      floor: client.floor || "",
      apartment: client.apartment || "",
      neighborhood: client.neighborhood || "",
      city: client.city || "",
      renovationSameAddress: client.renovationSameAddress || false,
      renovationStreet: client.renovationStreet || "",
      renovationFloor: client.renovationFloor || "",
      renovationApartment: client.renovationApartment || "",
      renovationNeighborhood: client.renovationNeighborhood || "",
      renovationCity: client.renovationCity || "",
      renovationDetails: client.renovationDetails || "",
      renovationPurpose: client.renovationPurpose || "",
      estimatedBudget: client.estimatedBudget || "",
      accessInstructions: client.accessInstructions || "",
      notes: client.notes || "",
      // Edit mode: `firstProjectName` is ignored by the PATCH route so we
      // just seed it empty. `language` is kept so the designer can change it
      // later (though today the PATCH route will need to accept this field —
      // if it doesn't, the send will just drop the key silently).
      firstProjectName: "",
      language: (client.language === "en" ? "en" : "he") as "he" | "en",
    });
    setShowPartner(!!(client.partner1FirstName || client.partner1Phone || client.partner1Email));
    setShowAddForm(true);
  };

  const [portalError, setPortalError] = useState("");
  const generatePortalLink = async (clientId: string, clientEmail?: string | null) => {
    setPortalLoading(true);
    setPortalUrl("");
    setPortalCopied(false);
    setPortalEmailSent(null);
    setPortalError("");
    try {
      const res = await fetch(`/api/designer/crm/clients/${clientId}/portal-token`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        const fullUrl = `${window.location.origin}${data.url}`;
        setPortalUrl(fullUrl);
        if (data.emailSent && data.emailRecipients?.length > 0) {
          setPortalEmailSent(data.emailRecipients.join(", "));
          setTimeout(() => setPortalEmailSent(null), 5000);
        } else if (clientEmail) {
          // Email was expected but not sent — notify user
          setPortalEmailSent(null);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setPortalError(errData.error || "שגיאה ביצירת לינק");
      }
    } catch {
      setPortalError("שגיאת רשת — נסה שוב");
    } finally {
      setPortalLoading(false);
    }
  };

  const copyPortalLink = async () => {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setPortalCopied(true);
      setTimeout(() => setPortalCopied(false), 2000);
    } catch {
      console.error("Copy failed");
    }
  };

  const sendViaWhatsApp = (phone: string | null) => {
    const message = encodeURIComponent(`הנה הקישור לאזור האישי שלך:\n${portalUrl}`);
    const phoneNum = phone ? phone.replace(/[^0-9]/g, "") : "";
    const whatsappUrl = phoneNum
      ? `https://wa.me/972${phoneNum.startsWith("0") ? phoneNum.slice(1) : phoneNum}?text=${message}`
      : `https://wa.me/?text=${message}`;
    window.open(whatsappUrl, "_blank");
  };

  // Archive helpers
  const toggleArchive = (clientId: string) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId ? { ...c, isArchived: !c.isArchived } : c
      )
    );
    // If the selected client is being archived, deselect
    if (selectedClient?.id === clientId) {
      setSelectedClient(null);
    }
  };

  const allProjectsCompleted = (client: CrmClient) =>
    client.projects.length > 0 && client.projects.every((p) => p.status === "COMPLETED");

  const activeClients = clients.filter((c) => !c.isArchived);
  const archivedClients = clients.filter((c) => c.isArchived);

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
  // (rendered ONLY when the add/edit form is closed —
  // otherwise the pencil button inside the detail view
  // would sit behind the detail branch and the modal would
  // never mount, because selectedClient is still set when
  // we enter edit mode).
  // =====================================================
  if (selectedClient && !showAddForm) {
    // If no project selected yet, show project picker
    if (!selectedProject && selectedClient.projects.length > 0) {
      return (
        <div className="space-y-6 animate-in">
          <button
            onClick={() => { setSelectedClient(null); setActiveSubTab("details"); }}
            className="flex items-center gap-1.5 text-gold text-sm hover:underline font-medium group"
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            חזרה לרשימת לקוחות
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center">
              <span className="text-gold font-bold text-lg">{selectedClient.name[0]}</span>
            </div>
            <div>
              <h2 className="text-lg font-heading font-bold text-gradient-gold">{selectedClient.name}</h2>
              <p className="text-xs text-text-muted">{selectedClient.projects.length} פרויקטים</p>
            </div>
          </div>

          {/* Client quick info */}
          <div className="card-glass">
            <div className="flex flex-wrap gap-4 text-sm text-text-muted">
              {selectedClient.phone && (
                <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {selectedClient.phone}</span>
              )}
              {selectedClient.email && (
                <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {selectedClient.email}</span>
              )}
              {selectedClient.city && (
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {selectedClient.city}</span>
              )}
            </div>
          </div>

          {/* Project picker */}
          <div>
            <h3 className="text-base font-heading font-bold text-text-primary mb-3 flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-gold" />
              בחרי פרויקט
            </h3>
            <div className="space-y-3">
              {selectedClient.projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => { setSelectedProject(project); setActiveSubTab("details"); }}
                  className="w-full card-glass hover:shadow-gold transition-all duration-200 text-right"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold/10 to-gold/5 flex items-center justify-center">
                        <FolderOpen className="w-5 h-5 text-gold" />
                      </div>
                      <span className="text-text-primary font-medium">{project.name}</span>
                    </div>
                    <span className={`badge text-xs px-2.5 py-1 rounded-full ${statusColor[project.status] || "bg-gray-100 text-gray-600"}`}>
                      {statusLabel[project.status] || project.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Button to view client details without project */}
          <button
            onClick={() => { setSelectedProject({ id: "__details__", name: "פרטי לקוח", status: "" }); setActiveSubTab("details"); }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-border-subtle hover:border-gold/40 text-text-muted hover:text-gold transition-all duration-200 text-sm font-medium"
          >
            <User className="w-4 h-4" />
            צפייה בפרטי לקוח בלבד
          </button>
        </div>
      );
    }

    // If client has no projects, go straight to details
    if (!selectedProject && selectedClient.projects.length === 0) {
      setSelectedProject({ id: "__details__", name: "פרטי לקוח", status: "" });
    }

    return (
      <div className="space-y-4 animate-in">
        {/* Back button + client/project name */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              if (selectedClient.projects.length > 1 && selectedProject?.id !== "__details__") {
                setSelectedProject(null);
                setActiveSubTab("details");
              } else {
                setSelectedClient(null);
                setSelectedProject(null);
                setActiveSubTab("details");
              }
            }}
            className="flex items-center gap-1.5 text-gold text-sm hover:underline font-medium group"
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            {selectedClient.projects.length > 1 && selectedProject?.id !== "__details__" ? "חזרה לבחירת פרויקט" : "חזרה לרשימת לקוחות"}
          </button>
          <div className="flex items-center gap-3">
            <div className="avatar-gold">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center">
                <span className="text-gold font-bold text-sm">{selectedClient.name[0]}</span>
              </div>
            </div>
            <div className="text-left">
              <h2 className="text-lg font-heading font-bold text-gradient-gold">{selectedClient.name}</h2>
              {selectedProject && selectedProject.id !== "__details__" && (
                <p className="text-xs text-text-muted flex items-center gap-1">
                  <FolderOpen className="w-3 h-3" /> {selectedProject.name}
                </p>
              )}
            </div>
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

                    {/* Client 1 details */}
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
                    </div>

                    {/* Client 2 / Partner details */}
                    {selectedClient.partner1FirstName && (
                      <div className="mt-3 pt-3 border-t border-border-subtle/30">
                        <p className="text-xs text-text-faint mb-1.5 flex items-center gap-1"><Users className="w-3 h-3" /> לקוח/ה נוסף/ת</p>
                        <div className="flex flex-wrap gap-4 text-sm text-text-muted">
                          <span className="font-medium text-text-primary">
                            {`${selectedClient.partner1FirstName} ${selectedClient.partner1LastName || ""}`.trim()}
                          </span>
                          {selectedClient.partner1Phone && (
                            <span className="flex items-center gap-1.5 hover:text-gold transition-colors">
                              <Phone className="w-3.5 h-3.5" /> {selectedClient.partner1Phone}
                            </span>
                          )}
                          {selectedClient.partner1Email && (
                            <span className="flex items-center gap-1.5 hover:text-gold transition-colors">
                              <Mail className="w-3.5 h-3.5" /> {selectedClient.partner1Email}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Residential address */}
                    {(selectedClient.street || selectedClient.city) && (
                      <div className="mt-3 pt-3 border-t border-border-subtle/30">
                        <p className="text-xs text-text-faint mb-1.5 flex items-center gap-1"><Home className="w-3 h-3" /> כתובת מגורים</p>
                        <p className="text-sm text-text-muted flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          {[
                            selectedClient.street,
                            selectedClient.floor && `קומה ${selectedClient.floor}`,
                            selectedClient.apartment && `דירה ${selectedClient.apartment}`,
                            selectedClient.neighborhood,
                            selectedClient.city,
                          ].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    )}

                    {/* Renovation property */}
                    {(selectedClient.renovationSameAddress || selectedClient.renovationStreet || selectedClient.renovationCity || selectedClient.renovationDetails) && (
                      <div className="mt-3 pt-3 border-t border-border-subtle/30">
                        <p className="text-xs text-text-faint mb-1.5 flex items-center gap-1"><Building2 className="w-3 h-3" /> נכס לשיפוץ</p>
                        {selectedClient.renovationSameAddress ? (
                          <p className="text-sm text-text-muted">הנכס נמצא בכתובת המגורים</p>
                        ) : (selectedClient.renovationStreet || selectedClient.renovationCity) ? (
                          <p className="text-sm text-text-muted flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            {[
                              selectedClient.renovationStreet,
                              selectedClient.renovationFloor && `קומה ${selectedClient.renovationFloor}`,
                              selectedClient.renovationApartment && `דירה ${selectedClient.renovationApartment}`,
                              selectedClient.renovationNeighborhood,
                              selectedClient.renovationCity,
                            ].filter(Boolean).join(", ")}
                          </p>
                        ) : null}
                        {selectedClient.accessInstructions && (
                          <p className="text-sm text-text-muted mt-1"><span className="text-text-faint">דרך גישה:</span> {selectedClient.accessInstructions}</p>
                        )}
                        {selectedClient.renovationDetails && (
                          <p className="text-sm text-text-muted mt-1"><span className="text-text-faint">פרטי השיפוץ:</span> {selectedClient.renovationDetails}</p>
                        )}
                        {selectedClient.renovationPurpose && (
                          <p className="text-sm text-text-muted mt-1"><span className="text-text-faint">מטרה:</span> {selectedClient.renovationPurpose}</p>
                        )}
                        {selectedClient.estimatedBudget && (
                          <p className="text-sm text-text-muted mt-1"><span className="text-text-faint">תקציב משוער:</span> {Number(selectedClient.estimatedBudget).toLocaleString()} &#x20AA;</p>
                        )}
                      </div>
                    )}
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

              {/* Portal Link — Premium */}
              <div className="card-glass">
                <h3 className="text-base font-heading font-bold text-text-primary mb-3 flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-gold" />
                  לינק לאזור אישי
                </h3>
                {selectedClient.isArchived ? (
                  <div className="text-center py-4">
                    <p className="text-text-muted text-sm">הפרויקט הסתיים — הלינק לאזור האישי אינו פעיל</p>
                  </div>
                ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => generatePortalLink(selectedClient.id, selectedClient.email)}
                    disabled={portalLoading}
                    className="btn-gold text-sm flex items-center gap-2"
                  >
                    {portalLoading ? (
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Link2 className="w-4 h-4" />
                    )}
                    שלח לינק לאזור אישי
                  </button>

                  {portalError && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-sm">
                      <X className="w-4 h-4" />
                      <span>{portalError}</span>
                    </div>
                  )}

                  {portalEmailSent && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm">
                      <Mail className="w-4 h-4" />
                      <span>הלינק נשלח למייל {portalEmailSent}</span>
                    </div>
                  )}

                  {portalUrl && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={portalUrl}
                          className="input-field flex-1 text-xs"
                          dir="ltr"
                        />
                        <button
                          onClick={copyPortalLink}
                          className={`p-2.5 rounded-xl transition-all duration-200 ${
                            portalCopied
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-bg-surface text-text-muted hover:text-gold hover:bg-gold/5"
                          }`}
                          title="העתק לינק"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      {portalCopied && (
                        <span className="text-emerald-600 text-xs">הלינק הועתק!</span>
                      )}
                      <button
                        onClick={() => sendViaWhatsApp(selectedClient.phone)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors text-sm font-medium"
                      >
                        <MessageCircle className="w-4 h-4" />
                        שלח בוואצפ
                      </button>
                    </div>
                  )}
                </div>
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
                        onClick={() => { setSelectedProject(project); setActiveSubTab("projects"); }}
                        className={`list-item-premium w-full flex items-center justify-between p-3.5 rounded-xl transition-all duration-200 text-right ${
                          selectedProject?.id === project.id
                            ? "bg-gold/10 ring-1 ring-gold/30"
                            : "bg-bg-surface/50 hover:bg-gold/5"
                        }`}
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

          {/* Archive button — show if all projects completed */}
          {activeSubTab === "details" && allProjectsCompleted(selectedClient) && !selectedClient.isArchived && (
            <div className="card-glass border border-gold/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary">כל הפרויקטים הושלמו</p>
                  <p className="text-xs text-text-muted mt-0.5">ניתן להעביר את הלקוח לארכיון</p>
                </div>
                <button
                  onClick={() => toggleArchive(selectedClient.id)}
                  className="btn-outline text-sm flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gold/30 hover:bg-gold/10 hover:text-gold transition-all"
                >
                  <Archive className="w-4 h-4" /> העבר לארכיון
                </button>
              </div>
            </div>
          )}

          {activeSubTab === "projects" && <CrmProjects clientId={selectedClient.id} />}
          {activeSubTab === "tasks" && <CrmTasks clientId={selectedClient.id} projectId={selectedProject?.id !== "__details__" ? selectedProject?.id : undefined} />}
          {activeSubTab === "quotes" && <CrmQuotes clientId={selectedClient.id} projectId={selectedProject?.id !== "__details__" ? selectedProject?.id : undefined} />}
          {activeSubTab === "contracts" && <CrmContracts clientId={selectedClient.id} projectId={selectedProject?.id !== "__details__" ? selectedProject?.id : undefined} />}
          {activeSubTab === "moodboards" && <CrmMoodboards clientId={selectedClient.id} projectId={selectedProject?.id !== "__details__" ? selectedProject?.id : undefined} />}
          {activeSubTab === "calendar" && <CrmCalendar clientId={selectedClient.id} projectId={selectedProject?.id !== "__details__" ? selectedProject?.id : undefined} />}
          {activeSubTab === "plans" && <CrmPlans clientId={selectedClient.id} projectId={selectedProject?.id !== "__details__" ? selectedProject?.id : undefined} />}
          {activeSubTab === "materials" && <CrmMaterials clientId={selectedClient.id} projectId={selectedProject?.id !== "__details__" ? selectedProject?.id : undefined} />}
          {activeSubTab === "budget" && <CrmBudgetTracker clientId={selectedClient.id} projectId={selectedProject?.id !== "__details__" ? selectedProject?.id : undefined} />}
          {activeSubTab === "timeline" && <CrmTimeline clientId={selectedClient.id} projectId={selectedProject?.id !== "__details__" ? selectedProject?.id : undefined} />}
          {activeSubTab === "before-after" && <CrmBeforeAfter clientId={selectedClient.id} projectId={selectedProject?.id !== "__details__" ? selectedProject?.id : undefined} />}
          {activeSubTab === "approvals" && <CrmApprovals clientId={selectedClient.id} projectId={selectedProject?.id !== "__details__" ? selectedProject?.id : undefined} />}
          {activeSubTab === "time-tracking" && <CrmTimeTracking clientId={selectedClient.id} projectId={selectedProject?.id !== "__details__" ? selectedProject?.id : undefined} />}
          {activeSubTab === "handoff" && <CrmHandoffChecklist clientId={selectedClient.id} projectId={selectedProject?.id !== "__details__" ? selectedProject?.id : undefined} />}
          {activeSubTab === "scheduler" && <CrmScheduler clientId={selectedClient.id} projectId={selectedProject?.id !== "__details__" ? selectedProject?.id : undefined} />}
          {activeSubTab === "onboarding" && <CrmOnboarding clientId={selectedClient.id} projectId={selectedProject?.id !== "__details__" ? selectedProject?.id : undefined} />}
          {activeSubTab === "style-quiz" && <CrmStyleQuiz designerId="" clientId={selectedClient.id} />}
          {activeSubTab === "surveys" && <CrmSurveys clientId={selectedClient.id} projectId={selectedProject?.id !== "__details__" ? selectedProject?.id : undefined} />}
          {activeSubTab === "inspiration" && <CrmInspirationLibrary clientId={selectedClient.id} />}
        </div>
      </div>
    );
  }

  // Add/Edit Form Modal
  if (showAddForm) {
    return (
      <div className="space-y-6 animate-in max-w-lg mx-auto">
        <button
          onClick={() => { setShowAddForm(false); setEditingClient(null); setShowPartner(false); }}
          className="flex items-center gap-1 text-gold text-sm hover:underline"
        >
          <ChevronLeft className="w-4 h-4" />
          חזרה
        </button>
        <h2 className="text-xl font-heading text-text-primary">
          {editingClient ? "עריכת לקוח" : "לקוח חדש"}
        </h2>
        <form onSubmit={handleSubmit} className="card-static space-y-6">

          {/* Section 1: Primary Client */}
          <div className="space-y-4">
            <h3 className="text-base font-heading text-text-primary flex items-center gap-2">
              <User className="w-4 h-4 text-gold" />
              לקוח/ה ראשי/ת
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-text-secondary text-sm font-medium block mb-1">שם פרטי *</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-text-secondary text-sm font-medium block mb-1">שם משפחה</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
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
          </div>

          {/* Section 2: Partner / Second Client — collapsible */}
          <div className="border-t border-border-subtle pt-4">
            {!showPartner ? (
              <button
                type="button"
                onClick={() => setShowPartner(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-border-subtle hover:border-gold/40 text-text-muted hover:text-gold transition-all duration-200 text-sm font-medium"
              >
                <UserPlus className="w-4 h-4" />
                הוסף לקוח/ה נוסף/ת (שותף/בן זוג)
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-heading text-text-primary flex items-center gap-2">
                    <Users className="w-4 h-4 text-gold" />
                    לקוח/ה נוסף/ת
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPartner(false);
                      setFormData({ ...formData, partner1FirstName: "", partner1LastName: "", partner1Phone: "", partner1Email: "" });
                    }}
                    className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-all duration-200"
                    title="הסר לקוח/ה נוסף/ת"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-text-secondary text-sm font-medium block mb-1">שם פרטי</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.partner1FirstName}
                      onChange={(e) => setFormData({ ...formData, partner1FirstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-text-secondary text-sm font-medium block mb-1">שם משפחה</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.partner1LastName}
                      onChange={(e) => setFormData({ ...formData, partner1LastName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-text-secondary text-sm font-medium block mb-1">טלפון</label>
                    <input
                      type="tel"
                      className="input-field"
                      value={formData.partner1Phone}
                      onChange={(e) => setFormData({ ...formData, partner1Phone: e.target.value })}
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="text-text-secondary text-sm font-medium block mb-1">מייל</label>
                    <input
                      type="email"
                      className="input-field"
                      value={formData.partner1Email}
                      onChange={(e) => setFormData({ ...formData, partner1Email: e.target.value })}
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Residential Address */}
          <div className="border-t border-border-subtle pt-4 space-y-4">
            <h3 className="text-base font-heading text-text-primary flex items-center gap-2">
              <Home className="w-4 h-4 text-gold" />
              כתובת מגורים
            </h3>
            <div>
              <label className="text-text-secondary text-sm font-medium block mb-1">רחוב ומספר</label>
              <input
                type="text"
                className="input-field"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                placeholder="הרצל 42"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-text-secondary text-sm font-medium block mb-1">קומה</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                  placeholder="3"
                />
              </div>
              <div>
                <label className="text-text-secondary text-sm font-medium block mb-1">דירה</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.apartment}
                  onChange={(e) => setFormData({ ...formData, apartment: e.target.value })}
                  placeholder="10"
                />
              </div>
              <div>
                <label className="text-text-secondary text-sm font-medium block mb-1">שכונה <span className="text-text-faint text-xs">(אופציונלי)</span></label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-text-secondary text-sm font-medium block mb-1">עיר</label>
              <input
                type="text"
                className="input-field"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="תל אביב"
              />
            </div>
          </div>

          {/* Section 4: Renovation Property */}
          <div className="border-t border-border-subtle pt-4 space-y-4">
            <h3 className="text-base font-heading text-text-primary flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gold" />
              נכס לשיפוץ
            </h3>

            {/* Same address checkbox */}
            <button
              type="button"
              onClick={() => setFormData({ ...formData, renovationSameAddress: !formData.renovationSameAddress })}
              className="flex items-center gap-3 cursor-pointer group w-full text-right"
            >
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                formData.renovationSameAddress
                  ? "bg-gold border-gold"
                  : "border-border-subtle group-hover:border-gold/40"
              }`}>
                {formData.renovationSameAddress && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-text-primary font-medium">כתובת זהה לכתובת המגורים</span>
            </button>

            {formData.renovationSameAddress ? (
              <div className="bg-gradient-to-br from-bg-surface to-bg-surface-2 rounded-xl p-4">
                <p className="text-sm text-text-muted flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                  הנכס נמצא בכתובת המגורים
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-text-secondary text-sm font-medium block mb-1">רחוב ומספר</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.renovationStreet}
                    onChange={(e) => setFormData({ ...formData, renovationStreet: e.target.value })}
                    placeholder="רחוב ומספר של הנכס"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-text-secondary text-sm font-medium block mb-1">קומה</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.renovationFloor}
                      onChange={(e) => setFormData({ ...formData, renovationFloor: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-text-secondary text-sm font-medium block mb-1">דירה</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.renovationApartment}
                      onChange={(e) => setFormData({ ...formData, renovationApartment: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-text-secondary text-sm font-medium block mb-1">שכונה <span className="text-text-faint text-xs">(אופציונלי)</span></label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.renovationNeighborhood}
                      onChange={(e) => setFormData({ ...formData, renovationNeighborhood: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-text-secondary text-sm font-medium block mb-1">עיר</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.renovationCity}
                    onChange={(e) => setFormData({ ...formData, renovationCity: e.target.value })}
                    placeholder="עיר הנכס"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-text-secondary text-sm font-medium block mb-1">דרך גישה</label>
              <textarea
                className="input-field h-16 resize-none"
                value={formData.accessInstructions}
                onChange={(e) => setFormData({ ...formData, accessInstructions: e.target.value })}
                placeholder="קוד כניסה, הנחיות הגעה, הערות לגישה..."
              />
            </div>
            <div>
              <label className="text-text-secondary text-sm font-medium block mb-1">פרטי השיפוץ</label>
              <textarea
                className="input-field h-20 resize-none"
                value={formData.renovationDetails}
                onChange={(e) => setFormData({ ...formData, renovationDetails: e.target.value })}
                placeholder="תיאור קצר של העבודה הנדרשת..."
              />
            </div>
            <div>
              <label className="text-text-secondary text-sm font-medium block mb-1">מטרת השיפוץ</label>
              <select
                className="input-field"
                value={formData.renovationPurpose}
                onChange={(e) => setFormData({ ...formData, renovationPurpose: e.target.value })}
              >
                <option value="">בחרי מטרה...</option>
                <option value="דירת מגורים">דירת מגורים</option>
                <option value="משרד">משרד</option>
                <option value="חנות/עסק">חנות/עסק</option>
                <option value="דירת Airbnb">דירת Airbnb</option>
                <option value="אחר">אחר</option>
              </select>
            </div>
            <div>
              <label className="text-text-secondary text-sm font-medium block mb-1">תקציב משוער</label>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">&#x20AA;</span>
                <input
                  type="number"
                  className="input-field pr-8"
                  value={formData.estimatedBudget}
                  onChange={(e) => setFormData({ ...formData, estimatedBudget: e.target.value })}
                  placeholder="0"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/*
            Section 5: first project + client preferences.
            Every new client is created WITH a project — it's a system invariant,
            not an optional extra. The name here is the project's display name;
            leaving it blank falls back to "פרויקט ראשון" server-side.
            `language` controls which language we send client-facing emails in
            (meeting invites, reminders). Only shown on create — editing an
            existing client doesn't need to re-choose it here.
          */}
          {!editingClient && (
            <div className="border-t border-border-subtle pt-4 space-y-4">
              <h3 className="text-base font-heading text-text-primary flex items-center gap-2">
                <FileText className="w-4 h-4 text-gold" />
                פרויקט ראשון והעדפות
              </h3>
              <div>
                <label className="block text-sm text-text-muted mb-1.5">
                  שם הפרויקט הראשון
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.firstProjectName}
                  onChange={(e) => setFormData({ ...formData, firstProjectName: e.target.value })}
                  placeholder="למשל: שיפוץ דירה, עיצוב סלון — ברירת מחדל: פרויקט ראשון"
                />
                <p className="text-xs text-text-muted mt-1">
                  תמיד נוצר פרויקט אחד בעת פתיחת הלקוח. אפשר להוסיף עוד פרויקטים בהמשך מתוך דף הלקוח.
                </p>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1.5">
                  שפת ההתקשרות עם הלקוח (מיילים)
                </label>
                <select
                  className="input-field"
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value as "he" | "en" })}
                >
                  <option value="he">עברית</option>
                  <option value="en">English</option>
                </select>
                <p className="text-xs text-text-muted mt-1">
                  ישפיע על שפת הזמנות הפגישה ותזכורות אוטומטיות שנשלחות ללקוח.
                </p>
              </div>
            </div>
          )}

          {/* Section 6: Internal Notes */}
          <div className="border-t border-border-subtle pt-4 space-y-4">
            <h3 className="text-base font-heading text-text-primary flex items-center gap-2">
              <FileText className="w-4 h-4 text-gold" />
              הערות פנימיות
            </h3>
            <textarea
              className="input-field h-20 resize-none"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="הערות שלא יוצגו ללקוח..."
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
            setFormData({ ...EMPTY_FORM });
            setEditingClient(null);
            setShowAddForm(true);
          }}
          className="btn-gold text-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          לקוח חדש
        </button>
      </div>

      {/* Archive toggle tabs */}
      <div className="flex gap-1 p-1 bg-bg-surface/50 rounded-xl w-fit">
        <button
          onClick={() => setShowArchive(false)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            !showArchive
              ? "bg-gradient-to-br from-gold/15 to-gold/5 text-gold shadow-sm"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          לקוחות פעילים ({activeClients.length})
        </button>
        <button
          onClick={() => setShowArchive(true)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
            showArchive
              ? "bg-gradient-to-br from-gold/15 to-gold/5 text-gold shadow-sm"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          ארכיון ({archivedClients.length})
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
      ) : !showArchive ? (
        /* ===== ACTIVE CLIENTS ===== */
        activeClients.length === 0 ? (
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
                onClick={() => { setFormData({ ...EMPTY_FORM }); setEditingClient(null); setShowAddForm(true); }}
                className="btn-gold text-sm flex items-center gap-1.5 mx-auto"
              >
                <Plus className="w-4 h-4" /> לקוח חדש
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {activeClients.map((client, i) => (
              <div
                key={client.id}
                className={`list-item-premium card-glass hover:shadow-gold cursor-pointer transition-all duration-200 stagger-${Math.min(i + 1, 8)} animate-in`}
                onClick={() => { setSelectedClient(client); setSelectedProject(null); }}
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
                    {allProjectsCompleted(client) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleArchive(client.id); }}
                        className="p-2 rounded-lg text-text-muted hover:text-gold hover:bg-gold/5 transition-all duration-200"
                        title="העבר לארכיון"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    )}
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
        )
      ) : (
        /* ===== ARCHIVED CLIENTS ===== */
        archivedClients.length === 0 ? (
          <div className="empty-state-premium card-glass text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mx-auto mb-4">
              <Archive className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-text-muted mb-1 font-medium">אין לקוחות בארכיון</p>
            <p className="text-text-faint text-sm">לקוחות שכל הפרויקטים שלהם הושלמו יופיעו כאן</p>
          </div>
        ) : (
          <div className="space-y-3">
            {archivedClients.map((client, i) => (
              <div
                key={client.id}
                className={`list-item-premium card-glass cursor-pointer transition-all duration-200 opacity-70 hover:opacity-100 stagger-${Math.min(i + 1, 8)} animate-in`}
                onClick={() => { setSelectedClient(client); setSelectedProject(null); }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                        <span className="text-gray-400 font-bold text-lg">{client.name[0]}</span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-text-muted font-semibold truncate">{client.name}</p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">ארכיון</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-text-faint mt-1">
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
                      onClick={(e) => { e.stopPropagation(); toggleArchive(client.id); }}
                      className="p-2 rounded-lg text-text-muted hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-200 flex items-center gap-1"
                      title="שחזר מארכיון"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
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
        )
      )}
    </div>
  );
}
