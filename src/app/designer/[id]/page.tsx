"use client";
import { txt } from "@/content/siteText";
import { useState, useEffect } from "react";
import Logo from "@/components/ui/Logo";
import Image from "next/image";
import { HandCoins, Trophy, Calendar as CalendarIcon, Search, MapPin, MessageCircle, Plus, Grid3X3, List, Heart, X, Star, User, Clock, CheckCircle2, History, Phone, Mail, Globe, Instagram, CreditCard, Users, Settings, Building2, MessageSquare, Zap, ChevronLeft, ChevronRight, Menu, Home, Workflow, Bell, TrendingUp, Activity, FileText, Copy, ShieldCheck, FolderKanban } from "lucide-react";
import CrmClients from "@/components/crm/CrmClients";
import CrmSettings from "@/components/crm/CrmSettings";
import CrmSuppliers from "@/components/crm/CrmSuppliers";
import CrmTemplates from "@/components/crm/CrmTemplates";
import CrmWhatsApp from "@/components/crm/CrmWhatsApp";
import CrmWebhooks from "@/components/crm/CrmWebhooks";
import CrmWorkflowTemplates from "@/components/crm/CrmWorkflowTemplates";
import CrmContracts from "@/components/crm/CrmContracts";
import CrmCalendar from "@/components/crm/CrmCalendar";
import CrmProjects from "@/components/crm/CrmProjects";
import CrmScheduler from "@/components/crm/CrmScheduler";
import CrmQuotes from "@/components/crm/CrmQuotes";
import CrmTimeTracking from "@/components/crm/CrmTimeTracking";
import CrmSurveys from "@/components/crm/CrmSurveys";
import CrmApprovals from "@/components/crm/CrmApprovals";
import CrmBeforeAfter from "@/components/crm/CrmBeforeAfter";
import CrmHandoffChecklist from "@/components/crm/CrmHandoffChecklist";
import CrmOnboarding from "@/components/crm/CrmOnboarding";
import CrmChat from "@/components/crm/CrmChat";
import CrmStyleQuiz from "@/components/crm/CrmStyleQuiz";
import ChatBot from "@/components/crm/ChatBot";
import type { DesignerContext } from "@/components/crm/ChatBot";
import BusinessCardBuilder from "@/components/business-card/BusinessCardBuilder";
import TermsConsentModal from "@/components/TermsConsentModal";
import PushNotificationManager from "@/components/PushNotificationManager";
import CrmKanban from "@/components/crm/CrmKanban";
import CrmPortfolio from "@/components/crm/CrmPortfolio";
import FeatureGate from "@/components/FeatureGate";
import NotificationBell from "@/components/NotificationBell";
import AccountSettings from "@/components/designer/AccountSettings";
import { useParams } from "next/navigation";

import { SUPPLIER_CATEGORIES, AREAS, formatCurrency } from "@/lib/utils";

// Default empty profile — populated from API
const EMPTY_DESIGNER_DATA = {
    designerLogo: "",
    fullName: "",
    city: "",
    area: "",
    specialization: "",
    yearsExperience: 0,
    instagram: "",
    email: "",
    phone: "",
    totalDeals: 0,
    totalDealAmount: 0,
    lotteryEntries: 0,
    lotteryWins: 0,
    eventsAttended: 0,
    joinDate: "",
    rank: 0,
};

// Suppliers populated from API
type SupplierItem = {
    id: string; name: string; category: string; city: string; area: string;
    description: string; phone: string; email: string; contactPerson: string;
    address: string; areas: string[]; averageRating: number; ratingCount: number;
    recommendationCount: number; dealsCount: number; workedWithMe: boolean;
    isCommunity: boolean; isVerified: boolean; logo: string;
};

// Deal history populated from API
type DealHistoryItem = {
    id: string; supplier: string; amount: number; date: string;
    status: string; rating: number | null;
};

type TabKey = "home" | "suppliers" | "deals" | "history" | "profile" | "card" | "account-settings" | "clients" | "crm-suppliers" | "workflows" | "templates" | "whatsapp" | "webhooks" | "crm-settings" | "contracts" | "calendar" | "projects" | "scheduler" | "quotes" | "time-tracking" | "surveys" | "approvals" | "before-after" | "handoff" | "onboarding" | "style-quiz" | "chat" | "portfolio";

interface NavGroup {
  title: string;
  items: { key: TabKey; label: string; icon: typeof Home }[];
}

