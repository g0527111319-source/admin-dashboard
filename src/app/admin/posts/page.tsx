"use client";
import { txt } from "@/content/siteText";
import { useState, useEffect } from "react";
import { FileText, Check, X, Clock, Calendar, Image as ImageIcon, Loader2, AlertTriangle, } from "lucide-react";
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPostFromApi(p: any): PendingPost {
    return {
        id: p.id,
        supplierName: p.supplier?.name || "",
        supplierLogo: p.supplier?.logo || undefined,
        caption: p.caption || "",
        imageUrl: p.imageUrl || (p.images?.[0]) || "",
        images: p.images || (p.imageUrl ? [p.imageUrl] : []),
        scheduledTime: p.scheduledTime || "",
        scheduledDate: p.scheduledDate ? new Date(p.scheduledDate).toISOString().slice(0, 10) : "",
        status: p.status || "PENDING",
        hasLogo: p.hasLogo ?? false,
        hasSupplierLogo: p.hasSupplierLogo ?? false,
        hasDesignerCredit: p.hasDesignerCredit ?? false,
        createdAt: p.createdAt || "",
        autoDeleteAt: p.autoDeleteAt ? new Date(p.autoDeleteAt).toISOString().slice(0, 10) : undefined,
    };
}
const rejectionReasons = [
    { value: "missingCommunityLogo", label: txt("src/app/admin/posts/page.tsx::009", "חסר לוגו הקהילה") },
    { value: "missingSupplierLogo", label: txt("src/app/admin/posts/page.tsx::010", "חסר לוגו הספק") },
    { value: "missingDesignerCredit", label: txt("src/app/admin/posts/page.tsx::011", "חסר קרדיט מעצבת") },
    { value: "lowImageQuality", label: txt("src/app/admin/posts/page.tsx::012", "איכות תמונה נמוכה") },
    { value: "invalidContent", label: txt("src/app/admin/posts/page.tsx::013", "תוכן לא מתאים") },
    { value: OTHER_REJECTION_REASON, label: txt("src/app/admin/posts/page.tsx::014", "אחר") },
];
const postStatusFilters = [
    { value: "PENDING", label: null },
    { value: "APPROVED", label: txt("src/app/admin/posts/page.tsx::022", "מאושרים") },
    { value: "REJECTED", label: txt("src/app/admin/posts/page.tsx::023", "נדחו") },
    { value: "PUBLISHED", label: txt("src/app/admin/posts/page.tsx::024", "פורסמו") },
    { value: ALL_POSTS_FILTER, label: txt("src/app/admin/posts/page.tsx::021", "הכל") },
] as const;
export default function PostsManagementPage() {
    const [posts, setPosts] = useState<PendingPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>("PENDING");

    useEffect(() => {
        setLoading(true);
        fetch("/api/posts")
            .then((res) => { if (!res.ok) throw new Error("fetch failed"); return res.json(); })
            .then((data) => {
                if (Array.isArray(data)) {
                    setPosts(data.map(mapPostFromApi));
                }
            })
            .catch(() => setError("שגיאה בטעינת פרסומים. נסו לרענן את הדף."))
            .finally(() => setLoading(false));
    }, []);
    const [selectedPost, setSelectedPost] = useState<PendingPost | null>(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const filteredPosts = posts.filter((p) => filter === ALL_POSTS_FILTER || p.status === filter);
    const pendingCount = posts.filter((p) => p.status === "PENDING").length;
    const reloadPosts = async () => {
        try {
            const data = await fetch("/api/posts").then((r) => r.json()).catch(() => []);
            if (Array.isArray(data)) setPosts(data.map(mapPostFromApi));
        } catch { /* ignore */ }
    };
    const handleApprove = async (postId: string) => {
        try {
            const res = await fetch("/api/posts", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: postId, action: "approve" }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                alert(data?.error || "שגיאה באישור הפרסום");
                return;
            }
            await reloadPosts();
        } catch (err) {
            console.error("Post approve error:", err);
            alert("שגיאת רשת. נסי שוב.");
        }
    };
    const handleReject = async (postId: string) => {
        try {
            const res = await fetch("/api/posts", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: postId, action: "reject", rejectionReason: rejectReason }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                alert(data?.error || "שגיאה בדחיית הפרסום");
                return;
            }
            setShowRejectModal(false);
            setRejectReason("");
            await reloadPosts();
        } catch (err) {
            console.error("Post reject error:", err);
            alert("שגיאת רשת. נסי שוב.");
        }
    };
    const handleReschedule = async (post: PendingPost) => {
        const newDate = prompt(`דחייה לתאריך חדש (YYYY-MM-DD):`, post.scheduledDate);
        if (!newDate) return;
        const newTime = prompt(`שעה חדשה (HH:MM):`, post.scheduledTime || "12:00");
        if (!newTime) return;
        try {
            const res = await fetch(`/api/admin/posts/${post.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ scheduledDate: newDate, scheduledTime: newTime }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                alert(data?.error || "שגיאה בעדכון התזמון");
                return;
            }
            await reloadPosts();
        } catch (err) {
            console.error("Post reschedule error:", err);
            alert("שגיאת רשת. נסי שוב.");
        }
    };
    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 text-text-muted gap-2">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>טוען פרסומים...</span>
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

    return (<div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-heading text-text-primary flex items-center gap-2">
            <FileText className="w-7 h-7"/>{txt("src/app/admin/posts/page.tsx::016", "ניהול פרסומים")}</h1>
          <p className="text-text-muted text-sm mt-1">
            {pendingCount > 0 ? (<span className="text-yellow-400">{pendingCount}{txt("src/app/admin/posts/page.tsx::017", "פרסומים ממתינים לאישור")}</span>) : (txt("src/app/admin/posts/page.tsx::018", "אין פרסומים ממתינים"))}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {postStatusFilters.map((status) => (<button key={status.value} onClick={() => setFilter(status.value)} className={`px-4 py-2 rounded-btn text-sm transition-all duration-200 ${filter === status.value
                ? "bg-gold text-bg font-bold"
                : "bg-bg-surface text-text-muted hover:text-gold border border-border-subtle"}`}>
            {status.value === "PENDING" ? `${txt("src/app/admin/waitlist/page.tsx::021", "ממתינה")} (${pendingCount})` : status.label}
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
                  {post.images.length}{txt("src/app/admin/posts/page.tsx::025", "תמונות")}</div>)}
              {post.images.length > 0 && (<div className="absolute bottom-2 left-2 text-text-muted text-[10px]">{txt("src/app/admin/posts/page.tsx::026", "עד 20 תמונות")}</div>)}
            </div>

            {/* Auto-delete info */}
            {post.autoDeleteAt && (<div className="flex items-center gap-1 text-text-muted text-xs mb-2">
                <Clock className="w-3 h-3"/>
                <span>{txt("src/app/admin/posts/page.tsx::027", "מחיקה אוטומטית:")}{post.autoDeleteAt}</span>
              </div>)}

            {/* Caption */}
            <p className="text-text-primary text-sm leading-relaxed mb-3">
              {post.caption}
            </p>

            {/* Checklist */}
            <div className="flex gap-3 mb-4 text-xs">
              <span className={post.hasLogo ? "text-emerald-600" : "text-red-500"}>
                {post.hasLogo ? "✓" : "✗"}{txt("src/app/admin/posts/page.tsx::028", "לוגו קהילה")}</span>
              <span className={post.hasSupplierLogo ? "text-emerald-600" : "text-red-500"}>
                {post.hasSupplierLogo ? "✓" : "✗"}{txt("src/app/admin/posts/page.tsx::029", "לוגו ספק")}</span>
              <span className={post.hasDesignerCredit ? "text-emerald-600" : "text-red-500"}>
                {post.hasDesignerCredit ? "✓" : "✗"}{txt("src/app/admin/posts/page.tsx::030", "קרדיט מעצבת")}</span>
            </div>

            {/* Actions */}
            {post.status === "PENDING" && (<div className="flex gap-2">
                <button onClick={() => handleApprove(post.id)} className="btn-gold flex-1 flex items-center justify-center gap-2 text-sm">
                  <Check className="w-4 h-4"/>{txt("src/app/admin/posts/page.tsx::031", "אשר")}</button>
                <button onClick={() => {
                    setSelectedPost(post);
                    setShowRejectModal(true);
                }} className="btn-danger flex-1 flex items-center justify-center gap-2 text-sm">
                  <X className="w-4 h-4"/>{txt("src/app/admin/posts/page.tsx::032", "דחה")}</button>
                <button onClick={() => handleReschedule(post)} className="btn-outline px-3 text-sm" title="תזמון מחדש">
                  <Calendar className="w-4 h-4"/>
                </button>
              </div>)}
          </div>))}
      </div>

      {filteredPosts.length === 0 && (<div className="text-center py-12 text-text-muted">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30"/>
          <p>{txt("src/app/admin/posts/page.tsx::033", "אין פרסומים בקטגוריה זו")}</p>
        </div>)}

      {/* Reject Modal */}
      {showRejectModal && selectedPost && (<div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-bg-surface border border-border-gold rounded-card p-6 max-w-md w-full">
            <h3 className="text-lg font-heading text-text-primary mb-4">{txt("src/app/admin/posts/page.tsx::034", "דחיית פרסום —")}{selectedPost.supplierName}
            </h3>
            <div className="space-y-3 mb-4">
              <p className="text-text-muted text-sm">{txt("src/app/admin/posts/page.tsx::035", "בחר סיבת דחייה:")}</p>
              {rejectionReasons.map((reason) => (<label key={reason.value} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="reason" value={reason.value} checked={rejectReason === reason.value} onChange={() => setRejectReason(reason.value)} className="accent-gold"/>
                  <span className="text-text-primary text-sm">{reason.label}</span>
                </label>))}
              {rejectReason === OTHER_REJECTION_REASON && (<textarea placeholder="פרט את הסיבה..." className="input-dark h-20 resize-none"/>)}
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleReject(selectedPost.id)} className="btn-danger flex-1" disabled={!rejectReason}>{txt("src/app/admin/posts/page.tsx::038", "דחה ושלח הודעה לספק")}</button>
              <button onClick={() => {
                setShowRejectModal(false);
                setRejectReason("");
            }} className="btn-outline flex-1">{txt("src/app/admin/posts/page.tsx::039", "ביטול")}</button>
            </div>
          </div>
        </div>)}
    </div>);
}
