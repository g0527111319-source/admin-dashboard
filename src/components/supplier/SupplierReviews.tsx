"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Send, Copy, Check, Share2, X, Search, Clock, UserCheck, UserX, MessageSquare, Star } from "lucide-react";

type Designer = {
  id: string;
  fullName: string;
  city: string | null;
  phone: string;
  email: string | null;
};

type Review = {
  id: string;
  designerId: string;
  token: string;
  freeTextComment: string | null;
  publishConsent: string | null;
  publishedAt: string | null;
  completedAt: string | null;
  sentAt: string | null;
  availabilityScore: number | null;
  reliabilityScore: number | null;
  priceScore: number | null;
  designer?: { id: string; fullName: string; city: string | null; email: string | null };
};

type EmailWarning = { message: string; sandbox?: boolean; to?: string } | null;

const CONSENT_LABEL: Record<string, { text: string; cls: string }> = {
  FULL: { text: "פרסום מלא", cls: "bg-green-50 text-green-700 border-green-200" },
  ANONYMOUS: { text: "פרסום אנונימי", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  DECLINED: { text: "ללא פרסום", cls: "bg-gray-50 text-gray-600 border-gray-200" },
};

function StarsInput({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = (hover ?? value ?? 0) >= n;
        return (
          <button
            type="button"
            key={n}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onChange(value === n ? null : n)}
            className="p-0.5"
            aria-label={`${n} כוכבים`}
          >
            <Star className={`w-4 h-4 ${active ? "fill-[#C9A84C] text-[#C9A84C]" : "text-gray-300"}`} />
          </button>
        );
      })}
    </div>
  );
}