const navGroups: NavGroup[] = [
  {
    title: "ראשי",
    items: [
      { key: "home", label: "הבית שלי", icon: Home },
      { key: "profile", label: "פרופיל", icon: User },
      { key: "card", label: "כרטיס ביקור", icon: CreditCard },
      { key: "account-settings", label: "הגדרות חשבון", icon: Settings },
    ]
  },
  {
    title: "קהילה",
    items: [
      { key: "suppliers", label: "ספריית ספקים", icon: Search },
      { key: "deals", label: "דיווח עסקה", icon: HandCoins },
      { key: "history", label: "היסטוריה", icon: History },
    ]
  },
  {
    title: "CRM",
    items: [
      { key: "clients", label: "לקוחות", icon: Users },
      { key: "projects", label: "פרויקטים", icon: FileText },
      { key: "contracts", label: "חוזים", icon: FileText },
      { key: "quotes", label: "הצעות מחיר", icon: CreditCard },
      { key: "calendar", label: "יומן", icon: CalendarIcon },
      { key: "scheduler", label: "לוח זמנים", icon: CalendarIcon },
      { key: "time-tracking", label: "מעקב שעות", icon: Clock },
      { key: "chat", label: "צ׳אט", icon: MessageCircle },
    ]
  },
  {
    title: "עיצוב",
    items: [
      { key: "portfolio", label: "תיק עבודות", icon: FolderKanban },
      { key: "before-after", label: "לפני/אחרי", icon: Grid3X3 },
      { key: "style-quiz", label: "שאלון סגנון", icon: Star },
      { key: "crm-suppliers", label: "ספקים שלי", icon: Building2 },
    ]
  },
  {
    title: "ניהול",
    items: [
      { key: "approvals", label: "אישורים", icon: CheckCircle2 },
      { key: "onboarding", label: "קליטת לקוח", icon: Users },
      { key: "handoff", label: "מסירה", icon: CheckCircle2 },
      { key: "surveys", label: "סקרים", icon: Star },
      { key: "workflows", label: "תבניות עבודה", icon: Workflow },
      { key: "templates", label: "תבניות הודעות", icon: MessageSquare },
      { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
      { key: "webhooks", label: "Webhooks", icon: Zap },
      { key: "crm-settings", label: "הגדרות CRM", icon: Settings },
    ]
  },
];

const ALL_DESIGNER_FILTER = "__ALL__";

export default function DesignerDashboard() {
    const routeParams = useParams<{ id: string }>();
    const designerIdForGate = routeParams?.id || undefined;

    // Designer profile state — loaded from API
    const [designerData, setDesignerData] = useState(EMPTY_DESIGNER_DATA);
    const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
    const [dealHistory, setDealHistory] = useState<DealHistoryItem[]>([]);
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileError, setProfileError] = useState<string | null>(null);

    useEffect(() => {
        if (!designerIdForGate) return;
        let cancelled = false;

        async function fetchDesignerProfile() {
            setProfileLoading(true);
            try {
                const res = await fetch(`/api/designer/profile?id=${designerIdForGate}`);
                if (res.ok) {
                    const data = await res.json();
                    if (!cancelled) {
                        if (data.profile) setDesignerData(data.profile);
                        if (data.suppliers) setSuppliers(data.suppliers);
                        if (data.dealHistory) setDealHistory(data.dealHistory);
                        setProfileError(null);
                    }
                } else {
                    if (!cancelled) setProfileError("שגיאה בטעינת פרופיל");
                }
            } catch {
                if (!cancelled) setProfileError("שגיאה בטעינת פרופיל");
            } finally {
                if (!cancelled) setProfileLoading(false);
            }
        }

        fetchDesignerProfile();
        return () => { cancelled = true; };
    }, [designerIdForGate]);

    const [activeTab, setActiveTab] = useState<TabKey>("home");
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState(ALL_DESIGNER_FILTER);
    const [areaFilter, setAreaFilter] = useState(ALL_DESIGNER_FILTER);
    const [sortBy, setSortBy] = useState("recommendations");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [showDealModal, setShowDealModal] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<SupplierItem | null>(null);
    const [projectView, setProjectView] = useState<"list" | "kanban">("list");

    const filteredSuppliers = suppliers
        .filter((s) => {
            const matchSearch = !search || s.name.includes(search) || s.description.includes(search) || s.city.includes(search);
            const matchCategory = categoryFilter === ALL_DESIGNER_FILTER || s.category === categoryFilter;
            const matchArea = areaFilter === ALL_DESIGNER_FILTER || s.area === areaFilter;
            return matchSearch && matchCategory && matchArea;
        })
        .sort((a, b) => {
            if (sortBy === "recommendations") return b.recommendationCount - a.recommendationCount;
            if (sortBy === "deals") return b.dealsCount - a.dealsCount;
            return a.name.localeCompare(b.name, "he");
        });

    // Find active tab label for header
    const activeLabel = navGroups.flatMap(g => g.items).find(i => i.key === activeTab)?.label || "";

    if (profileLoading) {
      return (
        <div className="min-h-screen bg-bg flex items-center justify-center" dir="rtl">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-text-muted text-sm">טוען פרופיל...</p>
          </div>
        </div>
      );
    }

    if (profileError) {
      return (
        <div className="min-h-screen bg-bg flex items-center justify-center" dir="rtl">
          <div className="text-center">
            <p className="text-red-400 text-sm mb-3">{profileError}</p>
            <button onClick={() => window.location.reload()} className="btn-gold px-4 py-2 rounded-lg text-sm">נסה שוב</button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-bg">
        {/* Terms consent modal — shows if not yet accepted */}
        <TermsConsentModal />
        {/* Push notification permission banner */}
        <PushNotificationManager />
        {/* ============ SIDEBAR ============ */}
        {/* Mobile overlay */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        <aside className={`
          fixed top-0 right-0 h-screen z-50
          sidebar-premium
          border-l border-border-subtle
          overflow-y-auto overflow-x-hidden
          transition-all duration-300 ease-out
          ${sidebarOpen ? "w-[260px]" : "w-[72px]"}
          max-md:w-[280px] max-md:shadow-xl
          ${mobileSidebarOpen ? "max-md:translate-x-0" : "max-md:translate-x-full"}
        `}>
          {/* Sidebar Header */}
          <div className="flex items-center justify-between px-4 h-16 border-b border-border-subtle">
            {sidebarOpen && <Logo size="sm" />}
            <button
              onClick={() => {
                setSidebarOpen(!sidebarOpen);
                setMobileSidebarOpen(false);
              }}
              className="p-2 rounded-lg hover:bg-bg-surface transition-colors text-text-muted hover:text-text-primary"
            >
              {sidebarOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Designer Mini Profile */}
          {sidebarOpen && (
            <div className="px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="avatar-gold flex-shrink-0">
                  {designerData.designerLogo ? (
                    <div className="w-10 h-10 rounded-full border-2 border-gold overflow-hidden" style={{ boxShadow: '0 0 20px rgba(201, 168, 76, 0.3)' }}>
                      <Image src={designerData.designerLogo} alt={designerData.fullName} width={40} height={40} className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center border-2 border-gold" style={{ boxShadow: '0 0 20px rgba(201, 168, 76, 0.3)' }}>
                      <span className="text-sm font-heading font-bold text-gold">
                        {designerData.fullName.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{designerData.fullName}</p>
                  <p className="text-xs text-text-muted">{designerData.specialization}</p>
                </div>
              </div>
              <div className="sidebar-divider-premium mt-4" />
            </div>
          )}

          {/* Navigation Groups */}
          <nav className="py-3 px-2">
            {navGroups.map((group, gi) => (
              <div key={gi} className="mb-1">
                {sidebarOpen && (
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-text-faint px-3 pt-4 pb-1.5">
                    {group.title}
                  </p>
                )}
                {!sidebarOpen && gi > 0 && (
                  <div className="sidebar-divider-premium mx-2 my-2" />
                )}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        setActiveTab(item.key);
                        setMobileSidebarOpen(false);
                      }}
                      className={`
                        sidebar-item-premium
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm min-h-[44px]
                        transition-all duration-200 ease-out
                        ${isActive
                          ? "active bg-gradient-to-l from-gold/10 to-transparent text-gold font-semibold border-r-2 border-gold"
                          : "text-text-muted hover:bg-bg-surface hover:text-text-primary"
                        }
                        ${!sidebarOpen ? "justify-center px-0" : ""}
                      `}
                      title={!sidebarOpen ? item.label : undefined}
                    >
                      <Icon className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${isActive ? "text-gold" : ""}`} />
                      {sidebarOpen && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* sidebar footer spacer */}
        </aside>

        {/* ============ HEADER ============ */}
        <header className={`
          fixed top-0 left-0 h-16 z-30
          bg-white/80 backdrop-blur-2xl
          border-b border-border-subtle/50
          flex items-center justify-between px-3 sm:px-6
          transition-all duration-300 ease-out
          ${sidebarOpen ? "right-[260px]" : "right-[72px]"}
          max-md:right-0
        `}>
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-bg-surface text-text-muted"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              {/* Breadcrumb */}
              <div className="breadcrumb hidden sm:flex">
                <span onClick={() => setActiveTab("home")} className="cursor-pointer hover:text-gold transition-colors">{txt("src/app/designer/[id]/page.tsx::048", "הכל")}</span>
                <span className="mx-1.5 text-text-faint">/</span>
                <span className="text-gold font-medium">{activeLabel}</span>
              </div>
              <h1 className="text-lg font-heading font-bold text-text-primary leading-tight sm:hidden">{activeLabel}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Global Search */}
            <div className="hidden md:block relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint" />
              <input
                type="text"
                placeholder={txt("src/app/designer/[id]/page.tsx::049", "חיפוש...")}
                className="search-global"
              />
            </div>
            {/* Notification Bell — מתחבר ל־/api/notifications, polling כל 60 שניות */}
            {designerIdForGate ? (
              <NotificationBell userId={designerIdForGate} userType="designer" />
            ) : (
              <button className="relative p-2 rounded-lg hover:bg-bg-surface transition-colors text-text-muted hover:text-text-primary" aria-label="התראות">
                <Bell className="w-5 h-5" />
              </button>
            )}
            {/* User Badge */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-text-muted bg-bg-surface/80 rounded-xl px-3 py-2 backdrop-blur-sm">
              {designerData.designerLogo ? (
                <div className="w-6 h-6 rounded-full border border-gold overflow-hidden flex-shrink-0" style={{ boxShadow: '0 0 10px rgba(201, 168, 76, 0.2)' }}>
                  <Image src={designerData.designerLogo} alt={designerData.fullName} width={24} height={24} className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
              <span className="font-medium">{designerData.fullName}</span>
            </div>
          </div>
        </header>

        {/* ============ MAIN CONTENT ============ */}
        <main className={`
          pt-16 min-h-screen
          transition-all duration-300 ease-out
          ${sidebarOpen ? "mr-[260px]" : "mr-[72px]"}
          max-md:mr-0
        `}>
          <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8">

            {/* ===== HOME TAB ===== */}
            {activeTab === "home" && (
              <div className="space-y-8 animate-in">
                {/* Welcome — Gradient Text */}
                <div>
                  <h2 className="text-2xl sm:text-3xl font-heading font-bold">
                    <span className="text-gradient-gold">{txt("src/app/designer/[id]/page.tsx::051", "שלום")}{" "}{designerData.fullName.split(" ")[0]}</span> 👋
                  </h2>
                  <p className="text-text-muted text-sm mt-2">
                    הנה סקירה של מה קורה היום
                  </p>
                </div>

                {/* KPI Cards — Premium with count-up animation */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { icon: HandCoins, color: "text-gold", bg: "bg-gradient-to-br from-gold/15 to-gold/5", label: txt("src/app/designer/[id]/page.tsx::052", "העסקאות שלי"), value: designerData.totalDeals, sub: formatCurrency(designerData.totalDealAmount), trend: "+3" },
                    { icon: Trophy, color: "text-purple-600", bg: "bg-gradient-to-br from-purple-100 to-purple-50", label: txt("src/app/designer/[id]/page.tsx::053", "הגרלות"), value: designerData.lotteryEntries, sub: designerData.lotteryWins > 0 ? `זכית ${designerData.lotteryWins} פעמים!` : txt("src/app/designer/[id]/page.tsx::054", "בהצלחה בהגרלה הבאה!"), trend: "+2" },
                    { icon: CalendarIcon, color: "text-blue-600", bg: "bg-gradient-to-br from-blue-100 to-blue-50", label: txt("src/app/designer/[id]/page.tsx::055", "אירועים קרובים"), value: "2", sub: txt("src/app/designer/[id]/page.tsx::056", "הירשמי עכשיו"), trend: null },
                    { icon: Heart, color: "text-pink-600", bg: "bg-gradient-to-br from-pink-100 to-pink-50", label: txt("src/app/designer/[id]/page.tsx::057", "אני ובקהילה"), value: `#${designerData.rank}`, sub: `מאז ${designerData.joinDate}`, trend: null },
                  ].map((card, i) => (
                    <div key={i} className={`card-premium text-center stagger-${i + 1} animate-in hover-lift`}>
                      <div className={`w-12 h-12 rounded-2xl ${card.bg} flex items-center justify-center mx-auto mb-3`}>
                        <card.icon className={`w-5 h-5 ${card.color}`} />
                      </div>
                      <p className="text-text-muted text-xs">{card.label}</p>
                      <p className="stat-number mt-1 animate-count-up">{card.value}</p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        {card.trend && (
                          <span className="text-emerald-600 text-xs font-semibold flex items-center gap-0.5">
                            <TrendingUp className="w-3 h-3" />{card.trend}
                          </span>
                        )}
                        <p className="text-text-faint text-xs">{card.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Monthly Progress Bar */}
                <div className="card-glass">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-gold" />
                      <h3 className="text-sm font-semibold text-text-primary">{txt("src/app/designer/[id]/page.tsx::060", "התקדמות חודשית")}</h3>
                    </div>
                    <span className="text-xs font-mono text-gold font-bold">{designerData.totalDeals}/15 {txt("src/app/designer/[id]/page.tsx::061", "עסקאות")}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${Math.min((designerData.totalDeals / 15) * 100, 100)}%` }} />
                  </div>
                  <p className="text-text-faint text-xs mt-2">{txt("src/app/designer/[id]/page.tsx::062", "עוד 3 עסקאות להשגת היעד החודשי!")}</p>
                </div>

                {/* ===== ANALYTICS DASHBOARD ===== */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-text-muted flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#c9a84c]" />
                    אנליטיקות
                  </h3>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Monthly Revenue Chart */}
                    <div className="bg-[#13132b] rounded-2xl border border-white/10 p-5">
                      <h4 className="text-sm font-bold text-white mb-4">הכנסות חודשיות</h4>
                      <div className="flex items-end justify-between gap-2 h-40">
                        {[
                          { month: "אוק׳", value: 32000 },
                          { month: "נוב׳", value: 45000 },
                          { month: "דצמ׳", value: 38000 },
                          { month: "ינו׳", value: 52000 },
                          { month: "פבר׳", value: 48000 },
                          { month: "מרץ", value: 61000 },
                        ].map((m, i) => {
                          const maxVal = 65000;
                          const pct = (m.value / maxVal) * 100;
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                              <span className="text-[10px] text-[#c9a84c] font-mono">{(m.value / 1000).toFixed(0)}K</span>
                              <div className="w-full flex justify-center" style={{ height: "120px" }}>
                                <div
                                  className="w-8 rounded-t-lg transition-all duration-500"
                                  style={{
                                    height: `${pct}%`,
                                    background: "linear-gradient(to top, #c9a84c, #e8d48b)",
                                    boxShadow: "0 0 12px rgba(201,168,76,0.3)",
                                  }}
                                />
                              </div>
                              <span className="text-[10px] text-white/50">{m.month}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Projects by Status */}
                    <div className="bg-[#13132b] rounded-2xl border border-white/10 p-5">
                      <h4 className="text-sm font-bold text-white mb-4">פרויקטים לפי סטטוס</h4>
                      <div className="flex items-center justify-center mb-4">
                        {/* CSS pie-like bar visualization */}
                        <div className="w-full h-6 rounded-full overflow-hidden flex" style={{ direction: "ltr" }}>
                          <div className="h-full bg-emerald-500 transition-all" style={{ width: "40%" }} />
                          <div className="h-full bg-[#c9a84c] transition-all" style={{ width: "35%" }} />
                          <div className="h-full bg-amber-600 transition-all" style={{ width: "25%" }} />
                        </div>
                      </div>
                      <div className="flex justify-center gap-6 text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <span className="text-white/70">בתהליך (40%)</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#c9a84c]" />
                          <span className="text-white/70">ממתין (35%)</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                          <span className="text-white/70">הושלם (25%)</span>
                        </span>
                      </div>

                      {/* Extra Stats */}
                      <div className="grid grid-cols-2 gap-3 mt-5">
                        <div className="bg-white/5 rounded-xl p-3 text-center">
                          <p className="text-lg font-bold text-[#c9a84c]">45</p>
                          <p className="text-[10px] text-white/50">ימים ממוצע לפרויקט</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 text-center">
                          <p className="text-lg font-bold text-emerald-400">4.8</p>
                          <p className="text-[10px] text-white/50">שביעות רצון לקוחות</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions — Premium with glow */}
                <div>
                  <h3 className="text-sm font-semibold text-text-muted mb-3">פעולות מהירות</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { key: "suppliers" as TabKey, icon: Search, label: txt("src/app/designer/[id]/page.tsx::058", "חפשי ספק") },
                      { key: "deals" as TabKey, icon: Plus, label: txt("src/app/designer/[id]/page.tsx::059", "דווחי על עסקה") },
                      { key: "clients" as TabKey, icon: Users, label: "הלקוחות שלי" },
                      { key: "whatsapp" as TabKey, icon: MessageCircle, label: "WhatsApp" },
                    ].map((action) => (
                      <button
                        key={action.key}
                        onClick={() => setActiveTab(action.key)}
                        className="card-glass group text-center py-5 hover-lift cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold/15 to-gold/5 flex items-center justify-center mx-auto mb-2 group-hover:shadow-gold transition-shadow duration-300">
                          <action.icon className="w-5 h-5 text-gold transition-transform duration-200 group-hover:scale-110" />
                        </div>
                        <p className="font-medium text-sm text-text-primary">{action.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mini Portfolio — with logo watermark */}
                <div>
                  <h3 className="text-sm font-semibold text-text-muted mb-3">{txt("src/app/designer/[id]/page.tsx::200", "פרויקטים אחרונים")}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { title: txt("src/app/designer/[id]/page.tsx::201", "סלון מודרני"), color: "from-amber-100 to-orange-50" },
                      { title: txt("src/app/designer/[id]/page.tsx::202", "מטבח סקנדינבי"), color: "from-blue-100 to-indigo-50" },
                      { title: txt("src/app/designer/[id]/page.tsx::203", "חדר שינה"), color: "from-emerald-100 to-teal-50" },
                      { title: txt("src/app/designer/[id]/page.tsx::204", "בית קפה"), color: "from-pink-100 to-rose-50" },
                    ].map((project, i) => (
                      <div key={i} className="relative rounded-xl overflow-hidden group cursor-pointer hover-lift">
                        <div className={`bg-gradient-to-br ${project.color} h-32 flex items-center justify-center`}>
                          <span className="text-xs font-medium text-text-muted">{project.title}</span>
                        </div>
                        {/* Logo Watermark */}
                        {designerData.designerLogo && (
                          <div style={{ position: 'absolute', bottom: 8, right: 8, opacity: 0.15, width: 40, height: 40 }}>
                            <Image src={designerData.designerLogo} alt="לוגו המעצבת" width={40} height={40} className="w-full h-full object-contain" />
                          </div>
                        )}
                        {!designerData.designerLogo && (
                          <div style={{ position: 'absolute', bottom: 8, right: 8, opacity: 0.15, width: 40, height: 40 }} className="flex items-center justify-center rounded-full bg-gold/30">
                            <span className="text-lg font-heading font-bold text-gold">{designerData.fullName.charAt(0)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Digital Signature Preview */}
                <div className="card-glass">
                  <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gold" />
                    {txt("src/app/designer/[id]/page.tsx::210", "חתימה דיגיטלית")}
                  </h3>
                  <div className="bg-white rounded-xl border border-border-subtle p-5 space-y-3 max-w-sm mx-auto">
                    {/* Letterhead style preview */}
                    <div className="flex items-center gap-3 pb-3 border-b border-border-subtle">
                      {designerData.designerLogo ? (
                        <div className="w-10 h-10 rounded-full border-2 border-gold overflow-hidden flex-shrink-0" style={{ boxShadow: '0 0 12px rgba(201, 168, 76, 0.2)' }}>
                          <Image src={designerData.designerLogo} alt={designerData.fullName} width={40} height={40} className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center border-2 border-gold flex-shrink-0" style={{ boxShadow: '0 0 12px rgba(201, 168, 76, 0.2)' }}>
                          <span className="text-sm font-heading font-bold text-gold">{designerData.fullName.charAt(0)}</span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-heading font-bold text-text-primary">{designerData.fullName}</p>
                        <p className="text-xs text-text-muted">{designerData.specialization}</p>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs text-text-muted">
                      <p className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-gold" /> {designerData.phone}</p>
                      <p className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-gold" /> {designerData.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const sig = `${designerData.fullName}\n${designerData.specialization}\n${designerData.phone}\n${designerData.email}`;
                      navigator.clipboard.writeText(sig);
                    }}
                    className="btn-outline text-sm py-2 mt-4 flex items-center justify-center gap-2 w-full sm:w-auto mx-auto"
                  >
                    <Copy className="w-4 h-4" />
                    {txt("src/app/designer/[id]/page.tsx::211", "העתק חתימה")}
                  </button>
                </div>

                {/* Activity Feed — Recent 3 */}
                <div className="card-glass">
                  <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gold" />
                    {txt("src/app/designer/[id]/page.tsx::063b", "פעילות אחרונות")}
                  </h3>
                  <div className="space-y-3">
                    {[
                      { text: txt("src/app/designer/[id]/page.tsx::064b", "עסקה חדשה עם סטון דיזיין"), time: txt("src/app/designer/[id]/page.tsx::065b", "לפני 3 שעות"), color: "bg-gold" },
                      { text: txt("src/app/designer/[id]/page.tsx::066b", "נרשמת לאירוע נטוורקינג"), time: txt("src/app/designer/[id]/page.tsx::067b", "אתמול"), color: "bg-blue-500" },
                      { text: txt("src/app/designer/[id]/page.tsx::068b", "דירוג 5 כוכבים לקיטשן פלוס"), time: txt("src/app/designer/[id]/page.tsx::069b", "אתמול"), color: "bg-emerald-500" },
                    ].map((activity, i) => (
                      <div key={i} className="flex items-center gap-3 group">
                        <div className="relative flex-shrink-0">
                          <div className={`timeline-dot ${activity.color}`} />
                          {i < 2 && <div className="timeline-line" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary truncate">{activity.text}</p>
                          <p className="text-xs text-text-faint">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ===== SUPPLIERS TAB ===== */}
            {activeTab === "suppliers" && (
              <div className="space-y-6 animate-in">
                <div className="card-static">
                  <div className="relative mb-4">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      type="text"
                      placeholder="חפשי ספק לפי שם, מוצר, או עיר..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="input-field pr-12 text-base py-3"
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="select-field text-sm">
                      <option value={ALL_DESIGNER_FILTER}>{txt("src/app/designer/[id]/page.tsx::063", "כל האזורים")}</option>
                      {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="select-field text-sm">
                      <option value={ALL_DESIGNER_FILTER}>{txt("src/app/designer/[id]/page.tsx::065", "כל הקטגוריות")}</option>
                      {SUPPLIER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="select-field text-sm">
                      <option value="recommendations">{txt("src/app/designer/[id]/page.tsx::067", "הכי ממליצות")}</option>
                      <option value="deals">{txt("src/app/designer/[id]/page.tsx::068", "הכי עסקאות")}</option>
                      <option value="name">{txt("src/app/designer/[id]/page.tsx::069", "שם א-ב")}</option>
                    </select>
                    <div className="flex items-center justify-between">
                      <p className="text-text-muted text-sm">{filteredSuppliers.length} ספקים</p>
                      <div className="flex gap-1">
                        <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-gold/10 text-gold" : "text-text-muted hover:text-text-primary"}`}>
                          <Grid3X3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-gold/10 text-gold" : "text-text-muted hover:text-text-primary"}`}>
                          <List className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {(categoryFilter !== ALL_DESIGNER_FILTER || areaFilter !== ALL_DESIGNER_FILTER || search) && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {search && <span className="badge-gold flex items-center gap-1">&ldquo;{search}&rdquo; <X className="w-3 h-3 cursor-pointer" onClick={() => setSearch("")} /></span>}
                      {categoryFilter !== ALL_DESIGNER_FILTER && <span className="badge-gold flex items-center gap-1">{categoryFilter} <X className="w-3 h-3 cursor-pointer" onClick={() => setCategoryFilter(ALL_DESIGNER_FILTER)} /></span>}
                      {areaFilter !== ALL_DESIGNER_FILTER && <span className="badge-gold flex items-center gap-1">{areaFilter} <X className="w-3 h-3 cursor-pointer" onClick={() => setAreaFilter(ALL_DESIGNER_FILTER)} /></span>}
                    </div>
                  )}
                </div>

                {/* Supplier Cards */}
                <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
                  {filteredSuppliers.map((supplier) => (
                    <div key={supplier.id} className={`group cursor-pointer ${supplier.isCommunity ? "card-gold border-2 border-gold/30" : "card-static"}`}>
                      {/* Community badge */}
                      {supplier.isCommunity && (
                        <div className="flex items-center gap-1.5 mb-3">
                          <span className="inline-flex items-center gap-1 bg-gold/10 text-gold text-[10px] font-bold px-2.5 py-1 rounded-full border border-gold/20">
                            <ShieldCheck className="w-3 h-3" /> ספק קהילה
                          </span>
                          {supplier.isVerified && (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> מאומת
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex items-start gap-3 mb-3">
                        {/* Logo: show branded logo for community, simple initial for non-community */}
                        {supplier.isCommunity ? (
                          supplier.logo ? (
                            <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 border-2 border-gold overflow-hidden" style={{ boxShadow: '0 0 12px rgba(201, 168, 76, 0.2)' }}>
                              <Image src={supplier.logo} alt={supplier.name} width={56} height={56} className="w-full h-full object-contain" />
                            </div>
                          ) : (
                            <div className="w-14 h-14 bg-gradient-to-br from-gold/20 to-gold/5 rounded-xl flex items-center justify-center flex-shrink-0 border-2 border-gold" style={{ boxShadow: '0 0 12px rgba(201, 168, 76, 0.2)' }}>
                              <span className="text-xl font-heading font-bold text-gold">{supplier.name[0]}</span>
                            </div>
                          )
                        ) : (
                          <div className="w-14 h-14 bg-bg-surface rounded-xl flex items-center justify-center flex-shrink-0 border border-border-subtle">
                            <span className="text-xl font-heading font-bold text-text-muted">{supplier.name[0]}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-heading text-text-primary text-base font-bold truncate">{supplier.name}</h3>
                          <span className="badge-gold text-[10px]">{supplier.category}</span>
                          <div className="flex items-center gap-1 text-text-muted text-xs mt-1">
                            <MapPin className="w-3 h-3" /> {supplier.city}
                          </div>
                        </div>
                        {supplier.workedWithMe && (
                          <span className="badge-green text-[10px] whitespace-nowrap">
                            <CheckCircle2 className="w-3 h-3" />{txt("src/app/designer/[id]/page.tsx::077", "עבדתי איתם")}
                          </span>
                        )}
                      </div>

                      <p className="text-text-muted text-sm leading-relaxed mb-3 line-clamp-2">{supplier.description}</p>

                      {/* Contact & details section */}
                      <div className="space-y-1.5 mb-3 text-xs text-text-muted">
                        {supplier.contactPerson && (
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-text-faint" />
                            <span>{supplier.contactPerson}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-text-faint" />
                          <span dir="ltr">{supplier.phone}</span>
                        </div>
                        {supplier.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-text-faint" />
                            <span dir="ltr">{supplier.email}</span>
                          </div>
                        )}
                        {supplier.address && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-text-faint" />
                            <span>{supplier.address}</span>
                          </div>
                        )}
                      </div>

                      {/* Areas of activity */}
                      {supplier.areas && supplier.areas.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          <span className="text-[10px] text-text-faint">אזורי פעילות:</span>
                          {supplier.areas.map((a) => (
                            <span key={a} className="text-[10px] bg-bg-surface text-text-muted px-1.5 py-0.5 rounded">{a}</span>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-4 text-xs text-text-muted mb-4">
                        <span>{supplier.recommendationCount} {txt("src/app/designer/[id]/page.tsx::078", "ממליצות")}</span>
                        <span>{supplier.dealsCount} {txt("src/app/designer/[id]/page.tsx::079", "עסקאות")}</span>
                      </div>

                      <div className="flex gap-2">
                        <a href={`https://wa.me/972${supplier.phone.slice(1)}`} target="_blank" rel="noopener noreferrer"
                          className="flex-1 bg-emerald-600 text-white rounded-lg py-2.5 text-sm text-center flex items-center justify-center gap-1.5 hover:bg-emerald-500 transition-all duration-200 font-medium">
                          <MessageCircle className="w-4 h-4" />{txt("src/app/designer/[id]/page.tsx::080", "וואטסאפ")}
                        </a>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedSupplier(supplier); setShowDealModal(true); }}
                          className="flex-1 btn-outline text-sm py-2.5 flex items-center justify-center gap-1.5">
                          <Plus className="w-4 h-4" />{txt("src/app/designer/[id]/page.tsx::081", "דווח עסקה")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ===== DEALS TAB ===== */}
            {activeTab === "deals" && (
              <div className="space-y-6 animate-in max-w-lg mx-auto">
                <div className="card-static space-y-4">
                  <div>
                    <label className="form-label">{txt("src/app/designer/[id]/page.tsx::083", "ספק")}</label>
                    <select className="select-field">
                      <option value="">{txt("src/app/designer/[id]/page.tsx::084", "בחרי ספק...")}</option>
                      {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">{txt("src/app/designer/[id]/page.tsx::085", "סכום העסקה (₪)")}</label>
                    <input type="number" className="input-field" placeholder="0" dir="ltr" />
                  </div>
                  <div>
                    <label className="form-label">{txt("src/app/designer/[id]/page.tsx::086", "תיאור קצר")}</label>
                    <input type="text" className="input-field" placeholder="מה הוזמן?" />
                  </div>
                  <div>
                    <label className="form-label">{txt("src/app/designer/[id]/page.tsx::088", "תאריך העסקה")}</label>
                    <input type="date" className="input-field" dir="ltr" />
                  </div>
                  <div>
                    <label className="form-label">{txt("src/app/designer/[id]/page.tsx::090", "הערות (אופציונלי — אנונימי)")}</label>
                    <textarea className="input-field h-20 resize-none" placeholder="שתפי את החוויה שלך..." />
                  </div>
                  <button className="btn-gold w-full">{txt("src/app/designer/[id]/page.tsx::092", "שלח דיווח")}</button>
                  <p className="text-text-muted text-xs text-center">{txt("src/app/designer/[id]/page.tsx::093", "הספק יתבקש לאשר את העסקה. לאחר אישור תיכנסי להגרלה החודשית!")}</p>
                </div>
              </div>
            )}

            {/* ===== HISTORY TAB ===== */}
            {activeTab === "history" && (
              <div className="space-y-6 animate-in">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="card-static text-center">
                    <p className="stat-number">{dealHistory.length}</p>
                    <p className="text-text-muted text-xs mt-1">{txt("src/app/designer/[id]/page.tsx::095", "עסקאות")}</p>
                  </div>
                  <div className="card-static text-center">
                    <p className="stat-number text-emerald-600">\u20AA{dealHistory.reduce((s, d) => s + d.amount, 0).toLocaleString()}</p>
                    <p className="text-text-muted text-xs mt-1">{txt("src/app/designer/[id]/page.tsx::096", "סה״כ")}</p>
                  </div>
                  <div className="card-static text-center">
                    <p className="stat-number text-purple-600">{designerData.lotteryEntries}</p>
                    <p className="text-text-muted text-xs mt-1">{txt("src/app/designer/[id]/page.tsx::097", "הגרלות")}</p>
                  </div>
                  <div className="card-static text-center">
                    <p className="stat-number text-blue-600">{designerData.eventsAttended}</p>
                    <p className="text-text-muted text-xs mt-1">{txt("src/app/designer/[id]/page.tsx::098", "אירועים")}</p>
                  </div>
                </div>

                <div className="card-static">
                  <h3 className="text-base font-heading text-text-primary mb-4">{txt("src/app/designer/[id]/page.tsx::099", "עסקאות")}</h3>
                  <div className="space-y-2">
                    {dealHistory.map(deal => (
                      <div key={deal.id} className="flex items-center justify-between p-3 bg-bg-surface rounded-lg hover:bg-bg-surface-2 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gold/8 flex items-center justify-center">
                            <HandCoins className="w-4 h-4 text-gold" />
                          </div>
                          <div>
                            <p className="text-text-primary text-sm font-medium">{deal.supplier}</p>
                            <p className="text-text-faint text-xs">{deal.date}</p>
                          </div>
                        </div>
                        <div className="text-left flex items-center gap-3">
                          <span className="font-mono font-semibold text-sm">\u20AA{deal.amount.toLocaleString()}</span>
                          {deal.status === "confirmed"
                            ? <span className="badge-green"><CheckCircle2 className="w-3 h-3" />{txt("src/app/designer/[id]/page.tsx::100", "מאושר")}</span>
                            : <span className="badge-yellow"><Clock className="w-3 h-3" />{txt("src/app/designer/[id]/page.tsx::101", "ממתין")}</span>
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card-static">
                  <h3 className="text-base font-heading text-text-primary mb-4">{txt("src/app/designer/[id]/page.tsx::102", "הגרלות")}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-bg-surface rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                          <Trophy className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-text-primary text-sm font-medium">{txt("src/app/designer/[id]/page.tsx::103", "הגרלת מרץ 2026")}</p>
                          <p className="text-text-faint text-xs">{txt("src/app/designer/[id]/page.tsx::104", "שובר ספא 500 ₪")}</p>
                        </div>
                      </div>
                      <span className="badge-gold">{txt("src/app/designer/[id]/page.tsx::105", "משתתפת")}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-bg-surface rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gold/8 flex items-center justify-center">
                          <Star className="w-4 h-4 text-gold" />
                        </div>
                        <div>
                          <p className="text-text-primary text-sm font-medium">{txt("src/app/designer/[id]/page.tsx::106", "הגרלת פברואר 2026")}</p>
                          <p className="text-text-faint text-xs">{txt("src/app/designer/[id]/page.tsx::107", "כרטיס מתנה 300 ₪")}</p>
                        </div>
                      </div>
                      <span className="badge bg-gold text-white text-xs font-bold px-3 py-1 rounded-full">{txt("src/app/designer/[id]/page.tsx::108", "זכית!")}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===== CRM TABS ===== */}
            {activeTab === "clients" && (
              <FeatureGate feature="crm" designerId={designerIdForGate}><CrmClients /></FeatureGate>
            )}
            {activeTab === "crm-suppliers" && (
              <FeatureGate feature="crm" designerId={designerIdForGate}><CrmSuppliers /></FeatureGate>
            )}
            {activeTab === "whatsapp" && (
              <FeatureGate feature="crm" designerId={designerIdForGate}><CrmWhatsApp /></FeatureGate>
            )}
            {activeTab === "webhooks" && (
              <FeatureGate feature="crm" designerId={designerIdForGate}><CrmWebhooks /></FeatureGate>
            )}
            {activeTab === "templates" && (
              <FeatureGate feature="crm" designerId={designerIdForGate}><CrmTemplates /></FeatureGate>
            )}
            {activeTab === "crm-settings" && (
              <FeatureGate feature="crm" designerId={designerIdForGate}><CrmSettings /></FeatureGate>
            )}
            {activeTab === "workflows" && (
              <FeatureGate feature="crm" designerId={designerIdForGate}><CrmWorkflowTemplates /></FeatureGate>
            )}
            {activeTab === "contracts" && (
              <FeatureGate feature="contracts" designerId={designerIdForGate}><CrmContracts /></FeatureGate>
            )}
            {activeTab === "calendar" && (
              <FeatureGate feature="crm" designerId={designerIdForGate}><CrmCalendar /></FeatureGate>
            )}
            {activeTab === "projects" && (
              <FeatureGate feature="crm" designerId={designerIdForGate}>
              <div className="space-y-4 animate-in">
                {/* View toggle: list vs kanban */}
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={() => setProjectView("list")}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${projectView === "list" ? "bg-gold/15 text-gold font-semibold" : "text-text-muted hover:text-text-primary"}`}
                  >
                    <span className="flex items-center gap-1"><List className="w-3.5 h-3.5" /> רשימה</span>
                  </button>
                  <button
                    onClick={() => setProjectView("kanban")}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${projectView === "kanban" ? "bg-gold/15 text-gold font-semibold" : "text-text-muted hover:text-text-primary"}`}
                  >
                    <span className="flex items-center gap-1"><Grid3X3 className="w-3.5 h-3.5" /> קנבן</span>
                  </button>
                </div>
                {projectView === "list" ? <CrmProjects /> : <CrmKanban />}
              </div>
              </FeatureGate>
            )}
            {activeTab === "scheduler" && (
              <FeatureGate feature="crm" designerId={designerIdForGate}><CrmScheduler /></FeatureGate>
            )}
            {activeTab === "quotes" && (
              <FeatureGate feature="crm" designerId={designerIdForGate}><CrmQuotes /></FeatureGate>
            )}
            {activeTab === "time-tracking" && (
              <FeatureGate feature="crm" designerId={designerIdForGate}><CrmTimeTracking /></FeatureGate>
            )}
            {activeTab === "surveys" && (
              <FeatureGate feature="crm" designerId={designerIdForGate}><CrmSurveys /></FeatureGate>
            )}
            {activeTab === "approvals" && (
              <FeatureGate feature="crm" designerId={designerIdForGate}><CrmApprovals /></FeatureGate>
            )}
            {activeTab === "before-after" && (
              <FeatureGate feature="crm" designerId={designerIdForGate}><CrmBeforeAfter /></FeatureGate>
            )}
            {activeTab === "handoff" && (
              <FeatureGate feature="crm" designerId={designerIdForGate}><CrmHandoffChecklist /></FeatureGate>
            )}
            {activeTab === "onboarding" && (
              <FeatureGate feature="crm" designerId={designerIdForGate}><CrmOnboarding /></FeatureGate>
            )}
            {activeTab === "style-quiz" && (
              <FeatureGate feature="crm" designerId={designerIdForGate}><CrmStyleQuiz designerId={designerIdForGate || ""} /></FeatureGate>
            )}
            {activeTab === "chat" && (
              <FeatureGate feature="crm" designerId={designerIdForGate}><CrmChat /></FeatureGate>
            )}
            {activeTab === "portfolio" && (
              <FeatureGate feature="portfolio" designerId={designerIdForGate}>
                <div>
                  <CrmPortfolio onSwitchToCard={() => setActiveTab("card")} />
                </div>
              </FeatureGate>
            )}

            {/* ===== ACCOUNT SETTINGS TAB ===== */}
            {activeTab === "account-settings" && (
              <AccountSettings designerId={designerIdForGate || ""} />
            )}

            {/* ===== PROFILE TAB ===== */}
            {activeTab === "profile" && (
              <div className="space-y-6 animate-in max-w-2xl mx-auto">
                {/* Profile Logo Display */}
                <div className="card-glass flex flex-col items-center py-8">
                  <div className="relative">
                    {designerData.designerLogo ? (
                      <div className="w-24 h-24 rounded-full border-4 border-gold overflow-hidden animate-pulse-slow" style={{ boxShadow: '0 0 30px rgba(201, 168, 76, 0.4)' }}>
                        <Image src={designerData.designerLogo} alt={designerData.fullName} width={96} height={96} className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center border-4 border-gold" style={{ boxShadow: '0 0 30px rgba(201, 168, 76, 0.4)' }}>
                        <span className="text-3xl font-heading font-bold text-gold">{designerData.fullName.charAt(0)}</span>
                      </div>
                    )}
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gold text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">
                      {txt("src/app/designer/[id]/page.tsx::220", "בפרופיל הציבורי")}
                    </span>
                  </div>
                  <h2 className="text-lg font-heading font-bold text-text-primary mt-5">{designerData.fullName}</h2>
                  <p className="text-sm text-text-muted">{designerData.specialization} &middot; {designerData.city}</p>
                </div>

                <div className="card-static space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">{txt("src/app/designer/[id]/page.tsx::110", "שם מלא")}</label>
                      <input type="text" className="input-field" defaultValue={designerData.fullName} />
                    </div>
                    <div>
                      <label className="form-label flex items-center gap-1"><Phone className="w-3 h-3" />{txt("src/app/designer/[id]/page.tsx::111", "טלפון")}</label>
                      <input type="tel" className="input-field" defaultValue={designerData.phone} dir="ltr" />
                    </div>
                    <div>
                      <label className="form-label flex items-center gap-1"><Mail className="w-3 h-3" />{txt("src/app/designer/[id]/page.tsx::112", "מייל")}</label>
                      <input type="email" className="input-field" defaultValue={designerData.email} dir="ltr" />
                    </div>
                    <div>
                      <label className="form-label flex items-center gap-1"><MapPin className="w-3 h-3" />{txt("src/app/designer/[id]/page.tsx::113", "עיר")}</label>
                      <input type="text" className="input-field" defaultValue={designerData.city} />
                    </div>
                    <div>
                      <label className="form-label">{txt("src/app/designer/[id]/page.tsx::114", "התמחות")}</label>
                      <select className="select-field">
                        {[txt("src/app/designer/[id]/page.tsx::115", "עיצוב פנים"), txt("src/app/designer/[id]/page.tsx::116", "אדריכלות"), txt("src/app/designer/[id]/page.tsx::117", "נוף"), txt("src/app/designer/[id]/page.tsx::118", "הכל")].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">{txt("src/app/designer/[id]/page.tsx::119", "שנות ניסיון")}</label>
                      <input type="number" className="input-field" defaultValue={designerData.yearsExperience} />
                    </div>
                    <div>
                      <label className="form-label flex items-center gap-1"><Instagram className="w-3 h-3" />{txt("src/app/designer/[id]/page.tsx::120", "אינסטגרם")}</label>
                      <input type="text" className="input-field" defaultValue={designerData.instagram} dir="ltr" />
                    </div>
                    <div>
                      <label className="form-label flex items-center gap-1"><Globe className="w-3 h-3" />{txt("src/app/designer/[id]/page.tsx::121", "אתר אישי")}</label>
                      <input type="url" className="input-field" placeholder="https://..." dir="ltr" />
                    </div>
                  </div>

                  <button className="btn-gold flex items-center justify-center gap-2 w-full sm:w-auto">
                    <CheckCircle2 className="w-4 h-4" />{txt("src/app/designer/[id]/page.tsx::122", "שמור שינויים")}
                  </button>
                </div>
              </div>
            )}

            {/* ===== BUSINESS CARD TAB ===== */}
            {activeTab === "card" && (
              <FeatureGate feature="businessCard" designerId={designerIdForGate}>
              <div className="animate-in">
                <div className="mb-4">
                  <button
                    onClick={() => setActiveTab("portfolio")}
                    className="flex items-center gap-2 text-sm text-gold hover:text-gold/80 transition-colors"
                  >
                    <FolderKanban className="w-4 h-4" />
                    {"תיק עבודות \u2190"}
                  </button>
                </div>
                <BusinessCardBuilder userName={designerData.fullName} userRole={designerData.specialization} userPhone={designerData.phone} userEmail={designerData.email} />
              </div>
              </FeatureGate>
            )}
          </div>
        </main>

        {/* Deal Modal */}
        {showDealModal && selectedSupplier && (
          <div className="modal-overlay" onClick={() => setShowDealModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-heading text-text-primary">{txt("src/app/designer/[id]/page.tsx::123", "דיווח עסקה —")} {selectedSupplier.name}</h3>
                <button onClick={() => setShowDealModal(false)} className="p-1.5 rounded-lg hover:bg-bg-surface transition-colors">
                  <X className="w-5 h-5 text-text-muted" />
                </button>
              </div>
              <div className="space-y-3">
                <input type="number" className="input-field" placeholder="סכום העסקה (₪)" />
                <input type="text" className="input-field" placeholder="תיאור קצר" />
                <button onClick={() => setShowDealModal(false)} className="btn-gold w-full mt-2">{txt("src/app/designer/[id]/page.tsx::127", "שלח דיווח")}</button>
              </div>
            </div>
          </div>
        )}

        {/* ============ FLOATING ACTION BAR ============ */}
        <div className="floating-bar max-md:hidden">
          <button onClick={() => setActiveTab("deals")} className="floating-bar-btn" title={txt("src/app/designer/[id]/page.tsx::130", "דיווח עסקה")}>
            <HandCoins className="w-4 h-4" />
          </button>
          <button onClick={() => setActiveTab("clients")} className="floating-bar-btn" title={txt("src/app/designer/[id]/page.tsx::131", "לקוחות")}>
            <Users className="w-4 h-4" />
          </button>
          <button onClick={() => setActiveTab("suppliers")} className="floating-bar-btn-primary" title={txt("src/app/designer/[id]/page.tsx::132", "חיפוש")}>
            <Plus className="w-5 h-5" />
          </button>
          <button onClick={() => setActiveTab("whatsapp")} className="floating-bar-btn" title="WhatsApp">
            <MessageCircle className="w-4 h-4" />
          </button>
          <button onClick={() => setActiveTab("history")} className="floating-bar-btn" title={txt("src/app/designer/[id]/page.tsx::133", "היסטוריה")}>
            <History className="w-4 h-4" />
          </button>
        </div>

        {/* ============ CHATBOT ============ */}
        <ChatBot designerContext={{
          name: designerData.fullName,
          city: designerData.city,
          specialization: designerData.specialization,
          yearsExperience: designerData.yearsExperience,
          totalDeals: designerData.totalDeals,
          totalDealAmount: designerData.totalDealAmount,
          rank: designerData.rank,
          lotteryEntries: designerData.lotteryEntries,
          eventsAttended: designerData.eventsAttended,
          joinDate: designerData.joinDate,
        } as DesignerContext} />
      </div>
    );
}
