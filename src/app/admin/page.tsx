"use client";
import { useState, useMemo, useEffect } from "react";
import KPICard from "@/components/ui/KPICard";
import dynamic from "next/dynamic";
const RevenueBarChart = dynamic(() => import("@/components/charts/LuxuryCharts").then((mod) => mod.RevenueBarChart), { ssr: false, loading: () => <div className="h-[280px] flex items-center justify-center text-text-muted">טוען גרף...</div> });
import {
  Users, Palette, FileText, HandCoins, Calendar, TrendingUp, Clock, ChevronLeft,
  AlertTriangle, Bell, BellOff, CheckCircle2, UserPlus, Star, ShieldAlert, CreditCard,
  Activity, Heart, ArrowUpRight, ArrowDownRight, Eye, Zap, BarChart3, Loader2,
} from "lucide-react";
import Link from "next/link";

// ==========================================
// Types
// ==========================================

interface DashboardStats {
  activeSuppliers: number;
  expiredSubscriptions: number;
  pendingPosts: number;
  monthlyDeals: number;
  monthlyDealAmount: number;
  totalDesigners: number;
  upcomingEvents: number;
  monthlyRevenue: number;
  activeThisWeek: number;
  newDesignersThisMonth: number;
}

interface Alert {
  id: string;
  type: "new_designer" | "big_deal" | "low_rating" | "inactive" | "payment" | "event_full" | "post_pending" | "milestone";
  title: string;
  description: string;
  priority: "critical" | "warning" | "info" | "success";
  time: string;
  link: string;
}

interface WeeklyData {
  newDesigners: number;
  dealsCount: number;
  revenue: number;
  postsPublished: number;
  eventRegistrations: number;
  activeUsers: number;
}

// ==========================================
// Default data (replaced by API)
// ==========================================

const emptyStats: DashboardStats = {
  activeSuppliers: 0,
  expiredSubscriptions: 0,
  pendingPosts: 0,
  monthlyDeals: 0,
  monthlyDealAmount: 0,
  totalDesigners: 0,
  upcomingEvents: 0,
  monthlyRevenue: 0,
  activeThisWeek: 0,
  newDesignersThisMonth: 0,
};

const emptyWeek: WeeklyData = {
  newDesigners: 0,
  dealsCount: 0,
  revenue: 0,
  postsPublished: 0,
  eventRegistrations: 0,
  activeUsers: 0,
};

// ==========================================
// Helpers
// ==========================================

function calcChange(current: number, previous: number): { value: number; positive: boolean } {
  if (previous === 0) return { value: 0, positive: true };
  const pct = Math.round(((current - previous) / previous) * 100);
  return { value: Math.abs(pct), positive: pct >= 0 };
}

const priorityStyles = {
  critical: { border: "border-r-red-500", bg: "bg-red-50", dot: "bg-red-500", text: "text-red-600" },
  warning: { border: "border-r-amber-500", bg: "bg-amber-50", dot: "bg-amber-500", text: "text-amber-600" },
  info: { border: "border-r-blue-500", bg: "bg-blue-50", dot: "bg-blue-500", text: "text-blue-600" },
  success: { border: "border-r-emerald-500", bg: "bg-emerald-50", dot: "bg-emerald-500", text: "text-emerald-600" },
};

const alertIcons: Record<Alert["type"], typeof Bell> = {
  new_designer: UserPlus,
  big_deal: HandCoins,
  low_rating: Star,
  inactive: Clock,
  payment: CreditCard,
  event_full: Calendar,
  post_pending: FileText,
  milestone: Zap,
};

// ==========================================
// Health Score Gauge Component
// ==========================================

function HealthGauge({ score }: { score: number }) {
  const radius = 54;
  const circumference = Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col items-center">
      <svg width="130" height="75" viewBox="0 0 130 75" className="drop-shadow-sm">
        {/* Background arc */}
        <path
          d="M 10 70 A 54 54 0 0 1 120 70"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Score arc */}
        <path
          d="M 10 70 A 54 54 0 0 1 120 70"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
        {/* Score text */}
        <text x="65" y="58" textAnchor="middle" className="text-2xl font-bold font-mono" fill={color}>
          {score}
        </text>
        <text x="65" y="72" textAnchor="middle" className="text-[10px]" fill="#6b7280">
          מתוך 100
        </text>
      </svg>
    </div>
  );
}

