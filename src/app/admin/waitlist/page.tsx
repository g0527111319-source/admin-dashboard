"use client";
import { txt } from "@/content/siteText";
import { useState } from "react";
import { UserPlus, Check, X, Phone, Mail, MapPin, Clock, Search, Briefcase, } from "lucide-react";
interface WaitlistDesigner {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    city: string;
    specialization: string;
    employmentType: "SALARIED" | "FREELANCE";
    yearsAsIndependent: number;
    appliedAt: string;
    approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
}
const ALL_WAITLIST_FILTER = "__ALL__";
const demoWaitlist: WaitlistDesigner[] = [
    {
        id: "w1",
        fullName: txt("src/app/admin/waitlist/page.tsx::001", "\u05D8\u05DC \u05D0\u05D1\u05D9\u05D8\u05DF"),
        email: "tal@design.co.il",
        phone: "0521234567",
        city: txt("src/app/admin/waitlist/page.tsx::002", "\u05EA\u05DC \u05D0\u05D1\u05D9\u05D1"),
        specialization: txt("src/app/admin/waitlist/page.tsx::003", "\u05E2\u05D9\u05E6\u05D5\u05D1 \u05E4\u05E0\u05D9\u05DD"),
        employmentType: "FREELANCE",
        yearsAsIndependent: 5,
        appliedAt: "2026-03-10",
        approvalStatus: "PENDING",
    },
    {
        id: "w2",
        fullName: txt("src/app/admin/waitlist/page.tsx::004", "\u05D4\u05D9\u05DC\u05D4 \u05D1\u05E8\u05E7\u05D5\u05D1\u05D9\u05E5'"),
        email: "hila@arch.co.il",
        phone: "0509876543",
        city: txt("src/app/admin/waitlist/page.tsx::005", "\u05D4\u05E8\u05E6\u05DC\u05D9\u05D4"),
        specialization: txt("src/app/admin/waitlist/page.tsx::006", "\u05D0\u05D3\u05E8\u05D9\u05DB\u05DC\u05D5\u05EA"),
        employmentType: "SALARIED",
        yearsAsIndependent: 3,
        appliedAt: "2026-03-09",
        approvalStatus: "PENDING",
    },
    {
        id: "w3",
        fullName: txt("src/app/admin/waitlist/page.tsx::007", "\u05D3\u05E0\u05D4 \u05E9\u05E4\u05D9\u05E8\u05D0"),
        email: "dana@interiors.co.il",
        phone: "0541122334",
        city: txt("src/app/admin/waitlist/page.tsx::008", "\u05D9\u05E8\u05D5\u05E9\u05DC\u05D9\u05DD"),
        specialization: txt("src/app/admin/waitlist/page.tsx::009", "\u05E2\u05D9\u05E6\u05D5\u05D1 \u05E4\u05E0\u05D9\u05DD"),
        employmentType: "FREELANCE",
        yearsAsIndependent: 8,
        appliedAt: "2026-03-08",
        approvalStatus: "PENDING",
    },
];
export default function WaitlistPage() {
    const [designers, setDesigners] = useState(demoWaitlist);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<string>("PENDING");
    const filtered = designers.filter((d) => {
        const matchSearch = !search || d.fullName.includes(search) || d.email.includes(search) || d.city.includes(search);
        const matchFilter = filter === ALL_WAITLIST_FILTER || d.approvalStatus === filter;
        return matchSearch && matchFilter;
    });
    const pendingCount = designers.filter(d => d.approvalStatus === "PENDING").length;
    const handleApprove = (id: string) => {
        setDesigners(prev => prev.map(d => d.id === id ? { ...d, approvalStatus: "APPROVED" as const } : d));
        // TODO: API call to approve and move to active designers
    };
    const handleReject = (id: string) => {
        setDesigners(prev => prev.map(d => d.id === id ? { ...d, approvalStatus: "REJECTED" as const } : d));
        // TODO: API call to reject
    };
    return (<div className="space-y-6 animate-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading text-text-primary flex items-center gap-2">
          <UserPlus className="w-7 h-7"/>{txt("src/app/admin/waitlist/page.tsx::011", "\u05E8\u05E9\u05D9\u05DE\u05EA \u05D4\u05DE\u05EA\u05E0\u05D4")}</h1>
        <p className="text-text-muted text-sm mt-1">
          {pendingCount > 0 ? (<span className="text-yellow-500">{pendingCount}{txt("src/app/admin/waitlist/page.tsx::012", "\u05DE\u05E2\u05E6\u05D1\u05D5\u05EA \u05DE\u05DE\u05EA\u05D9\u05E0\u05D5\u05EA \u05DC\u05D0\u05D9\u05E9\u05D5\u05E8")}</span>) : (txt("src/app/admin/waitlist/page.tsx::013", "\u05D0\u05D9\u05DF \u05D1\u05E7\u05E9\u05D5\u05EA \u05DE\u05DE\u05EA\u05D9\u05E0\u05D5\u05EA"))}
        </p>
      </div>

      {/* Filters */}
      <div className="card-static">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"/>
            <input type="text" placeholder="\u05D7\u05D9\u05E4\u05D5\u05E9 \u05E9\u05DD / \u05DE\u05D9\u05D9\u05DC / \u05E2\u05D9\u05E8..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-dark pr-10"/>
          </div>
          <div className="flex gap-2">
            {([
                { value: "PENDING", label: null },
                { value: "APPROVED", label: txt("src/app/admin/waitlist/page.tsx::016", "\u05D0\u05D5\u05E9\u05E8\u05D5") },
                { value: "REJECTED", label: txt("src/app/admin/waitlist/page.tsx::017", "\u05E0\u05D3\u05D7\u05D5") },
                { value: ALL_WAITLIST_FILTER, label: txt("src/app/admin/waitlist/page.tsx::019", "\u05D4\u05DB\u05DC") },
            ] as const).map((status) => (<button key={status.value} onClick={() => setFilter(status.value)} className={`px-3 py-2 rounded-btn text-xs transition-all ${filter === status.value
                ? "bg-gold text-bg font-bold"
                : "bg-bg-surface text-text-muted hover:text-gold border border-border-subtle"}`}>
                {status.value === "PENDING" ? `${txt("src/app/admin/waitlist/page.tsx::021", "\u05DE\u05DE\u05EA\u05D9\u05E0\u05D4")} (${pendingCount})` : status.label}
              </button>))}
          </div>
        </div>
      </div>

      {/* Waitlist Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((d) => (<div key={d.id} className={`card-static ${d.approvalStatus === "APPROVED"
                ? "border-emerald-500/30"
                : d.approvalStatus === "REJECTED"
                    ? "border-red-500/30"
                    : "border-gold/30"}`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-heading text-text-primary text-lg font-bold">
                  {d.fullName}
                </h3>
                <div className="flex items-center gap-1 text-text-muted text-xs mt-1">
                  <Clock className="w-3 h-3"/>{txt("src/app/admin/waitlist/page.tsx::020", "\u05D4\u05D2\u05D9\u05E9\u05D4 \u05D1-")}{d.appliedAt}
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${d.approvalStatus === "PENDING"
                ? "bg-yellow-50 text-yellow-600"
                : d.approvalStatus === "APPROVED"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-red-50 text-red-600"}`}>
                {d.approvalStatus === "PENDING" ? txt("src/app/admin/waitlist/page.tsx::021", "\u05DE\u05DE\u05EA\u05D9\u05E0\u05D4") : d.approvalStatus === "APPROVED" ? txt("src/app/admin/waitlist/page.tsx::022", "\u05D0\u05D5\u05E9\u05E8\u05D4") : txt("src/app/admin/waitlist/page.tsx::023", "\u05E0\u05D3\u05D7\u05EA\u05D4")}
              </span>
            </div>

            {/* Details */}
            <div className="space-y-2 text-sm mb-4">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-text-muted"/>
                <span className="text-text-primary" dir="ltr">{d.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-text-muted"/>
                <span className="text-text-primary" dir="ltr">{d.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-text-muted"/>
                <span className="text-text-primary">{d.city}</span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5 text-text-muted"/>
                <span className="text-text-primary">{d.specialization}</span>
              </div>
            </div>

            {/* Employment info */}
            <div className="flex gap-2 mb-4 text-xs">
              <span className="bg-bg-surface rounded px-2 py-1 text-text-primary">
                {d.employmentType === "FREELANCE" ? txt("src/app/admin/waitlist/page.tsx::024", "\u05E2\u05E6\u05DE\u05D0\u05D9\u05EA") : txt("src/app/admin/waitlist/page.tsx::025", "\u05E9\u05DB\u05D9\u05E8\u05D4")}
              </span>
              <span className="bg-bg-surface rounded px-2 py-1 text-text-primary">
                {d.yearsAsIndependent}{txt("src/app/admin/waitlist/page.tsx::026", "\u05E9\u05E0\u05D5\u05EA \u05D5\u05D5\u05EA\u05E7")}</span>
            </div>

            {/* Actions */}
            {d.approvalStatus === "PENDING" && (<div className="flex gap-2">
                <button onClick={() => handleApprove(d.id)} className="btn-gold flex-1 flex items-center justify-center gap-2 text-sm py-2">
                  <Check className="w-4 h-4"/>{txt("src/app/admin/waitlist/page.tsx::027", "\u05D0\u05E9\u05E8 \u05D4\u05E6\u05D8\u05E8\u05E4\u05D5\u05EA")}</button>
                <button onClick={() => handleReject(d.id)} className="btn-outline flex-1 flex items-center justify-center gap-2 text-sm py-2 text-red-500 border-red-200 hover:bg-red-50">
                  <X className="w-4 h-4"/>{txt("src/app/admin/waitlist/page.tsx::028", "\u05D3\u05D7\u05D4")}</button>
              </div>)}
          </div>))}
      </div>

      {filtered.length === 0 && (<div className="text-center py-12 text-text-muted">
          <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-30"/>
          <p>{txt("src/app/admin/waitlist/page.tsx::029", "\u05D0\u05D9\u05DF \u05D1\u05E7\u05E9\u05D5\u05EA \u05D1\u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D4 \u05D6\u05D5")}</p>
        </div>)}
    </div>);
}


