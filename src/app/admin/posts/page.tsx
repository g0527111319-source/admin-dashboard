"use client";
import { txt } from "@/content/siteText";
import { useState } from "react";
import { FileText, Check, X, Clock, Calendar, Image as ImageIcon, } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
interface PendingPost {
    id: string;
    supplierName: string;
    supplierLogo?: string;
    caption: string;
    imageUrl: string;
    images: string[]; // עד 20 תמונות
    scheduledTime: string;
    scheduledDate: string;
    status: string;
    hasLogo: boolean;
    hasSupplierLogo: boolean;
    hasDesignerCredit: boolean;
    createdAt: string;
    autoDeleteAt?: string; // מחיקה אוטומטית יום אחרי הפרסום
}
const ALL_POSTS_FILTER = "__ALL__";
const OTHER_REJECTION_REASON = "__OTHER__";
const demoPosts: PendingPost[] = [
    {
        id: "1",
        supplierName: txt("src/app/admin/posts/page.tsx::001", "\u05E1\u05D8\u05D5\u05DF \u05D3\u05D9\u05D6\u05D9\u05D9\u05DF"),
        caption: txt("src/app/admin/posts/page.tsx::002", "\u05E7\u05D5\u05DC\u05E7\u05E6\u05D9\u05D9\u05EA \u05D0\u05E8\u05D9\u05D7\u05D9 \u05E4\u05D5\u05E8\u05E6\u05DC\u05DF \u05D7\u05D3\u05E9\u05D4 \u2014 \u05D2\u05D5\u05D5\u05E0\u05D9\u05DD \u05D8\u05D1\u05E2\u05D9\u05D9\u05DD \u05D1\u05D4\u05E9\u05E8\u05D0\u05EA \u05D4\u05D0\u05D3\u05DE\u05D4. \u05DE\u05D7\u05D9\u05E8\u05D9\u05DD \u05DE\u05D9\u05D5\u05D7\u05D3\u05D9\u05DD \u05DC\u05DE\u05E2\u05E6\u05D1\u05D5\u05EA \u05D6\u05D9\u05E8\u05EA \u05D4\u05D0\u05D3\u05E8\u05D9\u05DB\u05DC\u05D5\u05EA!"),
        imageUrl: "/demo/post1.jpg",
        images: ["/demo/post1.jpg", "/demo/post1b.jpg", "/demo/post1c.jpg"],
        scheduledTime: "10:30",
        scheduledDate: "2026-03-09",
        status: "PENDING",
        hasLogo: true,
        hasSupplierLogo: true,
        hasDesignerCredit: false,
        createdAt: "2026-03-09T08:15:00",
        autoDeleteAt: "2026-03-10",
    },
    {
        id: "2",
        supplierName: txt("src/app/admin/posts/page.tsx::003", "\u05D0\u05D5\u05E8 \u05EA\u05D0\u05D5\u05E8\u05D4"),
        caption: txt("src/app/admin/posts/page.tsx::004", "\u05D2\u05D5\u05E4\u05D9 \u05EA\u05D0\u05D5\u05E8\u05D4 \u05D3\u05E7\u05D5\u05E8\u05D8\u05D9\u05D1\u05D9\u05D9\u05DD \u05DE\u05E7\u05D5\u05DC\u05E7\u05E6\u05D9\u05D9\u05EA 2026 \u2014 \u05E2\u05D9\u05E6\u05D5\u05D1 \u05E1\u05E7\u05E0\u05D3\u05D9\u05E0\u05D1\u05D9 \u05DE\u05D9\u05E0\u05D9\u05DE\u05DC\u05D9\u05E1\u05D8\u05D9. \u05D4\u05E0\u05D7\u05D4 15% \u05DC\u05D7\u05D1\u05E8\u05D5\u05EA \u05D4\u05E7\u05D4\u05D9\u05DC\u05D4"),
        imageUrl: "/demo/post2.jpg",
        images: ["/demo/post2.jpg"],
        scheduledTime: "13:30",
        scheduledDate: "2026-03-09",
        status: "PENDING",
        hasLogo: true,
        hasSupplierLogo: true,
        hasDesignerCredit: true,
        createdAt: "2026-03-09T09:30:00",
        autoDeleteAt: "2026-03-10",
    },
    {
        id: "3",
        supplierName: txt("src/app/admin/posts/page.tsx::005", "\u05E7\u05D9\u05D8\u05E9\u05DF \u05E4\u05DC\u05D5\u05E1"),
        caption: txt("src/app/admin/posts/page.tsx::006", "\u05DE\u05D8\u05D1\u05D7 \u05D7\u05DC\u05D5\u05DE\u05D9? \u05D4\u05E0\u05D4 \u05E4\u05E8\u05D5\u05D9\u05E7\u05D8 \u05E9\u05E1\u05D9\u05D9\u05DE\u05E0\u05D5 \u2014 \u05E9\u05D9\u05E9 \u05E7\u05DC\u05E7\u05D8\u05D4 \u05DE\u05E8\u05D4\u05D9\u05D1 \u05E2\u05DD \u05D0\u05E8\u05D5\u05E0\u05D5\u05EA \u05D0\u05DC\u05D5\u05DF. \u05D1\u05D5\u05D0\u05D5 \u05DC\u05E8\u05D0\u05D5\u05EA \u05D0\u05EA \u05D4\u05D0\u05D5\u05DC\u05DD \u05E9\u05DC\u05E0\u05D5!"),
        imageUrl: "/demo/post3.jpg",
        images: ["/demo/post3.jpg", "/demo/post3b.jpg"],
        scheduledTime: "20:30",
        scheduledDate: "2026-03-09",
        status: "PENDING",
        hasLogo: false,
        hasSupplierLogo: true,
        hasDesignerCredit: true,
        createdAt: "2026-03-08T16:45:00",
        autoDeleteAt: "2026-03-10",
    },
    {
        id: "4",
        supplierName: txt("src/app/admin/posts/page.tsx::007", "\u05E1\u05D8\u05D5\u05DF \u05D3\u05D9\u05D6\u05D9\u05D9\u05DF"),
        caption: txt("src/app/admin/posts/page.tsx::008", "\u05E4\u05E8\u05D5\u05D9\u05E7\u05D8 \u05DE\u05D5\u05E9\u05DC\u05DD \u2014 \u05E8\u05D9\u05E6\u05D5\u05E3 \u05D8\u05E8\u05D0\u05E6\u05D5 \u05D1\u05D3\u05D9\u05E8\u05EA \u05D2\u05DF \u05D1\u05EA\u05DC \u05D0\u05D1\u05D9\u05D1"),
        imageUrl: "/demo/post4.jpg",
        images: ["/demo/post4.jpg", "/demo/post4b.jpg", "/demo/post4c.jpg", "/demo/post4d.jpg", "/demo/post4e.jpg"],
        scheduledTime: "10:30",
        scheduledDate: "2026-03-10",
        status: "APPROVED",
        hasLogo: true,
        hasSupplierLogo: true,
        hasDesignerCredit: true,
        createdAt: "2026-03-08T14:00:00",
        autoDeleteAt: "2026-03-11",
    },
];
const rejectionReasons = [
    { value: "missingCommunityLogo", label: txt("src/app/admin/posts/page.tsx::009", "\u05D7\u05E1\u05E8 \u05DC\u05D5\u05D2\u05D5 \u05D4\u05E7\u05D4\u05D9\u05DC\u05D4") },
    { value: "missingSupplierLogo", label: txt("src/app/admin/posts/page.tsx::010", "\u05D7\u05E1\u05E8 \u05DC\u05D5\u05D2\u05D5 \u05D4\u05E1\u05E4\u05E7") },
    { value: "missingDesignerCredit", label: txt("src/app/admin/posts/page.tsx::011", "\u05D7\u05E1\u05E8 \u05E7\u05E8\u05D3\u05D9\u05D8 \u05DE\u05E2\u05E6\u05D1\u05EA") },
    { value: "lowImageQuality", label: txt("src/app/admin/posts/page.tsx::012", "\u05D0\u05D9\u05DB\u05D5\u05EA \u05EA\u05DE\u05D5\u05E0\u05D4 \u05E0\u05DE\u05D5\u05DB\u05D4") },
    { value: "invalidContent", label: txt("src/app/admin/posts/page.tsx::013", "\u05EA\u05D5\u05DB\u05DF \u05DC\u05D0 \u05DE\u05EA\u05D0\u05D9\u05DD") },
    { value: OTHER_REJECTION_REASON, label: txt("src/app/admin/posts/page.tsx::014", "\u05D0\u05D7\u05E8") },
];
const postStatusFilters = [
    { value: "PENDING", label: null },
    { value: "APPROVED", label: txt("src/app/admin/posts/page.tsx::022", "\u05DE\u05D0\u05D5\u05E9\u05E8\u05D9\u05DD") },
    { value: "REJECTED", label: txt("src/app/admin/posts/page.tsx::023", "\u05E0\u05D3\u05D7\u05D5") },
    { value: "PUBLISHED", label: txt("src/app/admin/posts/page.tsx::024", "\u05E4\u05D5\u05E8\u05E1\u05DE\u05D5") },
    { value: ALL_POSTS_FILTER, label: txt("src/app/admin/posts/page.tsx::021", "\u05D4\u05DB\u05DC") },
] as const;
export default function PostsManagementPage() {
    const [posts] = useState(demoPosts);
    const [filter, setFilter] = useState<string>("PENDING");
    const [selectedPost, setSelectedPost] = useState<PendingPost | null>(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const filteredPosts = posts.filter((p) => filter === ALL_POSTS_FILTER || p.status === filter);
    const pendingCount = posts.filter((p) => p.status === "PENDING").length;
    const handleApprove = (postId: string) => {
        // TODO: API call
        console.log("Approving post:", postId);
    };
    const handleReject = (postId: string) => {
        // TODO: API call
        console.log("Rejecting post:", postId, "Reason:", rejectReason);
        setShowRejectModal(false);
        setRejectReason("");
    };
    return (<div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-heading text-text-primary flex items-center gap-2">
            <FileText className="w-7 h-7"/>{txt("src/app/admin/posts/page.tsx::016", "\u05E0\u05D9\u05D4\u05D5\u05DC \u05E4\u05E8\u05E1\u05D5\u05DE\u05D9\u05DD")}</h1>
          <p className="text-text-muted text-sm mt-1">
            {pendingCount > 0 ? (<span className="text-yellow-400">{pendingCount}{txt("src/app/admin/posts/page.tsx::017", "\u05E4\u05E8\u05E1\u05D5\u05DE\u05D9\u05DD \u05DE\u05DE\u05EA\u05D9\u05E0\u05D9\u05DD \u05DC\u05D0\u05D9\u05E9\u05D5\u05E8")}</span>) : (txt("src/app/admin/posts/page.tsx::018", "\u05D0\u05D9\u05DF \u05E4\u05E8\u05E1\u05D5\u05DE\u05D9\u05DD \u05DE\u05DE\u05EA\u05D9\u05E0\u05D9\u05DD"))}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {postStatusFilters.map((status) => (<button key={status.value} onClick={() => setFilter(status.value)} className={`px-4 py-2 rounded-btn text-sm transition-all duration-200 ${filter === status.value
                ? "bg-gold text-bg font-bold"
                : "bg-bg-surface text-text-muted hover:text-gold border border-border-subtle"}`}>
            {status.value === "PENDING" ? `${txt("src/app/admin/waitlist/page.tsx::021", "\u05DE\u05DE\u05EA\u05D9\u05E0\u05D4")} (${pendingCount})` : status.label}
          </button>))}
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredPosts.map((post) => (<div key={post.id} className="card-static">
            {/* Post header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold text-sm font-bold">
                  {post.supplierName[0]}
                </div>
                <div>
                  <p className="text-text-primary font-medium text-sm">{post.supplierName}</p>
                  <div className="flex items-center gap-2 text-text-muted text-xs">
                    <Clock className="w-3 h-3"/>
                    {post.scheduledTime}
                    <Calendar className="w-3 h-3 mr-2"/>
                    {post.scheduledDate}
                  </div>
                </div>
              </div>
              <StatusBadge status={post.status}/>
            </div>

            {/* Image placeholder with count */}
            <div className="bg-bg-surface rounded-card h-48 flex items-center justify-center mb-3 border border-border-subtle relative">
              <ImageIcon className="w-12 h-12 text-text-muted opacity-30"/>
              {post.images.length > 1 && (<div className="absolute top-2 left-2 bg-gold/90 text-white text-xs font-bold rounded-full px-2 py-0.5">
                  {post.images.length}{txt("src/app/admin/posts/page.tsx::025", "\u05EA\u05DE\u05D5\u05E0\u05D5\u05EA")}</div>)}
              {post.images.length > 0 && (<div className="absolute bottom-2 left-2 text-text-muted text-[10px]">{txt("src/app/admin/posts/page.tsx::026", "\u05E2\u05D3 20 \u05EA\u05DE\u05D5\u05E0\u05D5\u05EA")}</div>)}
            </div>

            {/* Auto-delete info */}
            {post.autoDeleteAt && (<div className="flex items-center gap-1 text-text-muted text-xs mb-2">
                <Clock className="w-3 h-3"/>
                <span>{txt("src/app/admin/posts/page.tsx::027", "\u05DE\u05D7\u05D9\u05E7\u05D4 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA:")}{post.autoDeleteAt}</span>
              </div>)}

            {/* Caption */}
            <p className="text-text-primary text-sm leading-relaxed mb-3">
              {post.caption}
            </p>

            {/* Checklist */}
            <div className="flex gap-3 mb-4 text-xs">
              <span className={post.hasLogo ? "text-emerald-600" : "text-red-500"}>
                {post.hasLogo ? "✓" : "✗"}{txt("src/app/admin/posts/page.tsx::028", "\u05DC\u05D5\u05D2\u05D5 \u05E7\u05D4\u05D9\u05DC\u05D4")}</span>
              <span className={post.hasSupplierLogo ? "text-emerald-600" : "text-red-500"}>
                {post.hasSupplierLogo ? "✓" : "✗"}{txt("src/app/admin/posts/page.tsx::029", "\u05DC\u05D5\u05D2\u05D5 \u05E1\u05E4\u05E7")}</span>
              <span className={post.hasDesignerCredit ? "text-emerald-600" : "text-red-500"}>
                {post.hasDesignerCredit ? "✓" : "✗"}{txt("src/app/admin/posts/page.tsx::030", "\u05E7\u05E8\u05D3\u05D9\u05D8 \u05DE\u05E2\u05E6\u05D1\u05EA")}</span>
            </div>

            {/* Actions */}
            {post.status === "PENDING" && (<div className="flex gap-2">
                <button onClick={() => handleApprove(post.id)} className="btn-gold flex-1 flex items-center justify-center gap-2 text-sm">
                  <Check className="w-4 h-4"/>{txt("src/app/admin/posts/page.tsx::031", "\u05D0\u05E9\u05E8")}</button>
                <button onClick={() => {
                    setSelectedPost(post);
                    setShowRejectModal(true);
                }} className="btn-danger flex-1 flex items-center justify-center gap-2 text-sm">
                  <X className="w-4 h-4"/>{txt("src/app/admin/posts/page.tsx::032", "\u05D3\u05D7\u05D4")}</button>
                <button className="btn-outline px-3 text-sm">
                  <Calendar className="w-4 h-4"/>
                </button>
              </div>)}
          </div>))}
      </div>

      {filteredPosts.length === 0 && (<div className="text-center py-12 text-text-muted">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30"/>
          <p>{txt("src/app/admin/posts/page.tsx::033", "\u05D0\u05D9\u05DF \u05E4\u05E8\u05E1\u05D5\u05DE\u05D9\u05DD \u05D1\u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D4 \u05D6\u05D5")}</p>
        </div>)}

      {/* Reject Modal */}
      {showRejectModal && selectedPost && (<div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-bg-surface border border-border-gold rounded-card p-6 max-w-md w-full">
            <h3 className="text-lg font-heading text-text-primary mb-4">{txt("src/app/admin/posts/page.tsx::034", "\u05D3\u05D7\u05D9\u05D9\u05EA \u05E4\u05E8\u05E1\u05D5\u05DD \u2014")}{selectedPost.supplierName}
            </h3>
            <div className="space-y-3 mb-4">
              <p className="text-text-muted text-sm">{txt("src/app/admin/posts/page.tsx::035", "\u05D1\u05D7\u05E8 \u05E1\u05D9\u05D1\u05EA \u05D3\u05D7\u05D9\u05D9\u05D4:")}</p>
              {rejectionReasons.map((reason) => (<label key={reason.value} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="reason" value={reason.value} checked={rejectReason === reason.value} onChange={() => setRejectReason(reason.value)} className="accent-gold"/>
                  <span className="text-text-primary text-sm">{reason.label}</span>
                </label>))}
              {rejectReason === OTHER_REJECTION_REASON && (<textarea placeholder="פרט את הסיבה..." className="input-dark h-20 resize-none"/>)}
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleReject(selectedPost.id)} className="btn-danger flex-1" disabled={!rejectReason}>{txt("src/app/admin/posts/page.tsx::038", "\u05D3\u05D7\u05D4 \u05D5\u05E9\u05DC\u05D7 \u05D4\u05D5\u05D3\u05E2\u05D4 \u05DC\u05E1\u05E4\u05E7")}</button>
              <button onClick={() => {
                setShowRejectModal(false);
                setRejectReason("");
            }} className="btn-outline flex-1">{txt("src/app/admin/posts/page.tsx::039", "\u05D1\u05D9\u05D8\u05D5\u05DC")}</button>
            </div>
          </div>
        </div>)}
    </div>);
}
