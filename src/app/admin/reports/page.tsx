"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  BarChart3, Download, FileText, HandCoins, CreditCard, Trophy, Calendar,
  TrendingUp, TrendingDown, CheckCircle, XCircle, AlertTriangle, ChevronDown,
  ChevronUp, Filter, Clock, Shield, Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import dynamic from "next/dynamic";

const ChartLoading = () => (
  <div className="h-[280px] flex items-center justify-center text-text-muted">טוען גרף...</div>
);
const DealsAreaChart = dynamic(() => import("@/components/charts/LuxuryCharts").then((mod) => mod.DealsAreaChart), { ssr: false, loading: ChartLoading });
const CategoryPieChart = dynamic(() => import("@/components/charts/LuxuryCharts").then((mod) => mod.CategoryPieChart), { ssr: false, loading: ChartLoading });
const ComboLineChart = dynamic(() => import("@/components/charts/LuxuryCharts").then((mod) => mod.ComboLineChart), { ssr: false, loading: ChartLoading });
const PostsStackedChart = dynamic(() => import("@/components/charts/LuxuryCharts").then((mod) => mod.PostsStackedChart), { ssr: false, loading: ChartLoading });
const PaymentsChart = dynamic(() => import("@/components/charts/LuxuryCharts").then((mod) => mod.PaymentsChart), { ssr: false, loading: ChartLoading });
const RatingDistributionChart = dynamic(() => import("@/components/charts/LuxuryCharts").then((mod) => mod.RatingDistributionChart), { ssr: false, loading: ChartLoading });

// ==============================
// Types for API data
// ==============================

interface MonthlyDeal { month: string; deals: number; revenue: number }
interface CategoryDeal { name: string; value: number }
interface PostMonthly { month: string; published: number; pending: number; rejected: number }
interface PaymentMonthly { month: string; paid: number; overdue: number; pending: number }
interface RatingDist { rating: string; count: number }
interface TopEntry { name: string; deals: number; amount: number }
interface OverdueEntry { name: string; debt: number; days: number; lastPayment: string }
interface TopPostSupplier { name: string; posts: number; approval: number }

interface ReportData {
  dealsMonthlyData: MonthlyDeal[];
  lastYearDeals: MonthlyDeal[];
  dealsByCategoryData: CategoryDeal[];
  postsMonthlyData: PostMonthly[];
  paymentsMonthlyData: PaymentMonthly[];
  ratingDistData: RatingDist[];
  pendingDeals: PendingDeal[];
  top5Suppliers: TopEntry[];
  top5Designers: TopEntry[];
  overdueList: OverdueEntry[];
  topPostingSuppliers: TopPostSupplier[];
  kpi: { totalDeals: number; totalRevenue: number; monthDeals: number; monthRevenue: number; avgDeal: number; dealGrowth: number; revenueGrowth: number };
  postKpi: { totalPostsPublished: number; pendingPostsCount: number; postsThisMonth: number; approvalRate: number };
  paymentKpi: { monthlyRevenue: number; paidCount: number; overdueCount: number };
}

// ==============================
// Deal Approval Data (Feature 14)
// ==============================

interface PendingDeal {
  id: string;
  designerName: string;
  supplierName: string;
  amount: number;
  category: string;
  date: string;
  description: string;
  flags: string[];
}

// Pipeline stages remain static reference data
const pipelineStages = [
  { label: "פנייה ראשונית", count: 86, color: "bg-blue-400" },
  { label: "הצעת מחיר", count: 52, color: "bg-yellow-400" },
  { label: "עסקה סגורה", count: 28, color: "bg-emerald-400" },
];

// ==============================
// Tab Config
// ==============================

