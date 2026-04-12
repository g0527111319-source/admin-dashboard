"use client";
import { useState, useEffect } from "react";
import { CreditCard, Monitor, Smartphone, Save, Eye, EyeOff, Share2, Check, Link2, } from "lucide-react";
import type { BusinessCardData } from "@/lib/businessCardThemes";
import { defaultBusinessCard } from "@/lib/businessCardThemes";
import BusinessCardEditor from "./BusinessCardEditor";
import BusinessCardPreview from "./BusinessCardPreview";
interface BusinessCardBuilderProps {
    initialData?: BusinessCardData;
    designerId?: string;
    userName?: string;
    userRole?: string;
    userPhone?: string;
    userEmail?: string;
}
export default function BusinessCardBuilder({ initialData, designerId, userName = "", userRole = "", userPhone = "", userEmail = "", }: BusinessCardBuilderProps) {
    const [cardData, setCardData] = useState<BusinessCardData>(() => {
        if (initialData)
            return initialData;
        // Prefill from user data
        return {
            ...defaultBusinessCard,
            fields: [
                { id: "1", label: "שם מלא", value: userName, icon: "user" },
                { id: "2", label: "תפקיד", value: userRole, icon: "briefcase" },
                { id: "3", label: "טלפון", value: userPhone, icon: "phone" },
                { id: "4", label: "מייל", value: userEmail, icon: "mail" },
            ],
        };
    });
    const [isLoading, setIsLoading] = useState(!!designerId);
    const [viewMode, setViewMode] = useState<"mobile" | "desktop">("mobile");
    const [showPreview, setShowPreview] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<string | null>(null);
    const [shareState, setShareState] = useState<"idle" | "copied">("idle");

    // Load saved card data from API on mount
    useEffect(() => {
      if (!designerId) return;
      let cancelled = false;
      (async () => {
        try {
          const res = await fetch(`/api/business-card/${designerId}`);
          if (!res.ok) throw new Error("fetch failed");
          const { card } = await res.json();
          if (card && !cancelled) {
            setCardData(prev => ({ ...prev, ...card }));
          }
        } catch (err) {
          console.error("Failed to load business card:", err);
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [designerId]);
    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (designerId) {
                await fetch(`/api/business-card/${designerId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", "x-user-id": designerId },
                    body: JSON.stringify(cardData),
                });
            }
            setLastSaved(new Date().toLocaleTimeString("he-IL"));
        } catch (err) {
            console.error("Save error:", err);
        } finally {
            setIsSaving(false);
        }
    };
    const handleShare = async () => {
        const shareUrl = designerId
            ? `${window.location.origin}/card/${designerId}`
            : window.location.href;
        const shareData = {
            title: `${userName} — כרטיס ביקור`,
            text: `${userName} | ${userRole}`,
            url: shareUrl,
        };
        // Try native share API (mobile)
        if (typeof navigator !== "undefined" && navigator.share) {
            try {
                await navigator.share(shareData);
                return;
            } catch {
                // User cancelled or not supported — fall through to copy
            }
        }
        // Fallback: copy link to clipboard
        try {
            await navigator.clipboard.writeText(shareUrl);
            setShareState("copied");
            setTimeout(() => setShareState("idle"), 2500);
        } catch {
            // Last resort: prompt
            window.prompt("העתק את הקישור:", shareUrl);
        }
    };
    if (isLoading) {
      return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "4rem 0" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 40, height: 40, border: "3px solid #e5e7eb",
              borderTopColor: "#C9A84C", borderRadius: "50%",
              animation: "spin 0.8s linear infinite", margin: "0 auto 12px",
            }} />
            <p style={{ color: "#9ca3af", fontSize: 14 }}>{"טוען כרטיס ביקור..."}</p>
            <style dangerouslySetInnerHTML={{ __html: `@keyframes spin{to{transform:rotate(360deg)}}` }} />
          </div>
        </div>
      );
    }

    return (<div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-heading text-text-primary flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-gold"/>{"כרטיס ביקור דיגיטלי"}</h2>
          <p className="text-text-muted text-xs mt-0.5">{"עצבו כרטיס ביקור מקצועי — כל שינוי מוצג בזמן אמת"}</p>
        </div>
        <div className="flex items-center gap-2">
          {lastSaved && (<span className="text-text-muted text-[10px]">{"נשמר ב-"}{lastSaved}
            </span>)}
          <button onClick={handleSave} disabled={isSaving} className="btn-gold text-sm py-2 px-4 flex items-center gap-1.5 disabled:opacity-50">
            <Save className="w-4 h-4"/>
            {isSaving ? "שומר..." : "שמור"}
          </button>
          <button onClick={handleShare} className={`text-sm py-2 px-3 flex items-center gap-1.5 transition-all ${shareState === "copied" ? "btn-gold" : "btn-outline"}`}>
            {shareState === "copied" ? <Check className="w-4 h-4"/> : <Share2 className="w-4 h-4"/>}
            <span className="hidden sm:inline">{shareState === "copied" ? "הקישור הועתק!" : "שתף"}</span>
          </button>
        </div>
      </div>

      {/* Preview Toggle & View Mode (Mobile) */}
      <div className="flex items-center justify-between lg:hidden">
        <button onClick={() => setShowPreview(!showPreview)} className={`flex items-center gap-1.5 px-3 py-2 rounded-btn text-xs font-medium transition-all ${showPreview ? "bg-gold/10 text-gold" : "bg-bg-surface text-text-muted"}`}>
          {showPreview ? <Eye className="w-3.5 h-3.5"/> : <EyeOff className="w-3.5 h-3.5"/>}
          {showPreview ? "הסתר תצוגה" : "הצג תצוגה"}
        </button>
        {showPreview && (<div className="flex gap-1 bg-bg-surface rounded-btn p-0.5 border border-border-subtle">
            <button onClick={() => setViewMode("mobile")} className={`p-1.5 rounded transition-all ${viewMode === "mobile" ? "bg-gold text-white" : "text-text-muted"}`}>
              <Smartphone className="w-3.5 h-3.5"/>
            </button>
            <button onClick={() => setViewMode("desktop")} className={`p-1.5 rounded transition-all ${viewMode === "desktop" ? "bg-gold text-white" : "text-text-muted"}`}>
              <Monitor className="w-3.5 h-3.5"/>
            </button>
          </div>)}
      </div>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Editor Panel */}
        <div className="flex-1 min-w-0 lg:max-w-[480px]">
          <BusinessCardEditor data={cardData} onChange={setCardData}/>
        </div>

        {/* Preview Panel */}
        <div className={`flex-1 min-w-0 ${showPreview ? "block" : "hidden lg:block"}`}>
          <div className="lg:sticky lg:top-4">
            {/* View Mode Toggle (Desktop) */}
            <div className="hidden lg:flex items-center justify-between mb-3">
              <p className="text-text-muted text-xs font-medium">{"תצוגה מקדימה"}</p>
              <div className="flex gap-1 bg-bg-surface rounded-btn p-0.5 border border-border-subtle">
                <button onClick={() => setViewMode("mobile")} className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs transition-all ${viewMode === "mobile" ? "bg-gold text-white font-medium" : "text-text-muted hover:text-text-primary"}`}>
                  <Smartphone className="w-3.5 h-3.5"/>{"נייד"}</button>
                <button onClick={() => setViewMode("desktop")} className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs transition-all ${viewMode === "desktop" ? "bg-gold text-white font-medium" : "text-text-muted hover:text-text-primary"}`}>
                  <Monitor className="w-3.5 h-3.5"/>{"מחשב"}</button>
              </div>
            </div>

            {/* Preview Frame */}
            <div className={`rounded-xl border-2 border-border-subtle p-4 transition-all duration-500 ${viewMode === "mobile"
            ? "bg-gray-100 max-w-[420px] mx-auto"
            : "bg-gray-50"}`} style={{
            backgroundImage: viewMode === "mobile"
                ? "radial-gradient(circle at 50% 0%, #e5e7eb 0%, #f3f4f6 100%)"
                : undefined,
        }}>
              {/* Phone Frame for Mobile */}
              {viewMode === "mobile" && (<div className="flex justify-center mb-2">
                  <div className="w-20 h-1 bg-gray-300 rounded-full"/>
                </div>)}

              <BusinessCardPreview data={cardData} viewMode={viewMode} designerId={designerId}/>

              {viewMode === "mobile" && (<div className="flex justify-center mt-3">
                  <div className="w-8 h-8 border-2 border-gray-300 rounded-full"/>
                </div>)}
            </div>
          </div>
        </div>
      </div>
    </div>);
}
