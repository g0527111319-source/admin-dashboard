"use client";
import { txt } from "@/content/siteText";
import { useState } from "react";
import Logo from "@/components/ui/Logo";
import StarRating from "@/components/ui/StarRating";
import StatusBadge from "@/components/ui/StatusBadge";
import { FileText, HandCoins, Star, Calendar, Upload, Clock, Send, Edit, Image as ImageIcon, BarChart3, Eye, TrendingUp, CheckCircle2, XCircle, Phone, Mail, Globe, MapPin, Camera, UserPlus, X, Plus, CreditCard, ShieldCheck, } from "lucide-react";
import BusinessCardBuilder from "@/components/business-card/BusinessCardBuilder";
const supplierData = {
    name: txt("src/app/supplier/[id]/page.tsx::001", "\u05E1\u05D8\u05D5\u05DF \u05D3\u05D9\u05D6\u05D9\u05D9\u05DF"),
    contactName: txt("src/app/supplier/[id]/page.tsx::002", "\u05D9\u05D5\u05E1\u05D9 \u05DB\u05D4\u05DF"),
    phone: "052-1234567",
    email: "yossi@stonedesign.co.il",
    website: "www.stonedesign.co.il",
    city: txt("src/app/supplier/[id]/page.tsx::003", "\u05EA\u05DC \u05D0\u05D1\u05D9\u05D1"),
    category: txt("src/app/supplier/[id]/page.tsx::004", "\u05E8\u05D9\u05E6\u05D5\u05E3 \u05D5\u05D7\u05D9\u05E4\u05D5\u05D9"),
    description: txt("src/app/supplier/[id]/page.tsx::005", "\u05E1\u05E4\u05E7 \u05E8\u05D9\u05E6\u05D5\u05E3 \u05D5\u05D7\u05D9\u05E4\u05D5\u05D9 \u05E4\u05E8\u05D9\u05DE\u05D9\u05D5\u05DD \u2014 \u05D9\u05D9\u05D1\u05D5\u05D0 \u05D9\u05E9\u05D9\u05E8 \u05DE\u05D0\u05D9\u05D8\u05DC\u05D9\u05D4 \u05D5\u05E1\u05E4\u05E8\u05D3. \u05DE\u05D2\u05D5\u05D5\u05DF \u05E7\u05D5\u05DC\u05E7\u05E6\u05D9\u05D5\u05EA \u05D9\u05D9\u05D7\u05D5\u05D3\u05D9\u05D5\u05EA \u05DC\u05E4\u05E8\u05D5\u05D9\u05E7\u05D8\u05D9 \u05D9\u05D5\u05E7\u05E8\u05D4."),
    subscriptionEnd: "2026-06-15",
    daysLeft: 97,
    paymentStatus: "PAID",
    postsThisMonth: 3,
    postsLastMonth: 4,
    totalDeals: 18,
    totalDealAmount: 156000,
    averageRating: 4.5,
    ratingCount: 12,
    supplierLogo: "",
    isVerified: true,
};
const recentPosts = [
    { id: "1", caption: txt("src/app/supplier/[id]/page.tsx::006", "\u05E7\u05D5\u05DC\u05E7\u05E6\u05D9\u05D9\u05EA \u05D0\u05E8\u05D9\u05D7\u05D9 \u05E4\u05D5\u05E8\u05E6\u05DC\u05DF \u05D7\u05D3\u05E9\u05D4 \u2014 \u05D2\u05D9\u05DE\u05D5\u05E8 \u05DE\u05D0\u05D8 \u05D8\u05D1\u05E2\u05D9, \u05DE\u05D9\u05D3\u05D5\u05EA \u05D2\u05D3\u05D5\u05DC\u05D5\u05EA"), status: "PUBLISHED", date: "07.03.2026", time: "10:30", imageUrl: null },
    { id: "2", caption: txt("src/app/supplier/[id]/page.tsx::007", "\u05E4\u05E8\u05D5\u05D9\u05E7\u05D8 \u05DE\u05D5\u05E9\u05DC\u05DD \u2014 \u05E8\u05D9\u05E6\u05D5\u05E3 \u05D8\u05E8\u05D0\u05E6\u05D5 \u05D1\u05D5\u05D9\u05DC\u05D4 \u05D1\u05D4\u05E8\u05E6\u05DC\u05D9\u05D4 \u05E4\u05D9\u05EA\u05D5\u05D7"), status: "APPROVED", date: "05.03.2026", time: "13:30", imageUrl: null },
    { id: "3", caption: txt("src/app/supplier/[id]/page.tsx::008", "\u05D7\u05D9\u05E4\u05D5\u05D9 \u05E7\u05D9\u05E8 \u05D7\u05D3\u05E9\u05E0\u05D9 \u05D1\u05D2\u05D9\u05DE\u05D5\u05E8 \u05EA\u05DC\u05EA \u05DE\u05D9\u05DE\u05D3\u05D9 \u2014 \u05D9\u05D9\u05D7\u05D5\u05D3\u05D9 \u05DC\u05E9\u05D5\u05E7 \u05D4\u05D9\u05E9\u05E8\u05D0\u05DC\u05D9"), status: "PENDING", date: "09.03.2026", time: "20:30", imageUrl: null },
    { id: "4", caption: txt("src/app/supplier/[id]/page.tsx::009", "\u05DE\u05D1\u05E6\u05E2 \u05E1\u05D5\u05E3 \u05E2\u05D5\u05E0\u05D4 \u2014 30% \u05D4\u05E0\u05D7\u05D4 \u05E2\u05DC \u05E7\u05D5\u05DC\u05E7\u05E6\u05D9\u05D9\u05EA LOFT"), status: "REJECTED", date: "02.03.2026", time: "10:30", imageUrl: null, rejectionReason: txt("src/app/supplier/[id]/page.tsx::010", "\u05D7\u05E1\u05E8 \u05DC\u05D5\u05D2\u05D5 \u05E7\u05D4\u05D9\u05DC\u05D4") },
];
const recentDeals = [
    { id: "1", designerInitial: txt("src/app/supplier/[id]/page.tsx::011", "\u05E0. \u05DB."), amount: 12000, date: "08.03.2026", confirmed: true },
    { id: "2", designerInitial: txt("src/app/supplier/[id]/page.tsx::012", "\u05DE. \u05DC."), amount: 8500, date: "05.03.2026", confirmed: true },
    { id: "3", designerInitial: txt("src/app/supplier/[id]/page.tsx::013", "\u05E9. \u05D0."), amount: 22000, date: "01.03.2026", confirmed: true },
    { id: "4", designerInitial: txt("src/app/supplier/[id]/page.tsx::014", "\u05EA. \u05D2."), amount: 15000, date: "25.02.2026", confirmed: false },
    { id: "5", designerInitial: txt("src/app/supplier/[id]/page.tsx::015", "\u05E8. \u05D3."), amount: 9800, date: "20.02.2026", confirmed: true },
];
interface Recommender {
    id: string;
    name: string;
    phone: string;
}
export default function SupplierDashboard() {
    const [activeTab, setActiveTab] = useState<"overview" | "posts" | "deals" | "newpost" | "profile" | "card">("overview");
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
    const [recommenders, setRecommenders] = useState<Recommender[]>([
        { id: "1", name: txt("src/app/supplier/[id]/page.tsx::016", "\u05E0\u05D5\u05E2\u05D4 \u05DB\u05D4\u05E0\u05D5\u05D1\u05D9\u05E5'"), phone: "0501234567" },
    ]);
    const [newRecommender, setNewRecommender] = useState({ name: "", phone: "" });
    const [showAddRecommender, setShowAddRecommender] = useState(false);
    const handleAddRecommender = () => {
        if (!newRecommender.name || !newRecommender.phone || recommenders.length >= 3)
            return;
        setRecommenders([...recommenders, { id: Date.now().toString(), ...newRecommender }]);
        setNewRecommender({ name: "", phone: "" });
        setShowAddRecommender(false);
    };
    const handleRemoveRecommender = (id: string) => {
        setRecommenders(recommenders.filter(r => r.id !== id));
    };
    const tabs = [
        { key: "overview", label: txt("src/app/supplier/[id]/page.tsx::017", "\u05E1\u05E7\u05D9\u05E8\u05D4 \u05DB\u05DC\u05DC\u05D9\u05EA"), icon: BarChart3 },
        { key: "posts", label: txt("src/app/supplier/[id]/page.tsx::018", "\u05D4\u05E4\u05E8\u05E1\u05D5\u05DE\u05D9\u05DD \u05E9\u05DC\u05D9"), icon: FileText },
        { key: "deals", label: txt("src/app/supplier/[id]/page.tsx::019", "\u05E2\u05E1\u05E7\u05D0\u05D5\u05EA"), icon: HandCoins },
        { key: "newpost", label: txt("src/app/supplier/[id]/page.tsx::020", "\u05E9\u05DC\u05D7 \u05E4\u05E8\u05E1\u05D5\u05DD"), icon: Upload },
        { key: "profile", label: txt("src/app/supplier/[id]/page.tsx::021", "\u05E2\u05E8\u05D5\u05DA \u05E4\u05E8\u05D5\u05E4\u05D9\u05DC"), icon: Edit },
        { key: "card", label: txt("src/app/supplier/[id]/page.tsx::022", "\u05DB\u05E8\u05D8\u05D9\u05E1 \u05D1\u05D9\u05E7\u05D5\u05E8"), icon: CreditCard },
    ] as const;
    return (<div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="bg-white border-b border-border-subtle shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Logo size="sm"/>
            <div className="flex items-center gap-3">
              <div className="relative" style={{ width: 48, height: 48 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  border: '3px solid #C9A84C',
                  boxShadow: '0 0 8px rgba(201, 168, 76, 0.35)',
                  overflow: 'hidden',
                  background: '#f5f0e8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {supplierData.supplierLogo ? (
                    <img src={supplierData.supplierLogo} alt={supplierData.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span className="text-gold font-bold text-lg">{supplierData.name[0]}</span>
                  )}
                </div>
                {supplierData.isVerified && (
                  <div style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid white',
                  }}>
                    <ShieldCheck className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <div className="text-left">
                <p className="text-gold font-heading font-bold text-lg">{supplierData.name}</p>
                <p className="text-text-muted text-xs">{txt("src/app/supplier/[id]/page.tsx::023", "\u05D3\u05E9\u05D1\u05D5\u05E8\u05D3 \u05E1\u05E4\u05E7")}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation tabs */}
      <nav className="bg-white border-b border-border-subtle overflow-x-auto shadow-sm">
        <div className="max-w-5xl mx-auto px-4 flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (<button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-all duration-200 ${activeTab === tab.key
                    ? "border-gold text-gold font-semibold"
                    : "border-transparent text-text-muted hover:text-text-primary"}`}>
                <Icon className="w-4 h-4"/>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>);
        })}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* ===== OVERVIEW TAB ===== */}
        {activeTab === "overview" && (<div className="space-y-6 animate-in">
            <h2 className="text-xl sm:text-2xl font-heading text-text-primary">{txt("src/app/supplier/[id]/page.tsx::024", "\u05E9\u05DC\u05D5\u05DD")}{supplierData.contactName}
            </h2>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="card-static">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-blue-500"/>
                  <p className="text-text-muted text-xs sm:text-sm">{txt("src/app/supplier/[id]/page.tsx::025", "\u05E1\u05D8\u05D8\u05D5\u05E1 \u05DE\u05E0\u05D5\u05D9")}</p>
                </div>
                <StatusBadge status={supplierData.paymentStatus}/>
                <p className="text-text-muted text-xs mt-2">{supplierData.daysLeft}{txt("src/app/supplier/[id]/page.tsx::026", "\u05D9\u05DE\u05D9\u05DD \u05E0\u05D5\u05EA\u05E8\u05D5")}</p>
                <div className="mt-2 h-1.5 bg-bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-gold rounded-full" style={{ width: `${Math.min((supplierData.daysLeft / 365) * 100, 100)}%` }}/>
                </div>
              </div>

              <div className="card-static">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-emerald-500"/>
                  <p className="text-text-muted text-xs sm:text-sm">{txt("src/app/supplier/[id]/page.tsx::027", "\u05E4\u05E8\u05E1\u05D5\u05DE\u05D9\u05DD \u05D4\u05D7\u05D5\u05D3\u05E9")}</p>
                </div>
                <p className="text-2xl sm:text-3xl font-bold font-mono text-text-primary">{supplierData.postsThisMonth}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className={`w-3 h-3 ${supplierData.postsThisMonth >= supplierData.postsLastMonth ? "text-emerald-500" : "text-red-500"}`}/>
                  <p className="text-text-muted text-xs">
                    {supplierData.postsLastMonth > supplierData.postsThisMonth
                ? `${supplierData.postsLastMonth - supplierData.postsThisMonth} פחות מחודש שעבר`
                : `${supplierData.postsThisMonth - supplierData.postsLastMonth} יותר מחודש שעבר`}
                  </p>
                </div>
              </div>

              <div className="card-static">
                <div className="flex items-center gap-2 mb-2">
                  <HandCoins className="w-4 h-4 text-gold"/>
                  <p className="text-text-muted text-xs sm:text-sm">{txt("src/app/supplier/[id]/page.tsx::028", "\u05E2\u05E1\u05E7\u05D0\u05D5\u05EA \u05DE\u05D3\u05D5\u05D5\u05D7\u05D5\u05EA")}</p>
                </div>
                <p className="text-2xl sm:text-3xl font-bold font-mono text-text-primary">{supplierData.totalDeals}</p>
                <p className="text-text-muted text-xs mt-1">{txt("src/app/supplier/[id]/page.tsx::029", "\u05E1\u05D4&quot;\u05DB \u20AA")}{supplierData.totalDealAmount.toLocaleString()}</p>
              </div>

              <div className="card-static">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-gold"/>
                  <p className="text-text-muted text-xs sm:text-sm">{txt("src/app/supplier/[id]/page.tsx::030", "\u05D4\u05D3\u05D9\u05E8\u05D5\u05D2 \u05E9\u05DC\u05D9")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StarRating rating={supplierData.averageRating} size={18}/>
                  <span className="font-mono font-bold text-xl text-gold">{supplierData.averageRating}</span>
                </div>
                <p className="text-text-muted text-xs mt-1">({supplierData.ratingCount}{txt("src/app/supplier/[id]/page.tsx::031", "\u05D3\u05D9\u05E8\u05D5\u05D2\u05D9\u05DD)")}</p>
              </div>
            </div>

            {/* Recent posts */}
            <div className="card-static">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-heading text-text-primary">{txt("src/app/supplier/[id]/page.tsx::032", "\u05E4\u05E8\u05E1\u05D5\u05DE\u05D9\u05DD \u05D0\u05D7\u05E8\u05D5\u05E0\u05D9\u05DD")}</h3>
                <button onClick={() => setActiveTab("newpost")} className="btn-gold text-sm py-2 px-4 flex items-center gap-1">
                  <Upload className="w-4 h-4"/>{txt("src/app/supplier/[id]/page.tsx::033", "\u05E9\u05DC\u05D7 \u05E4\u05E8\u05E1\u05D5\u05DD")}</button>
              </div>
              <div className="space-y-2">
                {recentPosts.slice(0, 3).map((post) => (<div key={post.id} className="flex items-center justify-between p-3 bg-bg-surface rounded-btn">
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary text-sm truncate">{post.caption}</p>
                      <p className="text-text-muted text-xs">{post.date} | {post.time}</p>
                    </div>
                    <StatusBadge status={post.status} size="sm"/>
                  </div>))}
              </div>
            </div>

            {/* Recent deals */}
            <div className="card-static">
              <h3 className="text-lg font-heading text-text-primary mb-4">{txt("src/app/supplier/[id]/page.tsx::034", "\u05E2\u05E1\u05E7\u05D0\u05D5\u05EA \u05D0\u05D7\u05E8\u05D5\u05E0\u05D5\u05EA")}</h3>
              <div className="space-y-2">
                {recentDeals.slice(0, 3).map((deal) => (<div key={deal.id} className="flex items-center justify-between p-3 bg-bg-surface rounded-btn">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                        <span className="text-gold text-xs font-bold">{deal.designerInitial}</span>
                      </div>
                      <div>
                        <p className="text-text-primary text-sm font-medium">₪{deal.amount.toLocaleString()}</p>
                        <p className="text-text-muted text-xs">{deal.date}</p>
                      </div>
                    </div>
                    {deal.confirmed ? (<span className="badge-green"><CheckCircle2 className="w-3 h-3 ml-1"/>{txt("src/app/supplier/[id]/page.tsx::035", "\u05DE\u05D0\u05D5\u05E9\u05E8")}</span>) : (<span className="badge-yellow"><Clock className="w-3 h-3 ml-1"/>{txt("src/app/supplier/[id]/page.tsx::036", "\u05DE\u05DE\u05EA\u05D9\u05DF")}</span>)}
                  </div>))}
              </div>
            </div>
          </div>)}

        {/* ===== POSTS TAB ===== */}
        {activeTab === "posts" && (<div className="space-y-6 animate-in">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-heading text-text-primary">{txt("src/app/supplier/[id]/page.tsx::037", "\u05D4\u05E4\u05E8\u05E1\u05D5\u05DE\u05D9\u05DD \u05E9\u05DC\u05D9")}</h2>
              <button onClick={() => setActiveTab("newpost")} className="btn-gold text-sm py-2 px-4 flex items-center gap-1">
                <Upload className="w-4 h-4"/>{txt("src/app/supplier/[id]/page.tsx::038", "\u05E4\u05E8\u05E1\u05D5\u05DD \u05D7\u05D3\u05E9")}</button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: txt("src/app/supplier/[id]/page.tsx::039", "\u05E1\u05D4\u05F4\u05DB"), value: recentPosts.length, color: "text-text-primary" },
                { label: txt("src/app/supplier/[id]/page.tsx::040", "\u05E4\u05D5\u05E8\u05E1\u05DE\u05D5"), value: recentPosts.filter(p => p.status === "PUBLISHED").length, color: "text-emerald-600" },
                { label: txt("src/app/supplier/[id]/page.tsx::041", "\u05DE\u05DE\u05EA\u05D9\u05E0\u05D9\u05DD"), value: recentPosts.filter(p => p.status === "PENDING" || p.status === "APPROVED").length, color: "text-amber-600" },
                { label: txt("src/app/supplier/[id]/page.tsx::042", "\u05E0\u05D3\u05D7\u05D5"), value: recentPosts.filter(p => p.status === "REJECTED").length, color: "text-red-500" },
            ].map((s, i) => (<div key={i} className="card-static text-center">
                  <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
                  <p className="text-text-muted text-xs">{s.label}</p>
                </div>))}
            </div>

            <div className="space-y-3">
              {recentPosts.map((post) => (<div key={post.id} className="card-static" style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    border: '2px solid #C9A84C',
                    overflow: 'hidden',
                    background: '#f5f0e8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(201, 168, 76, 0.25)',
                    zIndex: 1,
                  }}>
                    {supplierData.supplierLogo ? (
                      <img src={supplierData.supplierLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span className="text-gold font-bold" style={{ fontSize: 10 }}>{supplierData.name[0]}</span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-text-primary font-medium">{post.caption}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {post.date}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {post.time}</span>
                      </div>
                      {post.status === "REJECTED" && (<p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                          <XCircle className="w-3 h-3"/>{txt("src/app/supplier/[id]/page.tsx::043", "\u05E1\u05D9\u05D1\u05EA \u05D3\u05D7\u05D9\u05D9\u05D4:")}{(post as {
                        rejectionReason?: string;
                    }).rejectionReason}
                        </p>)}
                    </div>
                    <StatusBadge status={post.status}/>
                  </div>
                </div>))}
            </div>
          </div>)}

        {/* ===== DEALS TAB ===== */}
        {activeTab === "deals" && (<div className="space-y-6 animate-in">
            <h2 className="text-xl font-heading text-text-primary">{txt("src/app/supplier/[id]/page.tsx::044", "\u05E2\u05E1\u05E7\u05D0\u05D5\u05EA \u05E9\u05D3\u05D5\u05D5\u05D7\u05D5 \u05E2\u05DC\u05D9\u05D9")}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="card-static text-center">
                <p className="text-2xl font-bold font-mono text-text-primary">{recentDeals.length}</p>
                <p className="text-text-muted text-xs">{txt("src/app/supplier/[id]/page.tsx::045", "\u05E2\u05E1\u05E7\u05D0\u05D5\u05EA")}</p>
              </div>
              <div className="card-static text-center">
                <p className="text-2xl font-bold font-mono text-emerald-600">₪{recentDeals.reduce((s, d) => s + d.amount, 0).toLocaleString()}</p>
                <p className="text-text-muted text-xs">{txt("src/app/supplier/[id]/page.tsx::046", "\u05E1\u05D4\u05F4\u05DB \u05E1\u05DB\u05D5\u05DD")}</p>
              </div>
              <div className="card-static text-center col-span-2 sm:col-span-1">
                <p className="text-2xl font-bold font-mono text-gold">{supplierData.averageRating}/5</p>
                <p className="text-text-muted text-xs">{txt("src/app/supplier/[id]/page.tsx::047", "\u05D3\u05D9\u05E8\u05D5\u05D2 \u05DE\u05DE\u05D5\u05E6\u05E2")}</p>
              </div>
            </div>

            <div className="card-static">
              <h3 className="text-base font-heading text-text-primary mb-3">{txt("src/app/supplier/[id]/page.tsx::048", "\u05DB\u05DC \u05D4\u05E2\u05E1\u05E7\u05D0\u05D5\u05EA")}</h3>
              <div className="overflow-x-auto">
                <table className="w-full table-luxury text-sm">
                  <thead><tr><th>{txt("src/app/supplier/[id]/page.tsx::049", "\u05DE\u05E2\u05E6\u05D1\u05EA")}</th><th>{txt("src/app/supplier/[id]/page.tsx::050", "\u05E1\u05DB\u05D5\u05DD")}</th><th>{txt("src/app/supplier/[id]/page.tsx::051", "\u05EA\u05D0\u05E8\u05D9\u05DA")}</th><th>{txt("src/app/supplier/[id]/page.tsx::052", "\u05E1\u05D8\u05D8\u05D5\u05E1")}</th></tr></thead>
                  <tbody>
                    {recentDeals.map((deal) => (<tr key={deal.id}>
                        <td className="font-medium">
                          <div className="flex items-center gap-2">
                            <div style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              border: '2px solid #C9A84C',
                              overflow: 'hidden',
                              background: '#f5f0e8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              {supplierData.supplierLogo ? (
                                <img src={supplierData.supplierLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <span className="text-gold font-bold" style={{ fontSize: 8 }}>{supplierData.name[0]}</span>
                              )}
                            </div>
                            {deal.designerInitial}
                          </div>
                        </td>
                        <td className="font-mono">₪{deal.amount.toLocaleString()}</td>
                        <td>{deal.date}</td>
                        <td>{deal.confirmed ? <span className="badge-green">{txt("src/app/supplier/[id]/page.tsx::053", "\u05DE\u05D0\u05D5\u05E9\u05E8")}</span> : <span className="badge-yellow">{txt("src/app/supplier/[id]/page.tsx::054", "\u05DE\u05DE\u05EA\u05D9\u05DF")}</span>}</td>
                      </tr>))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>)}

        {/* ===== NEW POST TAB ===== */}
        {activeTab === "newpost" && (<div className="space-y-6 animate-in max-w-lg mx-auto">
            <h2 className="text-xl font-heading text-text-primary">{txt("src/app/supplier/[id]/page.tsx::055", "\u05E9\u05DC\u05D9\u05D7\u05EA \u05E4\u05E8\u05E1\u05D5\u05DD \u05D7\u05D3\u05E9")}</h2>
            <div className="card-static space-y-5">
              <div>
                <label className="text-text-secondary text-sm font-medium block mb-2">{txt("src/app/supplier/[id]/page.tsx::056", "\u05EA\u05DE\u05D5\u05E0\u05D5\u05EA \u05D4\u05E4\u05E8\u05E1\u05D5\u05DD (\u05E2\u05D3 20)")}</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
                  {[1, 2, 3].map(i => (<div key={i} className="aspect-square bg-bg-surface rounded-btn flex items-center justify-center relative group">
                      <ImageIcon className="w-6 h-6 text-text-muted opacity-30"/>
                      <button className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs">
                        <X className="w-3 h-3"/>
                      </button>
                    </div>))}
                  <div className="aspect-square border-2 border-dashed border-border-subtle rounded-btn flex flex-col items-center justify-center cursor-pointer hover:border-gold/50 transition-colors">
                    <Camera className="w-6 h-6 text-text-muted mb-1 opacity-40"/>
                    <span className="text-text-muted text-[10px]">{txt("src/app/supplier/[id]/page.tsx::057", "\u05D4\u05D5\u05E1\u05E3 \u05EA\u05DE\u05D5\u05E0\u05D4")}</span>
                  </div>
                </div>
                <p className="text-text-muted text-xs">{txt("src/app/supplier/[id]/page.tsx::058", "JPG, PNG \u2014 \u05E2\u05D3 5MB \u05DC\u05EA\u05DE\u05D5\u05E0\u05D4 | \u05D4\u05EA\u05DE\u05D5\u05E0\u05D5\u05EA \u05D9\u05D9\u05DE\u05D7\u05E7\u05D5 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA \u05D9\u05D5\u05DD \u05D0\u05D7\u05E8\u05D9 \u05EA\u05D0\u05E8\u05D9\u05DA \u05D4\u05E4\u05E8\u05E1\u05D5\u05DD")}</p>
              </div>

              <div>
                <label className="text-text-secondary text-sm font-medium block mb-2">{txt("src/app/supplier/[id]/page.tsx::059", "\u05D8\u05E7\u05E1\u05D8 \u05D4\u05E4\u05E8\u05E1\u05D5\u05DD")}</label>
                <textarea className="input-field h-32 resize-none" placeholder="\u05DB\u05EA\u05D5\u05D1 \u05D0\u05EA \u05EA\u05D5\u05DB\u05DF \u05D4\u05E4\u05E8\u05E1\u05D5\u05DD..."/>
              </div>

              <div>
                <label className="text-text-secondary text-sm font-medium block mb-2">{txt("src/app/supplier/[id]/page.tsx::061", "\u05E9\u05E2\u05EA \u05E4\u05E8\u05E1\u05D5\u05DD \u05DE\u05D5\u05E2\u05D3\u05E4\u05EA")}</label>
                <div className="grid grid-cols-3 gap-2">
                  {["10:30", "13:30", "20:30"].map((time) => (<button key={time} onClick={() => setSelectedTimeSlot(time)} className={`border rounded-btn py-3 text-center transition-all duration-200 ${selectedTimeSlot === time
                    ? "border-gold bg-gold/10 text-gold font-semibold"
                    : "border-border-subtle hover:border-gold/50 text-text-primary"}`}>
                      <Clock className="w-4 h-4 mx-auto mb-1"/>
                      {time}
                    </button>))}
                </div>
              </div>

              <div className="bg-bg-surface rounded-card p-4">
                <p className="text-text-secondary text-sm font-medium mb-3">{txt("src/app/supplier/[id]/page.tsx::062", "\u05E6&apos;\u05E7\u05DC\u05D9\u05E1\u05D8:")}</p>
                <div className="space-y-2">
                  {[txt("src/app/supplier/[id]/page.tsx::063", "\u05DC\u05D5\u05D2\u05D5 \u05D6\u05D9\u05E8\u05EA \u05D4\u05D0\u05D3\u05E8\u05D9\u05DB\u05DC\u05D5\u05EA \u05D1\u05EA\u05DE\u05D5\u05E0\u05D4"), txt("src/app/supplier/[id]/page.tsx::064", "\u05DC\u05D5\u05D2\u05D5 \u05E9\u05DC\u05D9 \u05D1\u05EA\u05DE\u05D5\u05E0\u05D4"), txt("src/app/supplier/[id]/page.tsx::065", "\u05E7\u05E8\u05D3\u05D9\u05D8 \u05DC\u05DE\u05E2\u05E6\u05D1\u05EA (\u05D0\u05DD \u05E8\u05DC\u05D5\u05D5\u05E0\u05D8\u05D9)")].map((item) => (<label key={item} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="accent-[#C9A84C] w-4 h-4"/>
                      <span className="text-text-primary text-sm">{item}</span>
                    </label>))}
                </div>
              </div>

              <button className="btn-gold w-full flex items-center justify-center gap-2">
                <Send className="w-4 h-4"/>{txt("src/app/supplier/[id]/page.tsx::066", "\u05E9\u05DC\u05D7 \u05DC\u05D0\u05D9\u05E9\u05D5\u05E8 \u05EA\u05DE\u05E8")}</button>
              <p className="text-text-muted text-xs text-center">{txt("src/app/supplier/[id]/page.tsx::067", "\u05D4\u05E4\u05E8\u05E1\u05D5\u05DD \u05D9\u05E9\u05DC\u05D7 \u05DC\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D5\u05EA\u05E7\u05D1\u05DC \u05E2\u05D3\u05DB\u05D5\u05DF \u05DB\u05E9\u05D9\u05D0\u05D5\u05E9\u05E8")}</p>
            </div>
          </div>)}

        {/* ===== PROFILE TAB ===== */}
        {activeTab === "profile" && (<div className="space-y-6 animate-in max-w-2xl mx-auto">
            <h2 className="text-xl font-heading text-text-primary">{txt("src/app/supplier/[id]/page.tsx::068", "\u05E2\u05E8\u05D9\u05DB\u05EA \u05E4\u05E8\u05D5\u05E4\u05D9\u05DC")}</h2>
            <div className="card-static space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl bg-bg-surface border-2 border-dashed border-border-subtle flex items-center justify-center cursor-pointer hover:border-gold/50 transition-colors">
                  <Camera className="w-8 h-8 text-text-muted opacity-40"/>
                </div>
                <div>
                  <p className="text-text-primary font-medium">{txt("src/app/supplier/[id]/page.tsx::069", "\u05DC\u05D5\u05D2\u05D5 \u05D4\u05E2\u05E1\u05E7")}</p>
                  <p className="text-text-muted text-xs">{txt("src/app/supplier/[id]/page.tsx::070", "\u05DC\u05D7\u05E5 \u05DC\u05D4\u05D7\u05DC\u05E4\u05D4 \u2014 JPG/PNG, \u05E2\u05D3 2MB")}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-text-secondary text-sm font-medium block mb-1">{txt("src/app/supplier/[id]/page.tsx::071", "\u05E9\u05DD \u05D4\u05E2\u05E1\u05E7")}</label>
                  <input type="text" className="input-field" defaultValue={supplierData.name}/>
                </div>
                <div>
                  <label className="text-text-secondary text-sm font-medium block mb-1">{txt("src/app/supplier/[id]/page.tsx::072", "\u05D0\u05D9\u05E9 \u05E7\u05E9\u05E8")}</label>
                  <input type="text" className="input-field" defaultValue={supplierData.contactName}/>
                </div>
                <div>
                  <label className="text-text-secondary text-sm font-medium block mb-1 flex items-center gap-1"><Phone className="w-3 h-3"/>{txt("src/app/supplier/[id]/page.tsx::073", "\u05D8\u05DC\u05E4\u05D5\u05DF")}</label>
                  <input type="tel" className="input-field" defaultValue={supplierData.phone} dir="ltr"/>
                </div>
                <div>
                  <label className="text-text-secondary text-sm font-medium block mb-1 flex items-center gap-1"><Mail className="w-3 h-3"/>{txt("src/app/supplier/[id]/page.tsx::074", "\u05DE\u05D9\u05D9\u05DC")}</label>
                  <input type="email" className="input-field" defaultValue={supplierData.email} dir="ltr"/>
                </div>
                <div>
                  <label className="text-text-secondary text-sm font-medium block mb-1 flex items-center gap-1"><Globe className="w-3 h-3"/>{txt("src/app/supplier/[id]/page.tsx::075", "\u05D0\u05EA\u05E8")}</label>
                  <input type="url" className="input-field" defaultValue={supplierData.website} dir="ltr"/>
                </div>
                <div>
                  <label className="text-text-secondary text-sm font-medium block mb-1 flex items-center gap-1"><MapPin className="w-3 h-3"/>{txt("src/app/supplier/[id]/page.tsx::076", "\u05E2\u05D9\u05E8")}</label>
                  <input type="text" className="input-field" defaultValue={supplierData.city}/>
                </div>
              </div>

              <div>
                <label className="text-text-secondary text-sm font-medium block mb-1">{txt("src/app/supplier/[id]/page.tsx::077", "\u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D4")}</label>
                <select className="select-field">{[txt("src/app/supplier/[id]/page.tsx::078", "\u05E8\u05D9\u05E6\u05D5\u05E3 \u05D5\u05D7\u05D9\u05E4\u05D5\u05D9"), txt("src/app/supplier/[id]/page.tsx::079", "\u05EA\u05D0\u05D5\u05E8\u05D4"), txt("src/app/supplier/[id]/page.tsx::080", "\u05E8\u05D9\u05D4\u05D5\u05D8"), txt("src/app/supplier/[id]/page.tsx::081", "\u05DE\u05D8\u05D1\u05D7\u05D9\u05DD"), txt("src/app/supplier/[id]/page.tsx::082", "\u05D0\u05DE\u05D1\u05D8\u05D9\u05D4"), txt("src/app/supplier/[id]/page.tsx::083", "\u05D7\u05D5\u05E5 \u05D5\u05E0\u05D5\u05E3"), txt("src/app/supplier/[id]/page.tsx::084", "\u05D0\u05D7\u05E8")].map(c => <option key={c}>{c}</option>)}</select>
              </div>

              <div>
                <label className="text-text-secondary text-sm font-medium block mb-1">{txt("src/app/supplier/[id]/page.tsx::085", "\u05EA\u05D9\u05D0\u05D5\u05E8 \u05D4\u05E2\u05E1\u05E7")}</label>
                <textarea className="input-field h-24 resize-none" defaultValue={supplierData.description}/>
              </div>

              <div>
                <label className="text-text-secondary text-sm font-medium block mb-2">{txt("src/app/supplier/[id]/page.tsx::086", "\u05D2\u05DC\u05E8\u05D9\u05D9\u05EA \u05E2\u05D1\u05D5\u05D3\u05D5\u05EA")}</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {[1, 2, 3].map(i => (<div key={i} className="aspect-square bg-bg-surface rounded-btn flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-text-muted opacity-30"/>
                    </div>))}
                  <div className="aspect-square border-2 border-dashed border-border-subtle rounded-btn flex flex-col items-center justify-center cursor-pointer hover:border-gold/50 transition-colors">
                    <Upload className="w-5 h-5 text-text-muted mb-1"/>
                    <span className="text-text-muted text-[10px]">{txt("src/app/supplier/[id]/page.tsx::087", "\u05D4\u05D5\u05E1\u05E3")}</span>
                  </div>
                </div>
              </div>

              {/* מעצבות ממליצות — עד 3 */}
              <div>
                <label className="text-text-secondary text-sm font-medium block mb-2 flex items-center gap-1">
                  <UserPlus className="w-3.5 h-3.5"/>{txt("src/app/supplier/[id]/page.tsx::088", "\u05DE\u05E2\u05E6\u05D1\u05D5\u05EA \u05DE\u05DE\u05DC\u05D9\u05E6\u05D5\u05EA (\u05E2\u05D3 3)")}</label>
                <p className="text-text-muted text-xs mb-3">{txt("src/app/supplier/[id]/page.tsx::089", "\u05D4\u05D5\u05E1\u05D9\u05E4\u05D5 \u05DE\u05E2\u05E6\u05D1\u05D5\u05EA \u05E9\u05DE\u05DE\u05DC\u05D9\u05E6\u05D5\u05EA \u05E2\u05DC\u05D9\u05DB\u05DD \u2014 \u05D4\u05E9\u05DD \u05D5\u05D4\u05D8\u05DC\u05E4\u05D5\u05DF \u05D9\u05D5\u05E6\u05D2\u05D5 \u05DC\u05DB\u05DC \u05D4\u05DE\u05E2\u05E6\u05D1\u05D5\u05EA \u05D1\u05E7\u05D4\u05D9\u05DC\u05D4")}</p>
                <div className="space-y-2 mb-3">
                  {recommenders.map((rec) => (<div key={rec.id} className="flex items-center justify-between p-3 bg-bg-surface rounded-btn group" style={{ position: 'relative' }}>
                      <div style={{
                        position: 'absolute',
                        bottom: 6,
                        left: 6,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        background: '#f5f0e8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0.3,
                      }}>
                        {supplierData.supplierLogo ? (
                          <img src={supplierData.supplierLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span className="text-gold font-bold" style={{ fontSize: 7 }}>{supplierData.name[0]}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold text-xs font-bold">
                          {rec.name[0]}
                        </div>
                        <div>
                          <p className="text-text-primary text-sm font-medium">{rec.name}</p>
                          <p className="text-text-muted text-xs" dir="ltr">{rec.phone}</p>
                        </div>
                      </div>
                      <button onClick={() => handleRemoveRecommender(rec.id)} className="text-text-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                        <X className="w-4 h-4"/>
                      </button>
                    </div>))}
                </div>
                {recommenders.length < 3 && (<>
                    {showAddRecommender ? (<div className="border border-border-subtle rounded-card p-3 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <input type="text" placeholder="\u05E9\u05DD \u05D4\u05DE\u05E2\u05E6\u05D1\u05EA" value={newRecommender.name} onChange={(e) => setNewRecommender({ ...newRecommender, name: e.target.value })} className="input-field text-sm"/>
                          <input type="tel" placeholder="\u05D8\u05DC\u05E4\u05D5\u05DF" value={newRecommender.phone} onChange={(e) => setNewRecommender({ ...newRecommender, phone: e.target.value })} className="input-field text-sm" dir="ltr"/>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleAddRecommender} disabled={!newRecommender.name || !newRecommender.phone} className="btn-gold text-sm py-1.5 flex-1 disabled:opacity-50">{txt("src/app/supplier/[id]/page.tsx::092", "\u05D4\u05D5\u05E1\u05E3")}</button>
                          <button onClick={() => { setShowAddRecommender(false); setNewRecommender({ name: "", phone: "" }); }} className="btn-outline text-sm py-1.5 flex-1">{txt("src/app/supplier/[id]/page.tsx::093", "\u05D1\u05D9\u05D8\u05D5\u05DC")}</button>
                        </div>
                      </div>) : (<button onClick={() => setShowAddRecommender(true)} className="btn-outline text-sm w-full flex items-center justify-center gap-1 py-2">
                        <Plus className="w-4 h-4"/>{txt("src/app/supplier/[id]/page.tsx::094", "\u05D4\u05D5\u05E1\u05E3 \u05DE\u05E2\u05E6\u05D1\u05EA \u05DE\u05DE\u05DC\u05D9\u05E6\u05D4 (")}{recommenders.length}/3)
                      </button>)}
                  </>)}
              </div>

              <div className="flex gap-3">
                <button className="btn-gold flex-1 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4"/>{txt("src/app/supplier/[id]/page.tsx::095", "\u05E9\u05DE\u05D5\u05E8 \u05E9\u05D9\u05E0\u05D5\u05D9\u05D9\u05DD")}</button>
                <button className="btn-outline flex items-center gap-2">
                  <Eye className="w-4 h-4"/>{txt("src/app/supplier/[id]/page.tsx::096", "\u05EA\u05E6\u05D5\u05D2\u05D4 \u05DE\u05E7\u05D3\u05D9\u05DE\u05D4")}</button>
              </div>
            </div>
          </div>)}

        {/* ===== BUSINESS CARD TAB ===== */}
        {activeTab === "card" && (<div className="animate-in">
            <BusinessCardBuilder userName={supplierData.contactName} userRole={supplierData.category} userPhone={supplierData.phone} userEmail={supplierData.email}/>
          </div>)}
      </main>
    </div>);
}