const reportTabs = [
  { key: "deals", label: "עסקאות", icon: HandCoins },
  { key: "approval", label: "אישור עסקאות", icon: Shield },
  { key: "posts", label: "פרסומים", icon: FileText },
  { key: "payments", label: "גבייה", icon: CreditCard },
  { key: "lotteries", label: "הגרלות", icon: Trophy },
  { key: "events", label: "אירועים", icon: Calendar },
  { key: "hub", label: "מרכז דוחות", icon: BarChart3 },
] as const;

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<string>("deals");
  const [showYoY, setShowYoY] = useState(false);
  const [periodToggle, setPeriodToggle] = useState<"monthly" | "yearly">("monthly");

  // Data from API
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/reports");
      if (!res.ok) throw new Error("שגיאה בטעינת דוחות");
      const data = await res.json();
      setReportData(data);
      setFetchError(null);
    } catch {
      setFetchError("שגיאה בטעינת נתוני דוחות");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // Derived data from API response
  const dealsMonthlyData = reportData?.dealsMonthlyData ?? [];
  const lastYearDeals = reportData?.lastYearDeals ?? [];
  const dealsByCategoryData = reportData?.dealsByCategoryData ?? [];
  const postsMonthlyData = reportData?.postsMonthlyData ?? [];
  const paymentsMonthlyData = reportData?.paymentsMonthlyData ?? [];
  const ratingDistData = reportData?.ratingDistData ?? [];

  // Deal approval state
  const [deals, setDeals] = useState<PendingDeal[]>([]);
  const [expandedDeal, setExpandedDeal] = useState<string | null>(null);
  const [initialDealCount, setInitialDealCount] = useState(0);
  const approvedCount = useMemo(() => initialDealCount - deals.length, [deals, initialDealCount]);

  // Sync pending deals from API when loaded
  useEffect(() => {
    if (reportData?.pendingDeals) {
      setDeals(reportData.pendingDeals);
      setInitialDealCount(reportData.pendingDeals.length);
    }
  }, [reportData]);

  // Reports Hub state
  const [reportType, setReportType] = useState<"monthly" | "quarterly" | "annual">("monthly");
  const [dateFrom, setDateFrom] = useState("2026-01-01");
  const [dateTo, setDateTo] = useState("2026-03-19");

  const handleApproveDeal = (id: string) => {
    setDeals(prev => prev.filter(d => d.id !== id));
  };
  const handleRejectDeal = (id: string) => {
    setDeals(prev => prev.filter(d => d.id !== id));
  };

  // Report hub generated summary
  const kpi = reportData?.kpi;
  const postKpi = reportData?.postKpi;
  const paymentKpi = reportData?.paymentKpi;
  const reportSummary = useMemo(() => {
    const typeLabel = reportType === "monthly" ? "חודשי" : reportType === "quarterly" ? "רבעוני" : "שנתי";
    const base = kpi ? {
      totalDeals: kpi.monthDeals,
      totalRevenue: kpi.monthRevenue,
    } : { totalDeals: 0, totalRevenue: 0 };
    return {
      typeLabel,
      totalDeals: reportType === "monthly" ? base.totalDeals : reportType === "quarterly" ? base.totalDeals * 3 : (kpi?.totalDeals ?? 0),
      totalRevenue: reportType === "monthly" ? base.totalRevenue : reportType === "quarterly" ? base.totalRevenue * 3 : (kpi?.totalRevenue ?? 0),
      newDesigners: 0,
      activeSuppliers: paymentKpi?.paidCount ?? 0,
      postsPublished: postKpi?.postsThisMonth ?? 0,
      eventsHeld: 0,
    };
  }, [reportType, kpi, postKpi, paymentKpi]);

  // YoY comparison data
  const yoyData = useMemo(() => {
    return dealsMonthlyData.map((d, i) => ({
      month: d.month,
      thisYear: d.deals,
      lastYear: lastYearDeals[i]?.deals || 0,
      thisYearRev: d.revenue,
      lastYearRev: lastYearDeals[i]?.revenue || 0,
    }));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto mb-3" />
          <p className="text-text-muted text-sm">טוען נתוני דוחות...</p>
        </div>
      </div>
    );
  }
  if (fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 text-sm">{fetchError}</p>
          <button onClick={fetchReports} className="btn-gold mt-4 px-4 py-2 rounded-lg text-sm">נסה שוב</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-heading text-text-primary flex items-center gap-2">
            <BarChart3 className="w-7 h-7" />דוחות ואנליטיקה
          </h1>
          <p className="text-text-muted text-sm mt-1">נתונים מפורטים על כל הפעילות בקהילה</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline text-sm flex items-center gap-1">
            <Download className="w-4 h-4" />ייצוא PDF
          </button>
          <button className="btn-outline text-sm flex items-center gap-1">
            <Download className="w-4 h-4" />ייצוא Excel
          </button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex gap-2 flex-wrap">
        {reportTabs.map((tab) => {
          const Icon = tab.icon;
          const isApproval = tab.key === "approval";
          return (
            <button key={tab.key} onClick={() => setActiveReport(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-btn text-sm transition-all duration-200 relative ${
                activeReport === tab.key
                  ? "bg-gold text-bg font-bold"
                  : "bg-bg-surface text-text-muted hover:text-gold border border-border-subtle"
              }`}>
              <Icon className="w-4 h-4" />
              {tab.label}
              {isApproval && deals.length > 0 && (
                <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {deals.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ==============================
            Deals Report (Feature 13)
            ============================== */}
      {activeReport === "deals" && (
        <div className="space-y-6">
          {/* Period Toggle */}
          <div className="flex items-center gap-3">
            <div className="flex bg-bg-surface rounded-btn p-1">
              <button onClick={() => setPeriodToggle("monthly")}
                className={`px-4 py-1.5 rounded text-sm transition-colors ${periodToggle === "monthly" ? "bg-gold text-bg font-bold" : "text-text-muted"}`}>
                חודשי
              </button>
              <button onClick={() => setPeriodToggle("yearly")}
                className={`px-4 py-1.5 rounded text-sm transition-colors ${periodToggle === "yearly" ? "bg-gold text-bg font-bold" : "text-text-muted"}`}>
                שנתי
              </button>
            </div>
            <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
              <input type="checkbox" checked={showYoY} onChange={(e) => setShowYoY(e.target.checked)}
                className="accent-[#C9A84C] w-4 h-4" />
              השוואה שנה מול שנה
            </label>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card-static text-center">
              <p className="text-text-muted text-sm">סה״כ עסקאות</p>
              <p className="text-gold font-mono text-2xl font-bold">{kpi?.totalDeals ?? 0}</p>
              {(kpi?.dealGrowth ?? 0) !== 0 && (
              <div className="flex items-center justify-center gap-1 mt-1">
                {(kpi?.dealGrowth ?? 0) >= 0 ? <TrendingUp className="w-3 h-3 text-emerald-600" /> : <TrendingDown className="w-3 h-3 text-red-400" />}
                <span className={`text-xs font-mono ${(kpi?.dealGrowth ?? 0) >= 0 ? "text-emerald-600" : "text-red-400"}`}>{(kpi?.dealGrowth ?? 0) > 0 ? "+" : ""}{kpi?.dealGrowth ?? 0}% מהשנה שעברה</span>
              </div>
              )}
            </div>
            <div className="card-static text-center">
              <p className="text-text-muted text-sm">סכום כולל</p>
              <p className="text-gold font-mono text-2xl font-bold">{formatCurrency(kpi?.totalRevenue ?? 0)}</p>
              {(kpi?.revenueGrowth ?? 0) !== 0 && (
              <div className="flex items-center justify-center gap-1 mt-1">
                {(kpi?.revenueGrowth ?? 0) >= 0 ? <TrendingUp className="w-3 h-3 text-emerald-600" /> : <TrendingDown className="w-3 h-3 text-red-400" />}
                <span className={`text-xs font-mono ${(kpi?.revenueGrowth ?? 0) >= 0 ? "text-emerald-600" : "text-red-400"}`}>{(kpi?.revenueGrowth ?? 0) > 0 ? "+" : ""}{kpi?.revenueGrowth ?? 0}%</span>
              </div>
              )}
            </div>
            <div className="card-static text-center">
              <p className="text-text-muted text-sm">ממוצע עסקה</p>
              <p className="text-gold font-mono text-2xl font-bold">{formatCurrency(kpi?.avgDeal ?? 0)}</p>
            </div>
            <div className="card-static text-center">
              <p className="text-text-muted text-sm">עסקאות החודש</p>
              <p className="text-gold font-mono text-2xl font-bold">{kpi?.monthDeals ?? 0}</p>
            </div>
          </div>

          {/* Deal Pipeline Funnel */}
          <div className="card-static">
            <h3 className="text-text-primary font-heading mb-4">משפך עסקאות</h3>
            <div className="flex items-center gap-1 h-10">
              {pipelineStages.map((stage, i) => {
                const total = pipelineStages.reduce((s, x) => s + x.count, 0);
                const pct = (stage.count / total) * 100;
                return (
                  <div key={i} className="relative group" style={{ width: `${pct}%` }}>
                    <div className={`${stage.color} h-10 rounded-md flex items-center justify-center text-bg text-sm font-bold transition-all hover:opacity-90`}>
                      {stage.count}
                    </div>
                    <p className="text-text-muted text-xs text-center mt-1">{stage.label}</p>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2 mt-3 text-xs text-text-muted">
              <span>שיעור המרה: </span>
              <span className="text-gold font-mono font-bold">
                {Math.round((pipelineStages[2].count / pipelineStages[0].count) * 100)}%
              </span>
              <span>(פנייה → סגירה)</span>
            </div>
          </div>

          {/* YoY Comparison or Regular Charts */}
          {showYoY ? (
            <div className="card-static">
              <h3 className="text-text-primary font-heading mb-4">השוואה שנתית — עסקאות</h3>
              <div className="overflow-x-auto">
                <table className="w-full table-luxury">
                  <thead>
                    <tr>
                      <th>חודש</th>
                      <th>השנה</th>
                      <th>שנה שעברה</th>
                      <th>שינוי</th>
                      <th>הכנסות השנה</th>
                      <th>הכנסות שנה שעברה</th>
                      <th>שינוי הכנסות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yoyData.map((row, i) => {
                      const dealChange = row.lastYear > 0 ? Math.round(((row.thisYear - row.lastYear) / row.lastYear) * 100) : 0;
                      const revChange = row.lastYearRev > 0 ? Math.round(((row.thisYearRev - row.lastYearRev) / row.lastYearRev) * 100) : 0;
                      return (
                        <tr key={i}>
                          <td className="text-gold">{row.month}</td>
                          <td className="font-mono">{row.thisYear}</td>
                          <td className="font-mono text-text-muted">{row.lastYear}</td>
                          <td>
                            <span className={`font-mono text-sm flex items-center gap-0.5 ${dealChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {dealChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {dealChange > 0 ? "+" : ""}{dealChange}%
                            </span>
                          </td>
                          <td className="font-mono">{formatCurrency(row.thisYearRev)}</td>
                          <td className="font-mono text-text-muted">{formatCurrency(row.lastYearRev)}</td>
                          <td>
                            <span className={`font-mono text-sm flex items-center gap-0.5 ${revChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {revChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {revChange > 0 ? "+" : ""}{revChange}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card-static">
                <h3 className="text-text-primary font-heading mb-4">עסקאות לפי חודש</h3>
                <DealsAreaChart data={dealsMonthlyData} />
              </div>
              <div className="card-static">
                <h3 className="text-text-primary font-heading mb-4">עסקאות לפי קטגוריה</h3>
                <CategoryPieChart data={dealsByCategoryData} />
              </div>
            </div>
          )}

          {/* Combo chart */}
          <div className="card-static">
            <h3 className="text-text-primary font-heading mb-4">עסקאות vs. הכנסות — מגמה שנתית</h3>
            <ComboLineChart data={dealsMonthlyData} />
          </div>

          {/* Top 5 suppliers + Top 5 designers side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card-static">
              <h3 className="text-text-primary font-heading mb-3">TOP 5 ספקים</h3>
              <table className="w-full table-luxury">
                <thead>
                  <tr><th>#</th><th>ספק</th><th>עסקאות</th><th>סכום</th></tr>
                </thead>
                <tbody>
                  {(reportData?.top5Suppliers ?? []).map((s, i) => (
                    <tr key={i}>
                      <td className="font-mono text-gold">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</td>
                      <td>{s.name}</td>
                      <td className="font-mono">{s.deals}</td>
                      <td className="font-mono">{formatCurrency(s.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card-static">
              <h3 className="text-text-primary font-heading mb-3">TOP 5 מעצבות</h3>
              <table className="w-full table-luxury">
                <thead>
                  <tr><th>#</th><th>מעצבת</th><th>עסקאות</th><th>סכום</th></tr>
                </thead>
                <tbody>
                  {(reportData?.top5Designers ?? []).map((d, i) => (
                    <tr key={i}>
                      <td className="font-mono text-gold">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</td>
                      <td>{d.name}</td>
                      <td className="font-mono">{d.deals}</td>
                      <td className="font-mono">{formatCurrency(d.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==============================
            Deal Approval (Feature 14)
            ============================== */}
      {activeReport === "approval" && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card-static text-center">
              <p className="text-text-muted text-sm">ממתינות לאישור</p>
              <p className="text-yellow-400 font-mono text-2xl font-bold">{deals.length}</p>
            </div>
            <div className="card-static text-center">
              <p className="text-text-muted text-sm">אושרו היום</p>
              <p className="text-emerald-400 font-mono text-2xl font-bold">{approvedCount}</p>
            </div>
            <div className="card-static text-center">
              <p className="text-text-muted text-sm">עם דגלים</p>
              <p className="text-red-400 font-mono text-2xl font-bold">
                {deals.filter(d => d.flags.length > 0).length}
              </p>
            </div>
          </div>

          {deals.length === 0 ? (
            <div className="card-static text-center py-16">
              <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-text-primary font-heading text-xl mb-2">כל העסקאות אושרו! 🎉</h3>
              <p className="text-text-muted">אין עסקאות ממתינות לאישור כרגע.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deals.map(deal => (
                <div key={deal.id} className={`card-static transition-all ${deal.flags.length > 0 ? "border-red-400/30" : ""}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1" onClick={() => setExpandedDeal(expandedDeal === deal.id ? null : deal.id)}>
                      <div className="flex items-center gap-3 cursor-pointer">
                        <div>
                          <h3 className="text-text-primary font-heading font-bold flex items-center gap-2">
                            {deal.designerName}
                            <span className="text-text-muted font-normal text-sm">←</span>
                            {deal.supplierName}
                            {deal.flags.length > 0 && (
                              <AlertTriangle className="w-4 h-4 text-red-400" />
                            )}
                          </h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-text-muted">
                            <span className="badge-gold text-xs">{deal.category}</span>
                            <span className="font-mono text-gold font-bold">{formatCurrency(deal.amount)}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{deal.date}</span>
                          </div>
                        </div>
                        {expandedDeal === deal.id ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                      </div>
                    </div>
                    <div className="flex gap-2 mr-4">
                      <button onClick={() => handleApproveDeal(deal.id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-btn bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors">
                        <CheckCircle className="w-4 h-4" />אשר
                      </button>
                      <button onClick={() => handleRejectDeal(deal.id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-btn bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors">
                        <XCircle className="w-4 h-4" />דחה
                      </button>
                    </div>
                  </div>

                  {/* Flags */}
                  {deal.flags.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {deal.flags.map((flag, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs bg-red-400/10 text-red-400 px-3 py-1.5 rounded-lg">
                          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                          ⚠️ {flag}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Expanded details */}
                  {expandedDeal === deal.id && (
                    <div className="mt-3 pt-3 border-t border-border-subtle animate-in">
                      <p className="text-text-primary text-sm mb-2"><strong>פירוט:</strong> {deal.description}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div><span className="text-text-muted">מעצבת:</span> <span className="text-text-primary">{deal.designerName}</span></div>
                        <div><span className="text-text-muted">ספק:</span> <span className="text-text-primary">{deal.supplierName}</span></div>
                        <div><span className="text-text-muted">קטגוריה:</span> <span className="text-text-primary">{deal.category}</span></div>
                        <div><span className="text-text-muted">תאריך:</span> <span className="text-text-primary">{deal.date}</span></div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==============================
            Posts Report
            ============================== */}
      {activeReport === "posts" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card-static text-center">
              <p className="text-text-muted text-sm">סה״כ פורסמו</p>
              <p className="text-gold font-mono text-2xl font-bold">{postKpi?.totalPostsPublished ?? 0}</p>
            </div>
            <div className="card-static text-center">
              <p className="text-text-muted text-sm">אחוז אישור</p>
              <p className="text-emerald-600 font-mono text-2xl font-bold">{postKpi?.approvalRate ?? 0}%</p>
            </div>
            <div className="card-static text-center">
              <p className="text-text-muted text-sm">פורסמו החודש</p>
              <p className="text-gold font-mono text-2xl font-bold">{postKpi?.postsThisMonth ?? 0}</p>
            </div>
            <div className="card-static text-center">
              <p className="text-text-muted text-sm">ממתינים</p>
              <p className="text-yellow-400 font-mono text-2xl font-bold">{postKpi?.pendingPostsCount ?? 0}</p>
            </div>
          </div>
          <div className="card-static">
            <h3 className="text-text-primary font-heading mb-4">פרסומים לפי חודש ומצב</h3>
            <PostsStackedChart data={postsMonthlyData} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card-static">
              <h3 className="text-text-primary font-heading mb-3">ספקים הכי פעילים בפרסום</h3>
              <table className="w-full table-luxury">
                <thead><tr><th>#</th><th>ספק</th><th>פרסומים</th><th>אחוז אישור</th></tr></thead>
                <tbody>
                  {(reportData?.topPostingSuppliers ?? []).map((s, i) => (
                    <tr key={i}>
                      <td className="font-mono text-gold">{i + 1}</td>
                      <td>{s.name}</td>
                      <td className="font-mono">{s.posts}</td>
                      <td className={`font-mono ${s.approval >= 90 ? "text-emerald-600" : s.approval >= 80 ? "text-yellow-400" : "text-red-500"}`}>
                        {s.approval}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card-static">
              <h3 className="text-text-primary font-heading mb-3">סיבות דחייה נפוצות</h3>
              <div className="space-y-3">
                {[
                  { reason: "חסר לוגו הקהילה", count: 12, pct: 35 },
                  { reason: "איכות תמונה נמוכה", count: 8, pct: 24 },
                  { reason: "חסר לוגו ספק", count: 6, pct: 18 },
                  { reason: "חסר קרדיט מעצבת", count: 5, pct: 15 },
                  { reason: "תוכן לא מתאים", count: 3, pct: 9 },
                ].map((r, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-text-primary">{r.reason}</span>
                      <span className="text-text-muted font-mono">{r.count} ({r.pct}%)</span>
                    </div>
                    <div className="w-full bg-bg-surface rounded-full h-2">
                      <div className="bg-red-500/70 rounded-full h-2 transition-all" style={{ width: `${r.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==============================
            Payments Report
            ============================== */}
      {activeReport === "payments" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card-static text-center">
              <p className="text-text-muted text-sm">הכנסות חודשיות</p>
              <p className="text-gold font-mono text-2xl font-bold">{formatCurrency(paymentKpi?.monthlyRevenue ?? 0)}</p>
            </div>
            <div className="card-static text-center">
              <p className="text-text-muted text-sm">שולם</p>
              <p className="text-emerald-600 font-mono text-2xl font-bold">{paymentKpi?.paidCount ?? 0}</p>
              <p className="text-text-muted text-xs">ספקים</p>
            </div>
            <div className="card-static text-center">
              <p className="text-text-muted text-sm">באיחור</p>
              <p className="text-red-500 font-mono text-2xl font-bold">{paymentKpi?.overdueCount ?? 0}</p>
            </div>
            <div className="card-static text-center">
              <p className="text-text-muted text-sm">הכנסה שנתית</p>
              <p className="text-gold font-mono text-2xl font-bold">{formatCurrency((paymentKpi?.monthlyRevenue ?? 0) * 12)}</p>
            </div>
          </div>
          <div className="card-static">
            <h3 className="text-text-primary font-heading mb-4">מגמת גבייה — 6 חודשים אחרונים</h3>
            <PaymentsChart data={paymentsMonthlyData} />
          </div>
          <div className="card-static">
            <h3 className="text-text-primary font-heading mb-3">ספקים באיחור תשלום</h3>
            <table className="w-full table-luxury">
              <thead>
                <tr><th>ספק</th><th>סכום חוב</th><th>ימי איחור</th><th>תשלום אחרון</th><th>פעולה</th></tr>
              </thead>
              <tbody>
                {(reportData?.overdueList ?? []).map((s, i) => (
                  <tr key={i}>
                    <td className="text-gold">{s.name}</td>
                    <td className="font-mono text-red-500">{formatCurrency(s.debt)}</td>
                    <td className={`font-mono ${s.days > 30 ? "text-red-500 font-bold" : "text-yellow-400"}`}>
                      {s.days} ימים
                    </td>
                    <td className="text-text-muted">{s.lastPayment}</td>
                    <td><button className="btn-outline text-xs">שלח תזכורת</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==============================
            Lotteries Report
            ============================== */}
      {activeReport === "lotteries" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card-static text-center">
              <p className="text-text-muted text-sm">הגרלות שנערכו</p>
              <p className="text-gold font-mono text-2xl font-bold">11</p>
            </div>
            <div className="card-static text-center">
              <p className="text-text-muted text-sm">שווי פרסים כולל</p>
              <p className="text-gold font-mono text-2xl font-bold">{formatCurrency(9800)}</p>
            </div>
            <div className="card-static text-center">
              <p className="text-text-muted text-sm">משתתפות ייחודיות</p>
              <p className="text-gold font-mono text-2xl font-bold">68</p>
            </div>
            <div className="card-static text-center">
              <p className="text-text-muted text-sm">ממוצע משתתפות</p>
              <p className="text-gold font-mono text-2xl font-bold">28</p>
              <p className="text-text-muted text-xs">להגרלה</p>
            </div>
          </div>
          <div className="card-static">
            <h3 className="text-text-primary font-heading mb-4">חלוקת דירוגי ספקים (משפיעה על זכאות)</h3>
            <RatingDistributionChart data={ratingDistData} />
          </div>
          <div className="card-static">
            <h3 className="text-text-primary font-heading mb-3">היסטוריית הגרלות</h3>
            <table className="w-full table-luxury">
              <thead>
                <tr><th>חודש</th><th>פרס</th><th>שווי</th><th>משתתפות</th><th>זוכה</th></tr>
              </thead>
              <tbody>
                {[
                  { month: "פבר׳ 2026", prize: "יום פינוק בספא", value: 800, participants: 28, winner: "מיכל ל." },
                  { month: "ינו׳ 2026", prize: "שובר IKEA", value: 500, participants: 22, winner: "נועה כ." },
                  { month: "דצמ׳ 2025", prize: "סט כלי עבודה", value: 600, participants: 25, winner: "רותם ד." },
                  { month: "נוב׳ 2025", prize: "שובר הום סנטר", value: 1000, participants: 30, winner: "יעל ג." },
                  { month: "אוק׳ 2025", prize: "סדנת בישול", value: 450, participants: 18, winner: "שירה א." },
                ].map((l, i) => (
                  <tr key={i}>
                    <td className="text-gold">{l.month}</td>
                    <td>{l.prize}</td>
                    <td className="font-mono">{formatCurrency(l.value)}</td>
                    <td className="font-mono">{l.participants}</td>
                    <td className="text-gold">{l.winner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==============================
            Events Report
            ============================== */}
      {activeReport === "events" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card-static text-center">
              <p className="text-text-muted text-sm">אירועים שנערכו</p>
              <p className="text-gold font-mono text-2xl font-bold">8</p>
            </div>
            <div className="card-static text-center">
              <p className="text-text-muted text-sm">סה״כ משתתפות</p>
              <p className="text-gold font-mono text-2xl font-bold">342</p>
            </div>
            <div className="card-static text-center">
              <p className="text-text-muted text-sm">הכנסות מאירועים</p>
              <p className="text-emerald-600 font-mono text-2xl font-bold">{formatCurrency(18600)}</p>
            </div>
            <div className="card-static text-center">
              <p className="text-text-muted text-sm">ממוצע נוכחות</p>
              <p className="text-gold font-mono text-2xl font-bold">85%</p>
            </div>
          </div>
          <div className="card-static">
            <h3 className="text-text-primary font-heading mb-3">כל האירועים השנה</h3>
            <div className="overflow-x-auto">
              <table className="w-full table-luxury">
                <thead>
                  <tr><th>תאריך</th><th>אירוע</th><th>סוג</th><th>נרשמו</th><th>הגיעו</th><th>הכנסות</th></tr>
                </thead>
                <tbody>
                  {[
                    { date: "15.03.26", title: "סדנת חומרים חדשים", type: "סדנה", registered: 28, attended: "-", revenue: 3360 },
                    { date: "22.03.26", title: "מפגש נטוורקינג", type: "מפגש", registered: 42, attended: "-", revenue: 0 },
                    { date: "20.02.26", title: "טרנדים 2026", type: "הרצאה", registered: 156, attended: 134, revenue: 0 },
                    { date: "15.01.26", title: "סדנת 3D רנדרינג", type: "סדנה", registered: 35, attended: 31, revenue: 5250 },
                    { date: "10.12.25", title: "מסיבת סוף שנה", type: "מפגש", registered: 85, attended: 72, revenue: 0 },
                    { date: "20.11.25", title: "סיור במפעל קרמיקה", type: "סיור", registered: 30, attended: 28, revenue: 4500 },
                  ].map((e, i) => (
                    <tr key={i}>
                      <td className="font-mono text-gold">{e.date}</td>
                      <td>{e.title}</td>
                      <td><span className="badge-gold text-xs">{e.type}</span></td>
                      <td className="font-mono">{e.registered}</td>
                      <td className="font-mono">{e.attended}</td>
                      <td className="font-mono">{e.revenue > 0 ? formatCurrency(e.revenue) : "חינם"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card-static">
              <h3 className="text-text-primary font-heading mb-3">סוגי אירועים פופולריים</h3>
              <CategoryPieChart data={[
                { name: "סדנאות", value: 4 },
                { name: "מפגשים", value: 3 },
                { name: "הרצאות", value: 2 },
                { name: "סיורים", value: 1 },
              ]} />
            </div>
            <div className="card-static">
              <h3 className="text-text-primary font-heading mb-3">שביעות רצון מאירועים</h3>
              <div className="space-y-4 mt-4">
                {[
                  { event: "סדנת חומרים", satisfaction: 4.8 },
                  { event: "3D רנדרינג", satisfaction: 4.6 },
                  { event: "סיור מפעל", satisfaction: 4.5 },
                  { event: "מסיבת סוף שנה", satisfaction: 4.9 },
                  { event: "טרנדים 2026", satisfaction: 4.2 },
                ].map((e, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-text-primary text-sm w-32 flex-shrink-0">{e.event}</span>
                    <div className="flex-1 bg-bg-surface rounded-full h-3">
                      <div className="bg-gold rounded-full h-3 transition-all" style={{ width: `${(e.satisfaction / 5) * 100}%` }} />
                    </div>
                    <span className="text-gold font-mono text-sm font-bold">{e.satisfaction}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==============================
            Reports Hub (Feature 15)
            ============================== */}
      {activeReport === "hub" && (
        <div className="space-y-6">
          {/* Report Type Selection */}
          <div className="card-static">
            <h3 className="text-text-primary font-heading mb-4">הפקת דוח</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { key: "monthly" as const, label: "חודשי", icon: Calendar, desc: "דוח לחודש בודד" },
                { key: "quarterly" as const, label: "רבעוני", icon: BarChart3, desc: "סיכום רבעון" },
                { key: "annual" as const, label: "שנתי", icon: TrendingUp, desc: "דוח שנתי מלא" },
              ].map(rt => (
                <button key={rt.key} onClick={() => setReportType(rt.key)}
                  className={`p-4 rounded-xl border-2 transition-all text-right ${
                    reportType === rt.key
                      ? "border-gold bg-gold/5"
                      : "border-border-subtle hover:border-gold/30"
                  }`}>
                  <rt.icon className={`w-6 h-6 mb-2 ${reportType === rt.key ? "text-gold" : "text-text-muted"}`} />
                  <p className={`font-heading font-bold ${reportType === rt.key ? "text-gold" : "text-text-primary"}`}>{rt.label}</p>
                  <p className="text-text-muted text-xs mt-1">{rt.desc}</p>
                </button>
              ))}
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <label className="block text-text-muted text-xs mb-1">מתאריך</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                  className="input-dark text-sm" dir="ltr" />
              </div>
              <div>
                <label className="block text-text-muted text-xs mb-1">עד תאריך</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                  className="input-dark text-sm" dir="ltr" />
              </div>
              <button className="btn-gold text-sm mt-5">הפק דוח</button>
            </div>
          </div>

          {/* Generated Report Summary */}
          <div className="card-static border-gold/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-text-primary font-heading text-lg">
                סיכום {reportSummary.typeLabel} — {dateFrom} עד {dateTo}
              </h3>
              <div className="flex gap-2">
                <button className="btn-outline text-xs flex items-center gap-1">
                  <Download className="w-3 h-3" /> PDF
                </button>
                <button className="btn-gold text-xs flex items-center gap-1">
                  <Download className="w-3 h-3" /> Excel
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: "עסקאות", value: reportSummary.totalDeals, icon: HandCoins },
                { label: "הכנסות", value: formatCurrency(reportSummary.totalRevenue), icon: CreditCard },
                { label: "מעצבות חדשות", value: reportSummary.newDesigners, icon: TrendingUp },
                { label: "ספקים פעילים", value: reportSummary.activeSuppliers, icon: Filter },
                { label: "פרסומים", value: reportSummary.postsPublished, icon: FileText },
                { label: "אירועים", value: reportSummary.eventsHeld, icon: Calendar },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="text-center bg-bg-surface rounded-xl p-4">
                    <Icon className="w-5 h-5 text-gold mx-auto mb-2" />
                    <p className="text-gold font-mono text-xl font-bold">{item.value}</p>
                    <p className="text-text-muted text-xs mt-1">{item.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Download Buttons */}
          <div className="card-static">
            <h3 className="text-text-primary font-heading mb-4">דוחות מהירים</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "רשימת ספקים + סטטוס", desc: "כל הספקים עם פרטי תשלום" },
                { label: "עסקאות החודש", desc: "פירוט כל העסקאות" },
                { label: "דירוגי ספקים", desc: "ממוצע דירוגים + תגובות" },
                { label: "פרסומים — סטטיסטיקה", desc: "כמות, אחוז אישור, סיבות דחייה" },
              ].map((report, i) => (
                <button key={i} className="text-right p-4 bg-bg-surface rounded-xl border border-border-subtle hover:border-gold/30 transition-all group">
                  <div className="flex items-center justify-between mb-2">
                    <FileText className="w-5 h-5 text-text-muted group-hover:text-gold transition-colors" />
                    <Download className="w-4 h-4 text-text-muted group-hover:text-gold transition-colors" />
                  </div>
                  <p className="text-text-primary text-sm font-medium">{report.label}</p>
                  <p className="text-text-muted text-xs mt-1">{report.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