export default function SupplierReviews() {
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [emailWarning, setEmailWarning] = useState<EmailWarning>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [dRes, rRes] = await Promise.all([
        fetch("/api/supplier/designers"),
        fetch("/api/supplier/reviews"),
      ]);
      const dData = dRes.ok ? await dRes.json() : { designers: [] };
      const rData = rRes.ok ? await rRes.json() : { reviews: [] };
      setDesigners(dData.designers || []);
      setReviews(rData.reviews || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredDesigners = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return designers;
    return designers.filter(
      (d) =>
        d.fullName.toLowerCase().includes(q) ||
        (d.city || "").toLowerCase().includes(q) ||
        d.phone.includes(q) ||
        (d.email || "").toLowerCase().includes(q)
    );
  }, [designers, search]);

  async function sendReview(designerId: string) {
    setSending(designerId);
    setEmailWarning(null);
    try {
      const res = await fetch("/api/supplier/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה בשליחה");
      setEmailWarning(data.emailWarning || null);
      setShowPicker(false);
      setSearch("");
      await load();
      if (!data.emailWarning) {
        setBanner("בקשת הביקורת נשלחה בהצלחה למעצבת.");
        setTimeout(() => setBanner(null), 4000);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setSending(null);
    }
  }

  async function togglePublish(reviewId: string) {
    try {
      const res = await fetch(`/api/supplier/reviews/${reviewId}/publish`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      await load();
      setBanner(data.publishedAt ? "הביקורת שותפה בכרטיס הביקור." : "הביקורת הוסרה מהכרטיס.");
      setTimeout(() => setBanner(null), 3500);
    } catch (err) {
      alert(err instanceof Error ? err.message : "שגיאה");
    }
  }

  async function updateRating(reviewId: string, field: "availabilityScore" | "reliabilityScore" | "priceScore", value: number | null) {
    setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, [field]: value } : r)));
    try {
      await fetch(`/api/supplier/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
    } catch (err) {
      console.error(err);
    }
  }

  function copyLink(token: string, id: string) {
    const url = `${window.location.origin}/supplier-review/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function removeReview(reviewId: string) {
    if (!confirm("למחוק את הביקורת? הפעולה לא ניתנת לביטול.")) return;
    try {
      const res = await fetch(`/api/supplier/reviews/${reviewId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("שגיאה במחיקה");
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "שגיאה");
    }
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-heading text-text-primary">ביקורות מעצבות</h2>
          <p className="text-text-muted text-sm mt-1">
            שלחי בקשת ביקורת למעצבת, וכשהיא תמלא — תוכלי לשתף את הביקורת הכתובה בכרטיס הביקור שלך.
          </p>
        </div>
        <button onClick={() => setShowPicker(true)} className="btn-gold text-sm py-2 px-4 flex items-center gap-2">
          <Send className="w-4 h-4" />
          שלחי בקשת ביקורת
        </button>
      </div>

      {banner && (
        <div className="rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3">{banner}</div>
      )}

      {emailWarning && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3">
          {emailWarning.message}
        </div>
      )}

      {loading ? (
        <div className="card-static text-center text-text-muted py-8">טוען...</div>
      ) : reviews.length === 0 ? (
        <div className="card-static text-center py-10">
          <MessageSquare className="w-10 h-10 mx-auto text-text-muted opacity-40 mb-3" />
          <p className="text-text-primary font-medium">עוד לא שלחת בקשות ביקורת</p>
          <p className="text-text-muted text-sm mt-1">לחצי על &quot;שלחי בקשת ביקורת&quot; כדי להתחיל.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => {
            const consentBadge = r.publishConsent ? CONSENT_LABEL[r.publishConsent] : null;
            const canPublish = r.completedAt && r.freeTextComment && (r.publishConsent === "FULL" || r.publishConsent === "ANONYMOUS");
            return (
              <div key={r.id} className="card-static">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary font-medium">{r.designer?.fullName || "מעצבת"}</p>
                    {r.designer?.city && <p className="text-text-muted text-xs">{r.designer.city}</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {r.completedAt ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                          <UserCheck className="w-3 h-3" /> הביקורת מולאה
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3" /> ממתין למעצבת
                        </span>
                      )}
                      {consentBadge && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${consentBadge.cls}`}>{consentBadge.text}</span>
                      )}
                      {r.publishedAt && (
                        <span className="text-xs bg-[#faf5e8] text-[#8b6508] border border-[#e4d9b8] px-2 py-0.5 rounded-full">
                          משותפת בכרטיס
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {!r.completedAt && (
                      <button onClick={() => copyLink(r.token, r.id)} className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1">
                        {copiedId === r.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedId === r.id ? "הועתק" : "העתקת לינק"}
                      </button>
                    )}
                    {canPublish && (
                      <button onClick={() => togglePublish(r.id)} className="btn-gold text-xs py-1.5 px-3 flex items-center gap-1">
                        <Share2 className="w-3 h-3" />
                        {r.publishedAt ? "הסרה מהכרטיס" : "שיתוף בכרטיס"}
                      </button>
                    )}
                    <button onClick={() => removeReview(r.id)} className="text-text-muted hover:text-red-500 p-1" title="מחיקה">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {r.freeTextComment && (
                  <div className="mt-3 bg-bg-surface rounded-btn p-3 text-sm text-text-primary">
                    &ldquo;{r.freeTextComment}&rdquo;
                  </div>
                )}

                {/* Private ratings — only the supplier sees these */}
                <div className="mt-3 border-t border-border-subtle pt-3">
                  <p className="text-text-muted text-xs mb-2">דירוג פנימי שלי (אופציונלי, לא מוצג לאף אחד אחר):</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-text-secondary">זמינות</span>
                      <StarsInput value={r.availabilityScore} onChange={(v) => updateRating(r.id, "availabilityScore", v)} />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-text-secondary">אמינות</span>
                      <StarsInput value={r.reliabilityScore} onChange={(v) => updateRating(r.id, "reliabilityScore", v)} />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-text-secondary">מחיר</span>
                      <StarsInput value={r.priceScore} onChange={(v) => updateRating(r.id, "priceScore", v)} />
                    </div>
                  </div>
                </div>

                {r.publishConsent === "DECLINED" && r.completedAt && (
                  <div className="mt-3 flex items-center gap-1 text-xs text-gray-500">
                    <UserX className="w-3 h-3" />
                    המעצבת ביקשה שהביקורת לא תפורסם.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Designer picker modal */}
      {showPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setShowPicker(false)}
        >
          <div
            className="bg-white rounded-card shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border-subtle flex items-center justify-between">
              <h3 className="font-heading text-lg text-text-primary">בחירת מעצבת</h3>
              <button onClick={() => setShowPicker(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 border-b border-border-subtle">
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="חיפוש לפי שם, עיר, טלפון או מייל..."
                  className="input-field pr-10"
                />
              </div>
              <p className="text-text-muted text-xs mt-2">
                ברשימה מוצגים רק שם, עיר, פלאפון ומייל של המעצבת — ללא כל מידע נוסף.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredDesigners.length === 0 ? (
                <p className="p-6 text-center text-text-muted text-sm">לא נמצאו מעצבות.</p>
              ) : (
                <ul className="divide-y divide-border-subtle">
                  {filteredDesigners.map((d) => (
                    <li key={d.id} className="p-3 flex items-center justify-between gap-3 hover:bg-bg-surface transition-colors">
                      <div className="min-w-0">
                        <p className="text-text-primary font-medium truncate">{d.fullName}</p>
                        <p className="text-text-muted text-xs truncate">
                          {[d.city, d.phone, d.email].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <button
                        onClick={() => sendReview(d.id)}
                        disabled={sending === d.id}
                        className="btn-gold text-xs py-1.5 px-3 flex items-center gap-1 disabled:opacity-60"
                      >
                        <Send className="w-3 h-3" />
                        {sending === d.id ? "שולח..." : "שלחי"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