// ==========================================
// Mini Sparkline Component
// ==========================================

function Sparkline({ data, color = "#C9A84C" }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={w} height={h} className="flex-shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ==========================================
// Component
// ==========================================

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [revenueData, setRevenueData] = useState<{ month: string; revenue: number }[]>([]);
  const [thisWeek, setThisWeek] = useState<WeeklyData>(emptyWeek);
  const [lastWeek, setLastWeek] = useState<WeeklyData>(emptyWeek);
  const [recentActivity, setRecentActivity] = useState<{ color: string; name: string; text: string; time: string }[]>([]);
  const [upcomingEventsData, setUpcomingEventsData] = useState<{ name: string; reg: string; date: string; time: string; full: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  const [snoozed, setSnoozed] = useState<Set<string>>(new Set());
  const [handled, setHandled] = useState<Set<string>>(new Set());
  const [pendingWaitlistCount, setPendingWaitlistCount] = useState(0);

  // Compute kpiTrends from revenueData — need at least 2 data points for Sparkline
  const kpiTrends = useMemo(() => {
    const rev = revenueData.slice(-6).map((r) => r.revenue);
    const pad = (val: number) => [0, val]; // min 2 points for sparkline
    return {
      suppliers: pad(stats.activeSuppliers),
      designers: pad(stats.totalDesigners),
      deals: pad(stats.monthlyDeals),
      revenue: rev.length >= 2 ? rev : pad(rev[0] || 0),
    };
  }, [revenueData, stats]);

  // Compute health score from real data
  const healthScore = useMemo(() => {
    let score = 50;
    if (stats.activeSuppliers > 0) score += 10;
    if (stats.totalDesigners > 0) score += 10;
    if (stats.pendingPosts === 0) score += 10;
    if (stats.expiredSubscriptions === 0) score += 10;
    if (stats.monthlyDeals > 0) score += 10;
    return Math.min(100, score);
  }, [stats]);

  // Fetch dashboard data
  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/dashboard")
      .then((res) => { if (!res.ok) throw new Error("fetch failed"); return res.json(); })
      .then((data) => {
        if (data.stats) setStats(data.stats);
        if (data.revenueData) setRevenueData(data.revenueData);
        if (data.thisWeek) setThisWeek(data.thisWeek);
        if (data.lastWeek) setLastWeek(data.lastWeek);
        if (data.alerts) setAlerts(data.alerts);
        if (data.recentActivity) setRecentActivity(data.recentActivity);
        if (data.upcomingEventsData) setUpcomingEventsData(data.upcomingEventsData);
      })
      .catch(() => {
        // Fallback to basic stats API
        fetch("/api/admin/stats")
          .then((r) => r.json())
          .then((data) => {
            if (!data.error) {
              setStats({
                activeSuppliers: data.activeSuppliers || 0,
                expiredSubscriptions: data.overdueSuppliers || 0,
                pendingPosts: data.pendingPosts || 0,
                monthlyDeals: data.monthlyDeals || 0,
                monthlyDealAmount: data.monthlyDealAmount || 0,
                totalDesigners: data.totalDesigners || 0,
                upcomingEvents: data.upcomingEvents || 0,
                monthlyRevenue: data.monthlyRevenue || 0,
                activeThisWeek: 0,
                newDesignersThisMonth: 0,
              });
            }
          })
          .catch(() => {});
      })
      .finally(() => setLoading(false));
  }, []);

  // Fetch pending waitlist count
  useEffect(() => {
    fetch("/api/admin/waitlist?status=PENDING")
      .then((r) => r.json())
      .then((data) => {
        const count = data.designers?.length || 0;
        setPendingWaitlistCount(count);
        if (count > 0) {
          setAlerts((prev) => {
            const withoutWaitlist = prev.filter((a) => a.id !== "real-waitlist");
            return [
              {
                id: "real-waitlist",
                type: "new_designer" as const,
                title: `${count} מעצבות ממתינות לאישור`,
                description: "יש בקשות הצטרפות חדשות ברשימת המתנה -- לחצי לסקירה",
                priority: "warning" as const,
                time: "עכשיו",
                link: "/admin/waitlist",
              },
              ...withoutWaitlist,
            ];
          });
        }
      })
      .catch(() => {});
  }, []);
  const [alertFilter, setAlertFilter] = useState<"all" | "critical" | "warning" | "info" | "success">("all");

  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      if (handled.has(a.id)) return false;
      if (snoozed.has(a.id)) return false;
      if (alertFilter !== "all" && a.priority !== alertFilter) return false;
      return true;
    });
  }, [alerts, handled, snoozed, alertFilter]);

  const handleSnooze = (id: string) => {
    setSnoozed(prev => { const n = new Set(prev); n.add(id); return n; });
  };

  const handleHandled = (id: string) => {
    setHandled(prev => { const n = new Set(prev); n.add(id); return n; });
  };

  // Weekly comparison stats
  const weeklyComparisons = [
    { label: "מעצבות חדשות", icon: UserPlus, current: thisWeek.newDesigners, prev: lastWeek.newDesigners, color: "text-purple-600" },
    { label: "עסקאות", icon: HandCoins, current: thisWeek.dealsCount, prev: lastWeek.dealsCount, color: "text-gold" },
    { label: "הכנסות", icon: TrendingUp, current: thisWeek.revenue, prev: lastWeek.revenue, color: "text-emerald-600", prefix: "₪" },
    { label: "פרסומים", icon: FileText, current: thisWeek.postsPublished, prev: lastWeek.postsPublished, color: "text-blue-600" },
    { label: "הרשמות לאירועים", icon: Calendar, current: thisWeek.eventRegistrations, prev: lastWeek.eventRegistrations, color: "text-amber-600" },
    { label: "משתמשות פעילות", icon: Activity, current: thisWeek.activeUsers, prev: lastWeek.activeUsers, color: "text-pink-600" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted gap-2">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>טוען דשבורד...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in">
      {/* ============ Header ============ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-text-primary">שלום תמר 👋</h1>
          <p className="text-text-muted mt-1 text-sm sm:text-base">
            {new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/posts" className="btn-gold text-sm flex items-center gap-2 w-fit">
            <FileText className="w-4 h-4" />אשר פרסומים ({stats.pendingPosts})
          </Link>
          <Link href="/admin/reports" className="btn-outline text-sm flex items-center gap-2 w-fit">
            <BarChart3 className="w-4 h-4" />דוחות
          </Link>
        </div>
      </div>

      {/* ============ Feature 1: Community Intelligence — KPI Cards ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <div className="card-static flex flex-col items-center justify-center py-4 col-span-2 lg:col-span-1">
          <p className="text-xs text-text-muted mb-2 font-medium">בריאות הקהילה</p>
          <HealthGauge score={healthScore} />
          <p className="text-[10px] text-text-muted mt-1">
            {healthScore >= 80 ? "🟢 מצוין" : healthScore >= 60 ? "🟡 טוב" : "🔴 דורש תשומת לב"}
          </p>
        </div>

        <div className="card-static p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-gold/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-gold" />
            </div>
            <Sparkline data={kpiTrends.suppliers} color="#C9A84C" />
          </div>
          <p className="text-2xl font-bold font-mono text-text-primary">{stats.activeSuppliers}</p>
          <p className="text-xs text-text-muted">ספקים פעילים</p>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight className="w-3 h-3 text-emerald-500" />
            <span className="text-xs text-emerald-600 font-mono">+4%</span>
            <span className="text-[10px] text-text-muted">מהחודש שעבר</span>
          </div>
          {stats.expiredSubscriptions > 0 && (
            <p className="text-[10px] text-red-500 mt-1">⚠️ {stats.expiredSubscriptions} עם תשלום שפג</p>
          )}
        </div>

        <div className="card-static p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-red-500" />
            </div>
            <span className="badge-red text-xs animate-pulse">{stats.pendingPosts}</span>
          </div>
          <p className="text-2xl font-bold font-mono text-text-primary">{stats.pendingPosts}</p>
          <p className="text-xs text-text-muted">פרסומים ממתינים</p>
          <Link href="/admin/posts" className="text-[10px] text-gold hover:underline mt-1 block">אשר עכשיו ←</Link>
        </div>

        <div className="card-static p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <HandCoins className="w-5 h-5 text-emerald-600" />
            </div>
            <Sparkline data={kpiTrends.deals} color="#10b981" />
          </div>
          <p className="text-2xl font-bold font-mono text-text-primary">{stats.monthlyDeals}</p>
          <p className="text-xs text-text-muted">עסקאות החודש</p>
          <p className="text-[10px] text-emerald-600 font-mono mt-1">₪{stats.monthlyDealAmount.toLocaleString("he-IL")}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <ArrowUpRight className="w-3 h-3 text-emerald-500" />
            <span className="text-xs text-emerald-600 font-mono">+12%</span>
          </div>
        </div>

        <div className="card-static p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
              <Palette className="w-5 h-5 text-purple-600" />
            </div>
            <Sparkline data={kpiTrends.designers} color="#9333ea" />
          </div>
          <p className="text-2xl font-bold font-mono text-text-primary">{stats.totalDesigners.toLocaleString("he-IL")}</p>
          <p className="text-xs text-text-muted">מעצבות בקהילה</p>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight className="w-3 h-3 text-emerald-500" />
            <span className="text-xs text-emerald-600 font-mono">+{stats.newDesignersThisMonth} החודש</span>
          </div>
        </div>

        <div className="card-static p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-mono">{stats.activeThisWeek}</span>
          </div>
          <p className="text-2xl font-bold font-mono text-text-primary">{stats.activeThisWeek}</p>
          <p className="text-xs text-text-muted">פעילות השבוע</p>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight className="w-3 h-3 text-emerald-500" />
            <span className="text-xs text-emerald-600 font-mono">+10%</span>
          </div>
        </div>
      </div>

      {/* ============ Feature 2: Smart Alert Center + Quick Summary ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Alert Center */}
        <div className="lg:col-span-2">
          <div className="card-static">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg sm:text-xl font-heading text-text-primary">מרכז התראות</h2>
                <span className="badge-red text-xs">{filteredAlerts.length}</span>
              </div>
              {/* Filter tabs */}
              <div className="flex gap-1 flex-wrap">
                {(["all", "critical", "warning", "info", "success"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setAlertFilter(f)}
                    className={`px-2.5 py-1 text-xs rounded-full transition-all ${
                      alertFilter === f
                        ? "bg-gold/10 text-gold font-semibold border border-gold/30"
                        : "text-text-muted hover:bg-bg-surface border border-transparent"
                    }`}
                  >
                    {f === "all" ? "הכל" : f === "critical" ? "🔴 דחוף" : f === "warning" ? "🟡 אזהרה" : f === "info" ? "🔵 מידע" : "🟢 חיובי"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 max-h-[360px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
              {filteredAlerts.length === 0 ? (
                <div className="text-center py-8 text-text-muted">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
                  <p className="font-medium">הכל מטופל! 🎉</p>
                  <p className="text-xs mt-1">אין התראות פתוחות</p>
                </div>
              ) : (
                filteredAlerts.map((alert) => {
                  const style = priorityStyles[alert.priority];
                  const AlertIcon = alertIcons[alert.type];
                  return (
                    <div
                      key={alert.id}
                      className={`border-r-4 ${style.border} ${style.bg} rounded-btn p-3 sm:p-4 group transition-all hover:shadow-sm`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg ${style.bg} flex items-center justify-center flex-shrink-0`}>
                          <AlertIcon className={`w-4 h-4 ${style.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-text-primary font-medium text-sm">{alert.title}</p>
                              <p className="text-text-muted text-xs mt-0.5">{alert.description}</p>
                            </div>
                            <span className="text-[10px] text-text-muted whitespace-nowrap flex-shrink-0">{alert.time}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Link href={alert.link} className="text-[10px] text-gold hover:underline flex items-center gap-0.5">
                              <Eye className="w-3 h-3" /> צפה
                            </Link>
                            <button
                              onClick={() => handleHandled(alert.id)}
                              className="text-[10px] text-emerald-600 hover:underline flex items-center gap-0.5"
                            >
                              <CheckCircle2 className="w-3 h-3" /> טופל
                            </button>
                            <button
                              onClick={() => handleSnooze(alert.id)}
                              className="text-[10px] text-text-muted hover:text-text-primary flex items-center gap-0.5"
                            >
                              <BellOff className="w-3 h-3" /> השתק
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Quick Summary Sidebar */}
        <div className="space-y-4">
          {/* Monthly Revenue */}
          <div className="card-static">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <h3 className="text-base sm:text-lg font-heading text-text-primary">הכנסות החודש</h3>
            </div>
            <p className="text-2xl sm:text-3xl font-bold font-mono text-emerald-600">
              ₪{stats.monthlyRevenue.toLocaleString("he-IL")}
            </p>
            <p className="text-text-muted text-xs mt-1">ספקים + אירועים</p>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-emerald-600 font-mono font-semibold">+6.5%</span>
              <span className="text-text-muted">מהחודש הקודם</span>
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="card-static">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                <h3 className="text-base sm:text-lg font-heading text-text-primary">אירועים קרובים</h3>
              </div>
              <Link href="/admin/events" className="text-gold text-xs hover:underline">הכל</Link>
            </div>
            <div className="space-y-2">
              {upcomingEventsData.length === 0 && (
                <p className="text-text-muted text-sm text-center py-3">אין אירועים קרובים</p>
              )}
              {upcomingEventsData.map((e, i) => (
                <div key={i} className="flex items-center justify-between text-sm bg-bg-surface rounded-btn p-3">
                  <div>
                    <span className="text-text-primary font-medium text-sm">{e.name}</span>
                    <p className="text-text-muted text-xs">
                      {e.reg} נרשמו {e.full && <span className="badge-red text-[9px] mr-1">מלא!</span>}
                    </p>
                  </div>
                  <div className="text-left">
                    <span className="text-gold font-mono text-sm font-semibold">{e.date}</span>
                    <p className="text-text-muted text-xs">{e.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activities */}
          <div className="card-static">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-purple-500" />
              <h3 className="text-base sm:text-lg font-heading text-text-primary">פעילות אחרונה</h3>
            </div>
            <div className="space-y-3 text-sm">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className={`w-2 h-2 rounded-full ${a.color} mt-1.5 flex-shrink-0`} />
                  <div>
                    <p className="text-text-primary">
                      <span className="text-gold font-medium">{a.name}</span> {a.text}
                    </p>
                    <p className="text-text-muted text-xs">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============ Feature 3: Weekly Health Report ============ */}
      <div className="card-static">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            <h2 className="text-lg sm:text-xl font-heading text-text-primary">דוח שבועי — השבוע vs. שבוע שעבר</h2>
          </div>
          <span className="text-xs text-text-muted bg-bg-surface px-3 py-1 rounded-full">
            עדכון אחרון: היום, {new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {weeklyComparisons.map((item, i) => {
            const change = calcChange(item.current, item.prev);
            const Icon = item.icon;
            return (
              <div key={i} className="bg-bg-surface rounded-xl p-3 text-center">
                <Icon className={`w-5 h-5 mx-auto mb-1.5 ${item.color}`} />
                <p className="text-xl font-bold font-mono text-text-primary">
                  {item.prefix || ""}{item.current.toLocaleString("he-IL")}
                </p>
                <p className="text-[10px] text-text-muted mt-0.5">{item.label}</p>
                <div className="flex items-center justify-center gap-1 mt-1.5">
                  {change.positive ? (
                    <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-red-500" />
                  )}
                  <span className={`text-xs font-mono font-semibold ${change.positive ? "text-emerald-600" : "text-red-600"}`}>
                    {change.positive ? "+" : "-"}{change.value}%
                  </span>
                </div>
                <p className="text-[9px] text-text-muted">שבוע שעבר: {item.prefix || ""}{item.prev.toLocaleString("he-IL")}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============ Revenue Chart ============ */}
      <div className="card-static">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
          <h2 className="text-lg sm:text-xl font-heading text-text-primary">הכנסות חודשיות — 12 חודשים אחרונים</h2>
          <Link href="/admin/reports" className="text-gold text-sm hover:underline flex items-center gap-1">
            דוח מפורט<ChevronLeft className="w-4 h-4" />
          </Link>
        </div>
        <RevenueBarChart data={revenueData} />
      </div>
    </div>
  );
}
