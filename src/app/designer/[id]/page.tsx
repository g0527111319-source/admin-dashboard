"use client";
import { txt } from "@/content/siteText";
import { useState } from "react";
import Logo from "@/components/ui/Logo";
import StarRating from "@/components/ui/StarRating";
import Image from "next/image";
import { HandCoins, Trophy, Calendar as CalendarIcon, Search, MapPin, MessageCircle, Plus, Grid3X3, List, Heart, X, Star, User, Clock, CheckCircle2, History, Phone, Mail, Globe, Instagram, CreditCard, Users, Settings, Building2, MessageSquare, Zap, ChevronLeft, ChevronRight, Menu, Home, Workflow, Bell, TrendingUp, Activity, FileText, Copy } from "lucide-react";
import CrmClients from "@/components/crm/CrmClients";
import CrmSettings from "@/components/crm/CrmSettings";
import CrmSuppliers from "@/components/crm/CrmSuppliers";
import CrmTemplates from "@/components/crm/CrmTemplates";
import CrmWhatsApp from "@/components/crm/CrmWhatsApp";
import CrmWebhooks from "@/components/crm/CrmWebhooks";
import CrmWorkflowTemplates from "@/components/crm/CrmWorkflowTemplates";
import ChatBot from "@/components/crm/ChatBot";
import type { DesignerContext } from "@/components/crm/ChatBot";
import BusinessCardBuilder from "@/components/business-card/BusinessCardBuilder";
import { SUPPLIER_CATEGORIES, AREAS, formatCurrency } from "@/lib/utils";

const designerData = {
    designerLogo: "",
    fullName: txt("src/app/designer/[id]/page.tsx::001", "\u05E0\u05D5\u05E2\u05D4 \u05DB\u05D4\u05E0\u05D5\u05D1\u05D9\u05E5'"),
    city: txt("src/app/designer/[id]/page.tsx::002", "\u05EA\u05DC \u05D0\u05D1\u05D9\u05D1"),
    area: txt("src/app/designer/[id]/page.tsx::003", "\u05DE\u05E8\u05DB\u05D6"),
    specialization: txt("src/app/designer/[id]/page.tsx::004", "\u05E2\u05D9\u05E6\u05D5\u05D1 \u05E4\u05E0\u05D9\u05DD"),
    yearsExperience: 8,
    instagram: "@noa.design",
    email: "noa@design.co.il",
    phone: "052-9876543",
    totalDeals: 12,
    totalDealAmount: 85000,
    lotteryEntries: 8,
    lotteryWins: 1,
    eventsAttended: 5,
    joinDate: "15.06.2024",
    rank: 47,
};

