"use client";
import { useState } from "react";
import { CreditCard, Monitor, Smartphone, Save, Eye, EyeOff, Share2, } from "lucide-react";
import type { BusinessCardData } from "@/lib/businessCardThemes";
import { defaultBusinessCard } from "@/lib/businessCardThemes";
import BusinessCardEditor from "./BusinessCardEditor";
import BusinessCardPreview from "./BusinessCardPreview";
interface BusinessCardBuilderProps {
    initialData?: BusinessCardData;
    userName?: string;
    userRole?: string;
    userPhone?: string;
    userEmail?: string;
}
export default function BusinessCardBuilder({ initialData, userName = "", userRole = "", userPhone = "", userEmail = "", }: BusinessCardBuilderProps) {
    const [cardData, setCardData] = useState<BusinessCardData>(() => {
        if (initialData)
            return initialData;
        // Prefill from user data
        return {
            ...defaultBusinessCard,
            fields: [
                { id: "1", label: "\u05E9\u05DD \u05DE\u05DC\u05D0", value: userName, icon: "user" },
                { id: "2", label: "\u05EA\u05E4\u05E7\u05D9\u05D3", value: userRole, icon: "briefcase" },
                { id: "3", label: "\u05D8\u05DC\u05E4\u05D5\u05DF", value: userPhone, icon: "phone" },
                { id: "4", label: "\u05DE\u05D9\u05D9\u05DC", value: userEmail, icon: "mail" },
            ],
        };
    });
    const [viewMode, setViewMode] = useState<"mobile" | "desktop">("mobile");
    const [showPreview, setShowPreview] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<string | null>(null);
    const handleSave = async () => {
        setIsSaving(true);
        // TODO: API call to save business card
        await new Promise(r => setTimeout(r, 800));
        setIsSaving(false);
        setLastSaved(new Date().toLocaleTimeString("he-IL"));
    };
    return (<div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-heading text-text-primary flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-gold"/>{"\u05DB\u05E8\u05D8\u05D9\u05E1 \u05D1\u05D9\u05E7\u05D5\u05E8 \u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9"}</h2>
          <p className="text-text-muted text-xs mt-0.5">{"\u05E2\u05E6\u05D1\u05D5 \u05DB\u05E8\u05D8\u05D9\u05E1 \u05D1\u05D9\u05E7\u05D5\u05E8 \u05DE\u05E7\u05E6\u05D5\u05E2\u05D9 \u2014 \u05DB\u05DC \u05E9\u05D9\u05E0\u05D5\u05D9 \u05DE\u05D5\u05E6\u05D2 \u05D1\u05D6\u05DE\u05DF \u05D0\u05DE\u05EA"}</p>
        </div>
        <div className="flex items-center gap-2">
          {lastSaved && (<span className="text-text-muted text-[10px]">{"\u05E0\u05E9\u05DE\u05E8 \u05D1-"}{lastSaved}
            </span>)}
          <button onClick={handleSave} disabled={isSaving} className="btn-gold text-sm py-2 px-4 flex items-center gap-1.5 disabled:opacity-50">
            <Save className="w-4 h-4"/>
            {isSaving ? "\u05E9\u05D5\u05DE\u05E8..." : "\u05E9\u05DE\u05D5\u05E8"}
          </button>
          <button className="btn-outline text-sm py-2 px-3 flex items-center gap-1.5">
            <Share2 className="w-4 h-4"/>
            <span className="hidden sm:inline">{"\u05E9\u05EA\u05E3"}</span>
          </button>
        </div>
      </div>

      {/* Preview Toggle & View Mode (Mobile) */}
      <div className="flex items-center justify-between lg:hidden">
        <button onClick={() => setShowPreview(!showPreview)} className={`flex items-center gap-1.5 px-3 py-2 rounded-btn text-xs font-medium transition-all ${showPreview ? "bg-gold/10 text-gold" : "bg-bg-surface text-text-muted"}`}>
          {showPreview ? <Eye className="w-3.5 h-3.5"/> : <EyeOff className="w-3.5 h-3.5"/>}
          {showPreview ? "\u05D4\u05E1\u05EA\u05E8 \u05EA\u05E6\u05D5\u05D2\u05D4" : "\u05D4\u05E6\u05D2 \u05EA\u05E6\u05D5\u05D2\u05D4"}
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
              <p className="text-text-muted text-xs font-medium">{"\u05EA\u05E6\u05D5\u05D2\u05D4 \u05DE\u05E7\u05D3\u05D9\u05DE\u05D4"}</p>
              <div className="flex gap-1 bg-bg-surface rounded-btn p-0.5 border border-border-subtle">
                <button onClick={() => setViewMode("mobile")} className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs transition-all ${viewMode === "mobile" ? "bg-gold text-white font-medium" : "text-text-muted hover:text-text-primary"}`}>
                  <Smartphone className="w-3.5 h-3.5"/>{"\u05E0\u05D9\u05D9\u05D3"}</button>
                <button onClick={() => setViewMode("desktop")} className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs transition-all ${viewMode === "desktop" ? "bg-gold text-white font-medium" : "text-text-muted hover:text-text-primary"}`}>
                  <Monitor className="w-3.5 h-3.5"/>{"\u05DE\u05D7\u05E9\u05D1"}</button>
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

              <BusinessCardPreview data={cardData} viewMode={viewMode}/>

              {viewMode === "mobile" && (<div className="flex justify-center mt-3">
                  <div className="w-8 h-8 border-2 border-gray-300 rounded-full"/>
                </div>)}
            </div>
          </div>
        </div>
      </div>
    </div>);
}