const demoSuppliers = [
    { id: "1", name: txt("src/app/designer/[id]/page.tsx::005", "\u05E1\u05D8\u05D5\u05DF \u05D3\u05D9\u05D6\u05D9\u05D9\u05DF"), category: txt("src/app/designer/[id]/page.tsx::006", "\u05E8\u05D9\u05E6\u05D5\u05E3 \u05D5\u05D7\u05D9\u05E4\u05D5\u05D9"), city: txt("src/app/designer/[id]/page.tsx::007", "\u05EA\u05DC \u05D0\u05D1\u05D9\u05D1"), area: txt("src/app/designer/[id]/page.tsx::008", "\u05DE\u05E8\u05DB\u05D6"), description: txt("src/app/designer/[id]/page.tsx::009", "\u05DE\u05D5\u05D1\u05D9\u05DC\u05D9\u05DD \u05D1\u05EA\u05D7\u05D5\u05DD \u05D4\u05E8\u05D9\u05E6\u05D5\u05E3 \u05D5\u05D4\u05D7\u05D9\u05E4\u05D5\u05D9 \u2014 \u05D9\u05D1\u05D5\u05D0 \u05D9\u05E9\u05D9\u05E8 \u05DE\u05D0\u05D9\u05D8\u05DC\u05D9\u05D4 \u05D5\u05E4\u05D5\u05E8\u05D8\u05D5\u05D2\u05DC"), phone: "0521234567", averageRating: 4.5, ratingCount: 12, recommendationCount: 15, dealsCount: 34, workedWithMe: true },
    { id: "2", name: txt("src/app/designer/[id]/page.tsx::010", "\u05D0\u05D5\u05E8 \u05EA\u05D0\u05D5\u05E8\u05D4"), category: txt("src/app/designer/[id]/page.tsx::011", "\u05EA\u05D0\u05D5\u05E8\u05D4"), city: txt("src/app/designer/[id]/page.tsx::012", "\u05D4\u05E8\u05E6\u05DC\u05D9\u05D4"), area: txt("src/app/designer/[id]/page.tsx::013", "\u05E9\u05E8\u05D5\u05DF"), description: txt("src/app/designer/[id]/page.tsx::014", "\u05D2\u05D5\u05E4\u05D9 \u05EA\u05D0\u05D5\u05E8\u05D4 \u05DE\u05E2\u05D5\u05E6\u05D1\u05D9\u05DD \u2014 \u05E1\u05E7\u05E0\u05D3\u05D9\u05E0\u05D1\u05D9, \u05DE\u05D5\u05D3\u05E8\u05E0\u05D9 \u05D5\u05D0\u05E7\u05DC\u05E7\u05D8\u05D9"), phone: "0529876543", averageRating: 3.8, ratingCount: 6, recommendationCount: 8, dealsCount: 18, workedWithMe: false },
    { id: "3", name: txt("src/app/designer/[id]/page.tsx::015", "\u05E7\u05D9\u05D8\u05E9\u05DF \u05E4\u05DC\u05D5\u05E1"), category: txt("src/app/designer/[id]/page.tsx::016", "\u05DE\u05D8\u05D1\u05D7\u05D9\u05DD"), city: txt("src/app/designer/[id]/page.tsx::017", "\u05E8\u05D0\u05E9\u05D5\u05DF \u05DC\u05E6\u05D9\u05D5\u05DF"), area: txt("src/app/designer/[id]/page.tsx::018", "\u05DE\u05E8\u05DB\u05D6"), description: txt("src/app/designer/[id]/page.tsx::019", "\u05DE\u05D8\u05D1\u05D7\u05D9\u05DD \u05DE\u05D5\u05EA\u05D0\u05DE\u05D9\u05DD \u05D0\u05D9\u05E9\u05D9\u05EA \u2014 \u05E2\u05D9\u05E6\u05D5\u05D1, \u05D9\u05D9\u05E6\u05D5\u05E8 \u05D5\u05D4\u05EA\u05E7\u05E0\u05D4 \u05DE\u05E7\u05E6\u05D4 \u05DC\u05E7\u05E6\u05D4"), phone: "0541112233", averageRating: 4.8, ratingCount: 18, recommendationCount: 22, dealsCount: 45, workedWithMe: true },
    { id: "4", name: txt("src/app/designer/[id]/page.tsx::020", "\u05E0\u05D5\u05E3 \u05D2\u05E8\u05D9\u05DF"), category: txt("src/app/designer/[id]/page.tsx::021", "\u05D7\u05D5\u05E5 \u05D5\u05E0\u05D5\u05E3"), city: txt("src/app/designer/[id]/page.tsx::022", "\u05DB\u05E4\u05E8 \u05E1\u05D1\u05D0"), area: txt("src/app/designer/[id]/page.tsx::023", "\u05E9\u05E8\u05D5\u05DF"), description: txt("src/app/designer/[id]/page.tsx::024", "\u05E2\u05D9\u05E6\u05D5\u05D1 \u05D2\u05E0\u05D9\u05DD, \u05DE\u05E8\u05E4\u05E1\u05D5\u05EA \u05D5\u05DE\u05E8\u05D7\u05D1\u05D9\u05DD \u05D9\u05E8\u05D5\u05E7\u05D9\u05DD \u2014 \u05DE\u05D4\u05EA\u05DB\u05E0\u05D5\u05DF \u05D5\u05E2\u05D3 \u05D4\u05D1\u05D9\u05E6\u05D5\u05E2"), phone: "0501234567", averageRating: 4.2, ratingCount: 9, recommendationCount: 11, dealsCount: 20, workedWithMe: false },
    { id: "5", name: txt("src/app/designer/[id]/page.tsx::025", "\u05D3\u05DC\u05EA \u05D4\u05D6\u05D4\u05D1"), category: txt("src/app/designer/[id]/page.tsx::026", "\u05D3\u05DC\u05EA\u05D5\u05EA \u05D5\u05D7\u05DC\u05D5\u05E0\u05D5\u05EA"), city: txt("src/app/designer/[id]/page.tsx::027", "\u05D7\u05D9\u05E4\u05D4"), area: txt("src/app/designer/[id]/page.tsx::028", "\u05E6\u05E4\u05D5\u05DF"), description: txt("src/app/designer/[id]/page.tsx::029", "\u05D3\u05DC\u05EA\u05D5\u05EA \u05E4\u05E0\u05D9\u05DD \u05D5\u05DB\u05E0\u05D9\u05E1\u05D4 \u2014 \u05E2\u05E5, \u05D0\u05DC\u05D5\u05DE\u05D9\u05E0\u05D9\u05D5\u05DD, \u05D5\u05E4\u05D5\u05E8\u05E0\u05D9\u05E8 \u05D1\u05E8\u05DE\u05D4 \u05D4\u05D2\u05D1\u05D5\u05D4\u05D4 \u05D1\u05D9\u05D5\u05EA\u05E8"), phone: "0541234567", averageRating: 4.6, ratingCount: 14, recommendationCount: 16, dealsCount: 30, workedWithMe: false },
    { id: "6", name: txt("src/app/designer/[id]/page.tsx::030", "\u05DC\u05D9\u05D9\u05D8 \u05D0\u05E4"), category: txt("src/app/designer/[id]/page.tsx::031", "\u05EA\u05D0\u05D5\u05E8\u05D4"), city: txt("src/app/designer/[id]/page.tsx::032", "\u05EA\u05DC \u05D0\u05D1\u05D9\u05D1"), area: txt("src/app/designer/[id]/page.tsx::033", "\u05DE\u05E8\u05DB\u05D6"), description: txt("src/app/designer/[id]/page.tsx::034", "\u05E4\u05EA\u05E8\u05D5\u05E0\u05D5\u05EA \u05EA\u05D0\u05D5\u05E8\u05D4 \u05D7\u05DB\u05DE\u05D4 \u2014 LED, \u05D3\u05D9\u05DE\u05E8\u05D9\u05DD \u05D5\u05EA\u05D0\u05D5\u05E8\u05D4 \u05D0\u05D3\u05E8\u05D9\u05DB\u05DC\u05D9\u05EA"), phone: "0531234567", averageRating: 4.3, ratingCount: 10, recommendationCount: 13, dealsCount: 25, workedWithMe: false },
];

const dealHistory = [
    { id: "1", supplier: txt("src/app/designer/[id]/page.tsx::035", "\u05E1\u05D8\u05D5\u05DF \u05D3\u05D9\u05D6\u05D9\u05D9\u05DF"), amount: 12000, date: "08.03.2026", status: "confirmed", rating: 5 },
    { id: "2", supplier: txt("src/app/designer/[id]/page.tsx::036", "\u05E7\u05D9\u05D8\u05E9\u05DF \u05E4\u05DC\u05D5\u05E1"), amount: 35000, date: "20.02.2026", status: "confirmed", rating: 5 },
    { id: "3", supplier: txt("src/app/designer/[id]/page.tsx::037", "\u05D0\u05D5\u05E8 \u05EA\u05D0\u05D5\u05E8\u05D4"), amount: 8500, date: "10.01.2026", status: "confirmed", rating: 4 },
    { id: "4", supplier: txt("src/app/designer/[id]/page.tsx::038", "\u05E1\u05D8\u05D5\u05DF \u05D3\u05D9\u05D6\u05D9\u05D9\u05DF"), amount: 15000, date: "05.12.2025", status: "confirmed", rating: 4 },
    { id: "5", supplier: txt("src/app/designer/[id]/page.tsx::039", "\u05E0\u05D5\u05E3 \u05D2\u05E8\u05D9\u05DF"), amount: 14500, date: "20.11.2025", status: "pending", rating: null },
];

type TabKey = "home" | "suppliers" | "deals" | "history" | "profile" | "card" | "clients" | "crm-suppliers" | "workflows" | "templates" | "whatsapp" | "webhooks" | "crm-settings";

interface NavGroup {
  title: string;
  items: { key: TabKey; label: string; icon: typeof Home }[];
}

const navGroups: NavGroup[] = [
  {
    title: "\u05E8\u05D0\u05E9\u05D9",
    items: [
      { key: "home", label: "\u05D4\u05D1\u05D9\u05EA \u05E9\u05DC\u05D9", icon: Home },
      { key: "profile", label: "\u05E4\u05E8\u05D5\u05E4\u05D9\u05DC", icon: User },
      { key: "card", label: "\u05DB\u05E8\u05D8\u05D9\u05E1 \u05D1\u05D9\u05E7\u05D5\u05E8", icon: CreditCard },
    ]
  },
  {
    title: "\u05E7\u05D4\u05D9\u05DC\u05D4",
    items: [
      { key: "suppliers", label: "\u05E1\u05E4\u05E8\u05D9\u05D9\u05EA \u05E1\u05E4\u05E7\u05D9\u05DD", icon: Search },
      { key: "deals", label: "\u05D3\u05D9\u05D5\u05D5\u05D7 \u05E2\u05E1\u05E7\u05D4", icon: HandCoins },
      { key: "history", label: "\u05D4\u05D9\u05E1\u05D8\u05D5\u05E8\u05D9\u05D4", icon: History },
    ]
  },
  {
    title: "CRM",
    items: [
      { key: "clients", label: "\u05DC\u05E7\u05D5\u05D7\u05D5\u05EA", icon: Users },
      { key: "workflows", label: "\u05EA\u05D1\u05E0\u05D9\u05D5\u05EA \u05E2\u05D1\u05D5\u05D3\u05D4", icon: Workflow },
      { key: "templates", label: "\u05EA\u05D1\u05E0\u05D9\u05D5\u05EA", icon: MessageSquare },
      { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
      { key: "webhooks", label: "Webhooks", icon: Zap },
      { key: "crm-settings", label: "\u05D4\u05D2\u05D3\u05E8\u05D5\u05EA CRM", icon: Settings },
    ]
  },
  {
    title: "\u05E2\u05D9\u05E6\u05D5\u05D1",
    items: [
      { key: "crm-suppliers", label: "\u05E1\u05E4\u05E7\u05D9\u05DD \u05E9\u05DC\u05D9", icon: Building2 },
    ]
  },
];

const ALL_DESIGNER_FILTER = "__ALL__";

export default function DesignerDashboard() {
    const [activeTab, setActiveTab] = useState<TabKey>("home");
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState(ALL_DESIGNER_FILTER);
    const [areaFilter, setAreaFilter] = useState(ALL_DESIGNER_FILTER);
    const [sortBy, setSortBy] = useState("rating");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [showDealModal, setShowDealModal] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<typeof demoSuppliers[0] | null>(null);

    const filteredSuppliers = demoSuppliers
        .filter((s) => {
            const matchSearch = !search || s.name.includes(search) || s.description.includes(search) || s.city.includes(search);
            const matchCategory = categoryFilter === ALL_DESIGNER_FILTER || s.category === categoryFilter;
            const matchArea = areaFilter === ALL_DESIGNER_FILTER || s.area === areaFilter;
            return matchSearch && matchCategory && matchArea;
        })
        .sort((a, b) => {
            if (sortBy === "rating") return b.averageRating - a.averageRating;
            if (sortBy === "recommendations") return b.recommendationCount - a.recommendationCount;
            if (sortBy === "deals") return b.dealsCount - a.dealsCount;
            return a.name.localeCompare(b.name, "he");
        });

    // Find active tab label for header
    const activeLabel = navGroups.flatMap(g => g.items).find(i => i.key === activeTab)?.label || "";

    return (
      <div className="min-h-screen bg-bg">
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
                      <Image src={designerData.designerLogo} alt={designerData.fullName} width={40} height={40} className="w-full h-full object-cover" />
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
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
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
        </aside>

        {/* ============ HEADER ============ */}
        <header className={`
          fixed top-0 left-0 h-16 z-30
          bg-white/80 backdrop-blur-2xl
          border-b border-border-subtle/50
          flex items-center justify-between px-6
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
                <span onClick={() => setActiveTab("home")} className="cursor-pointer hover:text-gold transition-colors">{txt("src/app/designer/[id]/page.tsx::048", "\u05E8\u05D0\u05E9\u05D9")}</span>
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
                placeholder={txt("src/app/designer/[id]/page.tsx::049", "\u05D7\u05D9\u05E4\u05D5\u05E9...")}
                className="search-global"
              />
            </div>
            {/* Notification Bell */}
            <button className="relative p-2 rounded-lg hover:bg-bg-surface transition-colors text-text-muted hover:text-text-primary">
              <Bell className="w-5 h-5" />
              <span className="notification-dot-gold" />
            </button>
            {/* User Badge */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-text-muted bg-bg-surface/80 rounded-xl px-3 py-2 backdrop-blur-sm">
              {designerData.designerLogo ? (
                <div className="w-6 h-6 rounded-full border border-gold overflow-hidden flex-shrink-0" style={{ boxShadow: '0 0 10px rgba(201, 168, 76, 0.2)' }}>
                  <Image src={designerData.designerLogo} alt={designerData.fullName} width={24} height={24} className="w-full h-full object-cover" />
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
          <div className="max-w-6xl mx-auto px-6 py-8">

            {/* ===== HOME TAB ===== */}
            {activeTab === "home" && (
              <div className="space-y-8 animate-in">
                {/* Welcome — Gradient Text */}
                <div>
                  <h2 className="text-3xl font-heading font-bold">
                    <span className="text-gradient-gold">{txt("src/app/designer/[id]/page.tsx::051", "\u05E9\u05DC\u05D5\u05DD")}{" "}{designerData.fullName.split(" ")[0]}</span> 👋
                  </h2>
                  <p className="text-text-muted text-sm mt-2">
                    \u05D4\u05E0\u05D4 \u05E1\u05E7\u05D9\u05E8\u05D4 \u05E9\u05DC \u05DE\u05D4 \u05E7\u05D5\u05E8\u05D4 \u05D4\u05D9\u05D5\u05DD
                  </p>
                </div>

                {/* KPI Cards — Premium with count-up animation */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { icon: HandCoins, color: "text-gold", bg: "bg-gradient-to-br from-gold/15 to-gold/5", label: txt("src/app/designer/[id]/page.tsx::052", "\u05D4\u05E2\u05E1\u05E7\u05D0\u05D5\u05EA \u05E9\u05DC\u05D9"), value: designerData.totalDeals, sub: formatCurrency(designerData.totalDealAmount), trend: "+3" },
                    { icon: Trophy, color: "text-purple-600", bg: "bg-gradient-to-br from-purple-100 to-purple-50", label: txt("src/app/designer/[id]/page.tsx::053", "\u05D4\u05D2\u05E8\u05DC\u05D5\u05EA"), value: designerData.lotteryEntries, sub: designerData.lotteryWins > 0 ? `\u05D6\u05DB\u05D9\u05EA ${designerData.lotteryWins} \u05E4\u05E2\u05DE\u05D9\u05DD!` : txt("src/app/designer/[id]/page.tsx::054", "\u05D1\u05D4\u05E6\u05DC\u05D7\u05D4 \u05D1\u05D4\u05D2\u05E8\u05DC\u05D4 \u05D4\u05D1\u05D0\u05D4!"), trend: "+2" },
                    { icon: CalendarIcon, color: "text-blue-600", bg: "bg-gradient-to-br from-blue-100 to-blue-50", label: txt("src/app/designer/[id]/page.tsx::055", "\u05D0\u05D9\u05E8\u05D5\u05E2\u05D9\u05DD \u05E7\u05E8\u05D5\u05D1\u05D9\u05DD"), value: "2", sub: txt("src/app/designer/[id]/page.tsx::056", "\u05D4\u05D9\u05E8\u05E9\u05DE\u05D9 \u05E2\u05DB\u05E9\u05D9\u05D5"), trend: null },
                    { icon: Heart, color: "text-pink-600", bg: "bg-gradient-to-br from-pink-100 to-pink-50", label: txt("src/app/designer/[id]/page.tsx::057", "\u05D0\u05E0\u05D9 \u05D5\u05D1\u05E7\u05D4\u05D9\u05DC\u05D4"), value: `#${designerData.rank}`, sub: `\u05DE\u05D0\u05D6 ${designerData.joinDate}`, trend: null },
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
                      <h3 className="text-sm font-semibold text-text-primary">{txt("src/app/designer/[id]/page.tsx::060", "\u05D4\u05EA\u05E7\u05D3\u05DE\u05D5\u05EA \u05D7\u05D5\u05D3\u05E9\u05D9\u05EA")}</h3>
                    </div>
                    <span className="text-xs font-mono text-gold font-bold">{designerData.totalDeals}/15 {txt("src/app/designer/[id]/page.tsx::061", "\u05E2\u05E1\u05E7\u05D0\u05D5\u05EA")}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${Math.min((designerData.totalDeals / 15) * 100, 100)}%` }} />
                  </div>
                  <p className="text-text-faint text-xs mt-2">{txt("src/app/designer/[id]/page.tsx::062", "\u05E2\u05D5\u05D3 3 \u05E2\u05E1\u05E7\u05D0\u05D5\u05EA \u05DC\u05D4\u05E9\u05D2\u05EA \u05D4\u05D9\u05E2\u05D3 \u05D4\u05D7\u05D5\u05D3\u05E9\u05D9!")}</p>
                </div>

                {/* Quick Actions — Premium with glow */}
                <div>
                  <h3 className="text-sm font-semibold text-text-muted mb-3">\u05E4\u05E2\u05D5\u05DC\u05D5\u05EA \u05DE\u05D4\u05D9\u05E8\u05D5\u05EA</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { key: "suppliers" as TabKey, icon: Search, label: txt("src/app/designer/[id]/page.tsx::058", "\u05D7\u05E4\u05E9\u05D9 \u05E1\u05E4\u05E7") },
                      { key: "deals" as TabKey, icon: Plus, label: txt("src/app/designer/[id]/page.tsx::059", "\u05D3\u05D5\u05D5\u05D7\u05D9 \u05E2\u05DC \u05E2\u05E1\u05E7\u05D4") },
                      { key: "clients" as TabKey, icon: Users, label: "\u05D4\u05DC\u05E7\u05D5\u05D7\u05D5\u05EA \u05E9\u05DC\u05D9" },
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
                  <h3 className="text-sm font-semibold text-text-muted mb-3">{txt("src/app/designer/[id]/page.tsx::200", "\u05E4\u05E8\u05D5\u05D9\u05E7\u05D8\u05D9\u05DD \u05D0\u05D7\u05E8\u05D5\u05E0\u05D9\u05DD")}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { title: txt("src/app/designer/[id]/page.tsx::201", "\u05E1\u05DC\u05D5\u05DF \u05DE\u05D5\u05D3\u05E8\u05E0\u05D9"), color: "from-amber-100 to-orange-50" },
                      { title: txt("src/app/designer/[id]/page.tsx::202", "\u05DE\u05D8\u05D1\u05D7 \u05E1\u05E7\u05E0\u05D3\u05D9\u05E0\u05D1\u05D9"), color: "from-blue-100 to-indigo-50" },
                      { title: txt("src/app/designer/[id]/page.tsx::203", "\u05D7\u05D3\u05E8 \u05E9\u05D9\u05E0\u05D4"), color: "from-emerald-100 to-teal-50" },
                      { title: txt("src/app/designer/[id]/page.tsx::204", "\u05D1\u05D9\u05EA \u05E7\u05E4\u05D4"), color: "from-pink-100 to-rose-50" },
                    ].map((project, i) => (
                      <div key={i} className="relative rounded-xl overflow-hidden group cursor-pointer hover-lift">
                        <div className={`bg-gradient-to-br ${project.color} h-32 flex items-center justify-center`}>
                          <span className="text-xs font-medium text-text-muted">{project.title}</span>
                        </div>
                        {/* Logo Watermark */}
                        {designerData.designerLogo && (
                          <div style={{ position: 'absolute', bottom: 8, right: 8, opacity: 0.15, width: 40, height: 40 }}>
                            <Image src={designerData.designerLogo} alt="" width={40} height={40} className="w-full h-full object-contain" />
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
                    {txt("src/app/designer/[id]/page.tsx::210", "\u05D7\u05EA\u05D9\u05DE\u05D4 \u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9\u05EA")}
                  </h3>
                  <div className="bg-white rounded-xl border border-border-subtle p-5 space-y-3 max-w-sm mx-auto">
                    {/* Letterhead style preview */}
                    <div className="flex items-center gap-3 pb-3 border-b border-border-subtle">
                      {designerData.designerLogo ? (
                        <div className="w-10 h-10 rounded-full border-2 border-gold overflow-hidden flex-shrink-0" style={{ boxShadow: '0 0 12px rgba(201, 168, 76, 0.2)' }}>
                          <Image src={designerData.designerLogo} alt={designerData.fullName} width={40} height={40} className="w-full h-full object-cover" />
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
                    {txt("src/app/designer/[id]/page.tsx::211", "\u05D4\u05E2\u05EA\u05E7 \u05D7\u05EA\u05D9\u05DE\u05D4")}
                  </button>
                </div>

                {/* Activity Feed — Recent 3 */}
                <div className="card-glass">
                  <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gold" />
                    {txt("src/app/designer/[id]/page.tsx::063b", "\u05E4\u05E2\u05D9\u05DC\u05D5\u05EA \u05D0\u05D7\u05E8\u05D5\u05E0\u05D5\u05EA")}
                  </h3>
                  <div className="space-y-3">
                    {[
                      { text: txt("src/app/designer/[id]/page.tsx::064b", "\u05E2\u05E1\u05E7\u05D4 \u05D7\u05D3\u05E9\u05D4 \u05E2\u05DD \u05E1\u05D8\u05D5\u05DF \u05D3\u05D9\u05D6\u05D9\u05D9\u05DF"), time: txt("src/app/designer/[id]/page.tsx::065b", "\u05DC\u05E4\u05E0\u05D9 3 \u05E9\u05E2\u05D5\u05EA"), color: "bg-gold" },
                      { text: txt("src/app/designer/[id]/page.tsx::066b", "\u05E0\u05E8\u05E9\u05DE\u05EA \u05DC\u05D0\u05D9\u05E8\u05D5\u05E2 \u05E0\u05D8\u05D5\u05D5\u05E8\u05E7\u05D9\u05E0\u05D2"), time: txt("src/app/designer/[id]/page.tsx::067b", "\u05D0\u05EA\u05DE\u05D5\u05DC"), color: "bg-blue-500" },
                      { text: txt("src/app/designer/[id]/page.tsx::068b", "\u05D3\u05D9\u05E8\u05D5\u05D2 5 \u05DB\u05D5\u05DB\u05D1\u05D9\u05DD \u05DC\u05E7\u05D9\u05D8\u05E9\u05DF \u05E4\u05DC\u05D5\u05E1"), time: txt("src/app/designer/[id]/page.tsx::069b", "\u05D0\u05EA\u05DE\u05D5\u05DC"), color: "bg-emerald-500" },
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
                      placeholder="\u05D7\u05E4\u05E9\u05D9 \u05E1\u05E4\u05E7 \u05DC\u05E4\u05D9 \u05E9\u05DD, \u05DE\u05D5\u05E6\u05E8, \u05D0\u05D5 \u05E2\u05D9\u05E8..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="input-field pr-12 text-base py-3"
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="select-field text-sm">
                      <option value={ALL_DESIGNER_FILTER}>{txt("src/app/designer/[id]/page.tsx::063", "\u05DB\u05DC \u05D4\u05D0\u05D6\u05D5\u05E8\u05D9\u05DD")}</option>
                      {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="select-field text-sm">
                      <option value={ALL_DESIGNER_FILTER}>{txt("src/app/designer/[id]/page.tsx::065", "\u05DB\u05DC \u05D4\u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D5\u05EA")}</option>
                      {SUPPLIER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="select-field text-sm">
                      <option value="rating">{txt("src/app/designer/[id]/page.tsx::066", "\u05D3\u05D9\u05E8\u05D5\u05D2 \u05D4\u05DB\u05D9 \u05D2\u05D1\u05D5\u05D4")}</option>
                      <option value="recommendations">{txt("src/app/designer/[id]/page.tsx::067", "\u05D4\u05DB\u05D9 \u05DE\u05DE\u05DC\u05D9\u05E6\u05D5\u05EA")}</option>
                      <option value="deals">{txt("src/app/designer/[id]/page.tsx::068", "\u05D4\u05DB\u05D9 \u05E2\u05E1\u05E7\u05D0\u05D5\u05EA")}</option>
                      <option value="name">{txt("src/app/designer/[id]/page.tsx::069", "\u05E9\u05DD \u05D0-\u05D1")}</option>
                    </select>
                    <div className="flex items-center justify-between">
                      <p className="text-text-muted text-sm">{filteredSuppliers.length} \u05E1\u05E4\u05E7\u05D9\u05DD</p>
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
                    <div key={supplier.id} className="card-gold group cursor-pointer">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-14 h-14 bg-bg-surface rounded-xl flex items-center justify-center flex-shrink-0 border border-border-subtle">
                          <span className="text-xl font-heading font-bold text-gold">{supplier.name[0]}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-heading text-text-primary text-base font-bold truncate">{supplier.name}</h3>
                          <span className="badge-gold text-[10px]">{supplier.category}</span>
                          <div className="flex items-center gap-1 text-text-muted text-xs mt-1">
                            <MapPin className="w-3 h-3" /> {supplier.city}
                          </div>
                        </div>
                        {supplier.workedWithMe && (
                          <span className="badge-green text-[10px] whitespace-nowrap">
                            <CheckCircle2 className="w-3 h-3" />{txt("src/app/designer/[id]/page.tsx::077", "\u05E2\u05D1\u05D3\u05EA\u05D9 \u05D0\u05D9\u05EA\u05DD")}
                          </span>
                        )}
                      </div>

                      <p className="text-text-muted text-sm leading-relaxed mb-3 line-clamp-2">{supplier.description}</p>

                      <div className="flex items-center gap-3 mb-3 text-sm">
                        <div className="flex items-center gap-1">
                          <StarRating rating={supplier.averageRating} size={14} />
                          <span className="text-gold font-mono text-xs">{supplier.averageRating} ({supplier.ratingCount})</span>
                        </div>
                      </div>
                      <div className="flex gap-4 text-xs text-text-muted mb-4">
                        <span>{supplier.recommendationCount} {txt("src/app/designer/[id]/page.tsx::078", "\u05DE\u05DE\u05DC\u05D9\u05E6\u05D5\u05EA")}</span>
                        <span>{supplier.dealsCount} {txt("src/app/designer/[id]/page.tsx::079", "\u05E2\u05E1\u05E7\u05D0\u05D5\u05EA")}</span>
                      </div>

                      <div className="flex gap-2">
                        <a href={`https://wa.me/972${supplier.phone.slice(1)}`} target="_blank" rel="noopener noreferrer"
                          className="flex-1 bg-emerald-600 text-white rounded-lg py-2.5 text-sm text-center flex items-center justify-center gap-1.5 hover:bg-emerald-500 transition-all duration-200 font-medium">
                          <MessageCircle className="w-4 h-4" />{txt("src/app/designer/[id]/page.tsx::080", "\u05D5\u05D5\u05D0\u05D8\u05E1\u05D0\u05E4")}
                        </a>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedSupplier(supplier); setShowDealModal(true); }}
                          className="flex-1 btn-outline text-sm py-2.5 flex items-center justify-center gap-1.5">
                          <Plus className="w-4 h-4" />{txt("src/app/designer/[id]/page.tsx::081", "\u05D3\u05D5\u05D5\u05D7 \u05E2\u05E1\u05E7\u05D4")}
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
                    <label className="form-label">{txt("src/app/designer/[id]/page.tsx::083", "\u05E1\u05E4\u05E7")}</label>
                    <select className="select-field">
                      <option value="">{txt("src/app/designer/[id]/page.tsx::084", "\u05D1\u05D7\u05E8\u05D9 \u05E1\u05E4\u05E7...")}</option>
                      {demoSuppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">{txt("src/app/designer/[id]/page.tsx::085", "\u05E1\u05DB\u05D5\u05DD \u05D4\u05E2\u05E1\u05E7\u05D4 (\u20AA)")}</label>
                    <input type="number" className="input-field" placeholder="0" dir="ltr" />
                  </div>
                  <div>
                    <label className="form-label">{txt("src/app/designer/[id]/page.tsx::086", "\u05EA\u05D9\u05D0\u05D5\u05E8 \u05E7\u05E6\u05E8")}</label>
                    <input type="text" className="input-field" placeholder="\u05DE\u05D4 \u05D4\u05D5\u05D6\u05DE\u05DF?" />
                  </div>
                  <div>
                    <label className="form-label">{txt("src/app/designer/[id]/page.tsx::088", "\u05EA\u05D0\u05E8\u05D9\u05DA \u05D4\u05E2\u05E1\u05E7\u05D4")}</label>
                    <input type="date" className="input-field" dir="ltr" />
                  </div>
                  <div>
                    <label className="form-label">{txt("src/app/designer/[id]/page.tsx::089", "\u05D3\u05D9\u05E8\u05D5\u05D2 (\u05D0\u05E0\u05D5\u05E0\u05D9\u05DE\u05D9 \u2014 \u05E8\u05E7 \u05EA\u05DE\u05E8 \u05E8\u05D5\u05D0\u05D4)")}</label>
                    <StarRating rating={0} interactive onChange={() => { }} size={28} />
                  </div>
                  <div>
                    <label className="form-label">{txt("src/app/designer/[id]/page.tsx::090", "\u05D4\u05E2\u05E8\u05D5\u05EA (\u05D0\u05D5\u05E4\u05E6\u05D9\u05D5\u05E0\u05DC\u05D9 \u2014 \u05D0\u05E0\u05D5\u05E0\u05D9\u05DE\u05D9)")}</label>
                    <textarea className="input-field h-20 resize-none" placeholder="\u05E9\u05EA\u05E4\u05D9 \u05D0\u05EA \u05D4\u05D7\u05D5\u05D5\u05D9\u05D4 \u05E9\u05DC\u05DA..." />
                  </div>
                  <button className="btn-gold w-full">{txt("src/app/designer/[id]/page.tsx::092", "\u05E9\u05DC\u05D7 \u05D3\u05D9\u05D5\u05D5\u05D7")}</button>
                  <p className="text-text-muted text-xs text-center">{txt("src/app/designer/[id]/page.tsx::093", "\u05D4\u05E1\u05E4\u05E7 \u05D9\u05EA\u05D1\u05E7\u05E9 \u05DC\u05D0\u05E9\u05E8 \u05D0\u05EA \u05D4\u05E2\u05E1\u05E7\u05D4. \u05DC\u05D0\u05D7\u05E8 \u05D0\u05D9\u05E9\u05D5\u05E8 \u05EA\u05D9\u05DB\u05E0\u05E1\u05D9 \u05DC\u05D4\u05D2\u05E8\u05DC\u05D4 \u05D4\u05D7\u05D5\u05D3\u05E9\u05D9\u05EA!")}</p>
                </div>
              </div>
            )}

            {/* ===== HISTORY TAB ===== */}
            {activeTab === "history" && (
              <div className="space-y-6 animate-in">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="card-static text-center">
                    <p className="stat-number">{dealHistory.length}</p>
                    <p className="text-text-muted text-xs mt-1">{txt("src/app/designer/[id]/page.tsx::095", "\u05E2\u05E1\u05E7\u05D0\u05D5\u05EA")}</p>
                  </div>
                  <div className="card-static text-center">
                    <p className="stat-number text-emerald-600">\u20AA{dealHistory.reduce((s, d) => s + d.amount, 0).toLocaleString()}</p>
                    <p className="text-text-muted text-xs mt-1">{txt("src/app/designer/[id]/page.tsx::096", "\u05E1\u05D4\u05F4\u05DB")}</p>
                  </div>
                  <div className="card-static text-center">
                    <p className="stat-number text-purple-600">{designerData.lotteryEntries}</p>
                    <p className="text-text-muted text-xs mt-1">{txt("src/app/designer/[id]/page.tsx::097", "\u05D4\u05D2\u05E8\u05DC\u05D5\u05EA")}</p>
                  </div>
                  <div className="card-static text-center">
                    <p className="stat-number text-blue-600">{designerData.eventsAttended}</p>
                    <p className="text-text-muted text-xs mt-1">{txt("src/app/designer/[id]/page.tsx::098", "\u05D0\u05D9\u05E8\u05D5\u05E2\u05D9\u05DD")}</p>
                  </div>
                </div>

                <div className="card-static">
                  <h3 className="text-base font-heading text-text-primary mb-4">{txt("src/app/designer/[id]/page.tsx::099", "\u05E2\u05E1\u05E7\u05D0\u05D5\u05EA")}</h3>
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
                            ? <span className="badge-green"><CheckCircle2 className="w-3 h-3" />{txt("src/app/designer/[id]/page.tsx::100", "\u05DE\u05D0\u05D5\u05E9\u05E8")}</span>
                            : <span className="badge-yellow"><Clock className="w-3 h-3" />{txt("src/app/designer/[id]/page.tsx::101", "\u05DE\u05DE\u05EA\u05D9\u05DF")}</span>
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card-static">
                  <h3 className="text-base font-heading text-text-primary mb-4">{txt("src/app/designer/[id]/page.tsx::102", "\u05D4\u05D2\u05E8\u05DC\u05D5\u05EA")}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-bg-surface rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
                          <Trophy className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-text-primary text-sm font-medium">{txt("src/app/designer/[id]/page.tsx::103", "\u05D4\u05D2\u05E8\u05DC\u05EA \u05DE\u05E8\u05E5 2026")}</p>
                          <p className="text-text-faint text-xs">{txt("src/app/designer/[id]/page.tsx::104", "\u05E9\u05D5\u05D1\u05E8 \u05E1\u05E4\u05D0 500 \u20AA")}</p>
                        </div>
                      </div>
                      <span className="badge-gold">{txt("src/app/designer/[id]/page.tsx::105", "\u05DE\u05E9\u05EA\u05EA\u05E4\u05EA")}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-bg-surface rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gold/8 flex items-center justify-center">
                          <Star className="w-4 h-4 text-gold" />
                        </div>
                        <div>
                          <p className="text-text-primary text-sm font-medium">{txt("src/app/designer/[id]/page.tsx::106", "\u05D4\u05D2\u05E8\u05DC\u05EA \u05E4\u05D1\u05E8\u05D5\u05D0\u05E8 2026")}</p>
                          <p className="text-text-faint text-xs">{txt("src/app/designer/[id]/page.tsx::107", "\u05DB\u05E8\u05D8\u05D9\u05E1 \u05DE\u05EA\u05E0\u05D4 300 \u20AA")}</p>
                        </div>
                      </div>
                      <span className="badge bg-gold text-white text-xs font-bold px-3 py-1 rounded-full">{txt("src/app/designer/[id]/page.tsx::108", "\u05D6\u05DB\u05D9\u05EA!")}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===== CRM TABS ===== */}
            {activeTab === "clients" && <CrmClients />}
            {activeTab === "crm-suppliers" && <CrmSuppliers />}
            {activeTab === "whatsapp" && <CrmWhatsApp />}
            {activeTab === "webhooks" && <CrmWebhooks />}
            {activeTab === "templates" && <CrmTemplates />}
            {activeTab === "crm-settings" && <CrmSettings />}
            {activeTab === "workflows" && <CrmWorkflowTemplates />}

            {/* ===== PROFILE TAB ===== */}
            {activeTab === "profile" && (
              <div className="space-y-6 animate-in max-w-2xl mx-auto">
                {/* Profile Logo Display */}
                <div className="card-glass flex flex-col items-center py-8">
                  <div className="relative">
                    {designerData.designerLogo ? (
                      <div className="w-24 h-24 rounded-full border-4 border-gold overflow-hidden animate-pulse-slow" style={{ boxShadow: '0 0 30px rgba(201, 168, 76, 0.4)' }}>
                        <Image src={designerData.designerLogo} alt={designerData.fullName} width={96} height={96} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center border-4 border-gold" style={{ boxShadow: '0 0 30px rgba(201, 168, 76, 0.4)' }}>
                        <span className="text-3xl font-heading font-bold text-gold">{designerData.fullName.charAt(0)}</span>
                      </div>
                    )}
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gold text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">
                      {txt("src/app/designer/[id]/page.tsx::220", "\u05D1\u05E4\u05E8\u05D5\u05E4\u05D9\u05DC \u05D4\u05E6\u05D9\u05D1\u05D5\u05E8\u05D9")}
                    </span>
                  </div>
                  <h2 className="text-lg font-heading font-bold text-text-primary mt-5">{designerData.fullName}</h2>
                  <p className="text-sm text-text-muted">{designerData.specialization} &middot; {designerData.city}</p>
                </div>

                <div className="card-static space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">{txt("src/app/designer/[id]/page.tsx::110", "\u05E9\u05DD \u05DE\u05DC\u05D0")}</label>
                      <input type="text" className="input-field" defaultValue={designerData.fullName} />
                    </div>
                    <div>
                      <label className="form-label flex items-center gap-1"><Phone className="w-3 h-3" />{txt("src/app/designer/[id]/page.tsx::111", "\u05D8\u05DC\u05E4\u05D5\u05DF")}</label>
                      <input type="tel" className="input-field" defaultValue={designerData.phone} dir="ltr" />
                    </div>
                    <div>
                      <label className="form-label flex items-center gap-1"><Mail className="w-3 h-3" />{txt("src/app/designer/[id]/page.tsx::112", "\u05DE\u05D9\u05D9\u05DC")}</label>
                      <input type="email" className="input-field" defaultValue={designerData.email} dir="ltr" />
                    </div>
                    <div>
                      <label className="form-label flex items-center gap-1"><MapPin className="w-3 h-3" />{txt("src/app/designer/[id]/page.tsx::113", "\u05E2\u05D9\u05E8")}</label>
                      <input type="text" className="input-field" defaultValue={designerData.city} />
                    </div>
                    <div>
                      <label className="form-label">{txt("src/app/designer/[id]/page.tsx::114", "\u05D4\u05EA\u05DE\u05D7\u05D5\u05EA")}</label>
                      <select className="select-field">
                        {[txt("src/app/designer/[id]/page.tsx::115", "\u05E2\u05D9\u05E6\u05D5\u05D1 \u05E4\u05E0\u05D9\u05DD"), txt("src/app/designer/[id]/page.tsx::116", "\u05D0\u05D3\u05E8\u05D9\u05DB\u05DC\u05D5\u05EA"), txt("src/app/designer/[id]/page.tsx::117", "\u05E0\u05D5\u05E3"), txt("src/app/designer/[id]/page.tsx::118", "\u05D4\u05DB\u05DC")].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">{txt("src/app/designer/[id]/page.tsx::119", "\u05E9\u05E0\u05D5\u05EA \u05E0\u05D9\u05E1\u05D9\u05D5\u05DF")}</label>
                      <input type="number" className="input-field" defaultValue={designerData.yearsExperience} />
                    </div>
                    <div>
                      <label className="form-label flex items-center gap-1"><Instagram className="w-3 h-3" />{txt("src/app/designer/[id]/page.tsx::120", "\u05D0\u05D9\u05E0\u05E1\u05D8\u05D2\u05E8\u05DD")}</label>
                      <input type="text" className="input-field" defaultValue={designerData.instagram} dir="ltr" />
                    </div>
                    <div>
                      <label className="form-label flex items-center gap-1"><Globe className="w-3 h-3" />{txt("src/app/designer/[id]/page.tsx::121", "\u05D0\u05EA\u05E8 \u05D0\u05D9\u05E9\u05D9")}</label>
                      <input type="url" className="input-field" placeholder="https://..." dir="ltr" />
                    </div>
                  </div>

                  <button className="btn-gold flex items-center justify-center gap-2 w-full sm:w-auto">
                    <CheckCircle2 className="w-4 h-4" />{txt("src/app/designer/[id]/page.tsx::122", "\u05E9\u05DE\u05D5\u05E8 \u05E9\u05D9\u05E0\u05D5\u05D9\u05D9\u05DD")}
                  </button>
                </div>
              </div>
            )}

            {/* ===== BUSINESS CARD TAB ===== */}
            {activeTab === "card" && (
              <div className="animate-in">
                <BusinessCardBuilder userName={designerData.fullName} userRole={designerData.specialization} userPhone={designerData.phone} userEmail={designerData.email} />
              </div>
            )}
          </div>
        </main>

        {/* Deal Modal */}
        {showDealModal && selectedSupplier && (
          <div className="modal-overlay" onClick={() => setShowDealModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-heading text-text-primary">{txt("src/app/designer/[id]/page.tsx::123", "\u05D3\u05D9\u05D5\u05D5\u05D7 \u05E2\u05E1\u05E7\u05D4 \u2014")} {selectedSupplier.name}</h3>
                <button onClick={() => setShowDealModal(false)} className="p-1.5 rounded-lg hover:bg-bg-surface transition-colors">
                  <X className="w-5 h-5 text-text-muted" />
                </button>
              </div>
              <div className="space-y-3">
                <input type="number" className="input-field" placeholder="\u05E1\u05DB\u05D5\u05DD \u05D4\u05E2\u05E1\u05E7\u05D4 (\u20AA)" />
                <input type="text" className="input-field" placeholder="\u05EA\u05D9\u05D0\u05D5\u05E8 \u05E7\u05E6\u05E8" />
                <div>
                  <p className="text-text-secondary text-sm mb-1.5">{txt("src/app/designer/[id]/page.tsx::126", "\u05D3\u05D9\u05E8\u05D5\u05D2 (\u05D0\u05E0\u05D5\u05E0\u05D9\u05DE\u05D9)")}</p>
                  <StarRating rating={0} interactive onChange={() => { }} size={24} />
                </div>
                <button onClick={() => setShowDealModal(false)} className="btn-gold w-full mt-2">{txt("src/app/designer/[id]/page.tsx::127", "\u05E9\u05DC\u05D7 \u05D3\u05D9\u05D5\u05D5\u05D7")}</button>
              </div>
            </div>
          </div>
        )}

        {/* ============ FLOATING ACTION BAR ============ */}
        <div className="floating-bar max-md:hidden">
          <button onClick={() => setActiveTab("deals")} className="floating-bar-btn" title={txt("src/app/designer/[id]/page.tsx::130", "\u05D3\u05D9\u05D5\u05D5\u05D7 \u05E2\u05E1\u05E7\u05D4")}>
            <HandCoins className="w-4 h-4" />
          </button>
          <button onClick={() => setActiveTab("clients")} className="floating-bar-btn" title={txt("src/app/designer/[id]/page.tsx::131", "\u05DC\u05E7\u05D5\u05D7\u05D5\u05EA")}>
            <Users className="w-4 h-4" />
          </button>
          <button onClick={() => setActiveTab("suppliers")} className="floating-bar-btn-primary" title={txt("src/app/designer/[id]/page.tsx::132", "\u05D7\u05D9\u05E4\u05D5\u05E9")}>
            <Plus className="w-5 h-5" />
          </button>
          <button onClick={() => setActiveTab("whatsapp")} className="floating-bar-btn" title="WhatsApp">
            <MessageCircle className="w-4 h-4" />
          </button>
          <button onClick={() => setActiveTab("history")} className="floating-bar-btn" title={txt("src/app/designer/[id]/page.tsx::133", "\u05D4\u05D9\u05E1\u05D8\u05D5\u05E8\u05D9\u05D4")}>
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
