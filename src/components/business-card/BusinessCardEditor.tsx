"use client";
import { txt } from "@/content/siteText";
import Image from "next/image";
import { useState, useRef } from "react";
import { Plus, X, GripVertical, Palette, Type, Image as ImageIcon, Users, Share2, ChevronDown, ChevronUp, Sparkles, Check, ALargeSmall, Crown, Upload, Loader2, Clock, Tag, ArrowLeftRight, BarChart3, Moon, Sun, MapPin, Video, } from "lucide-react";
import type { BusinessCardData, PersonalField, Testimonial, CardColors, BusinessHours, BeforeAfterItem, ProfessionalStats, EntryAnimation, } from "@/lib/businessCardThemes";
import { cardThemes, socialLinkConfig, defaultFieldTemplates, getThemeById, getMergedColors, printFontOptions, handwritingFontOptions, defaultBusinessHours, type SocialLinkType, } from "@/lib/businessCardThemes";
import ImageUploader from "./ImageUploader";
interface BusinessCardEditorProps {
    data: BusinessCardData;
    onChange: (data: BusinessCardData) => void;
}
type EditorSection = "fields" | "social" | "gallery" | "testimonials" | "theme" | "colors" | "fonts" | "branding" | "hours" | "expertise" | "beforeafter" | "stats" | "animations";
function GalleryUploadButton({ onUploaded }: {
    onUploaded: (url: string) => void;
}) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        if (!file.type.startsWith("image/")) {
            setError(txt("src/components/business-card/BusinessCardEditor.tsx::001", "יש להעלות תמונה בלבד"));
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setError(txt("src/components/business-card/BusinessCardEditor.tsx::002", "מקסימום 5MB"));
            return;
        }
        setError("");
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("folder", "business-cards");
            const res = await fetch("/api/upload", { method: "POST", body: fd });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error);
            }
            const { url } = await res.json();
            onUploaded(url);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : txt("src/components/business-card/BusinessCardEditor.tsx::003", "שגיאה בהעלאה"));
        }
        finally {
            setUploading(false);
            if (inputRef.current)
                inputRef.current.value = "";
        }
    };
    return (<div>
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="btn-outline text-sm w-full flex items-center justify-center gap-1.5 py-2.5 disabled:opacity-50">
        {uploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
        {uploading ? txt("src/components/business-card/BusinessCardEditor.tsx::004", "מעלה...") : txt("src/components/business-card/BusinessCardEditor.tsx::005", "העלאת תמונה לגלריה")}
      </button>
      <input ref={inputRef} type="file" accept=".png,.webp,.svg,.jpg,.jpeg,image/png,image/webp,image/svg+xml,image/jpeg" onChange={handleUpload} className="hidden"/>
      {error && <p className="text-red-500 text-[10px] mt-1">{error}</p>}
    </div>);
}
export default function BusinessCardEditor({ data, onChange }: BusinessCardEditorProps) {
    const [activeSection, setActiveSection] = useState<EditorSection>("fields");
    const [showFieldPicker, setShowFieldPicker] = useState(false);
    const [showSocialPicker, setShowSocialPicker] = useState(false);
    const [expertiseInput, setExpertiseInput] = useState("");
    const theme = getThemeById(data.themeId);
    const mergedColors = getMergedColors(theme, data.customColors);
    const sections: {
        key: EditorSection;
        label: string;
        icon: React.ReactNode;
        count?: number;
    }[] = [
        { key: "fields", label: txt("src/components/business-card/BusinessCardEditor.tsx::006", "פרטים אישיים"), icon: <Type className="w-4 h-4"/>, count: data.fields.length },
        { key: "social", label: txt("src/components/business-card/BusinessCardEditor.tsx::007", "קישורים חברתיים"), icon: <Share2 className="w-4 h-4"/>, count: data.socialLinks.length },
        { key: "gallery", label: txt("src/components/business-card/BusinessCardEditor.tsx::008", "תיק עבודות"), icon: <ImageIcon className="w-4 h-4"/>, count: data.galleryImages.filter(g => g).length },
        { key: "testimonials", label: txt("src/components/business-card/BusinessCardEditor.tsx::009", "לקוחות ממליצים"), icon: <Users className="w-4 h-4"/>, count: data.testimonials.length },
        { key: "theme", label: txt("src/components/business-card/BusinessCardEditor.tsx::010", "ערכת נושא"), icon: <Sparkles className="w-4 h-4"/> },
        { key: "fonts", label: txt("src/components/business-card/BusinessCardEditor.tsx::011", "גופנים"), icon: <ALargeSmall className="w-4 h-4"/> },
        { key: "branding", label: txt("src/components/business-card/BusinessCardEditor.tsx::012", "מיתוג"), icon: <Crown className="w-4 h-4"/> },
        { key: "colors", label: txt("src/components/business-card/BusinessCardEditor.tsx::013", "פלטת צבעים"), icon: <Palette className="w-4 h-4"/> },
        { key: "hours", label: txt("src/components/business-card/BusinessCardEditor.tsx::100", "שעות פעילות"), icon: <Clock className="w-4 h-4"/> },
        { key: "expertise", label: txt("src/components/business-card/BusinessCardEditor.tsx::101", "תחומי מומחיות"), icon: <Tag className="w-4 h-4"/>, count: (data.expertiseTags || []).length },
        { key: "beforeafter", label: txt("src/components/business-card/BusinessCardEditor.tsx::102", "תיק עבודות - לפני/אחרי"), icon: <ArrowLeftRight className="w-4 h-4"/>, count: (data.beforeAfterItems || []).length },
        { key: "stats", label: txt("src/components/business-card/BusinessCardEditor.tsx::103", "סטטיסטיקות"), icon: <BarChart3 className="w-4 h-4"/> },
        { key: "animations", label: txt("src/components/business-card/BusinessCardEditor.tsx::104", "אנימציות"), icon: <Sparkles className="w-4 h-4"/> },
    ];
    // ======= FIELD MANAGEMENT =======
    const updateField = (id: string, key: keyof PersonalField, value: string) => {
        onChange({
            ...data,
            fields: data.fields.map(f => f.id === id ? { ...f, [key]: value } : f),
        });
    };
    const removeField = (id: string) => {
        onChange({ ...data, fields: data.fields.filter(f => f.id !== id) });
    };
    const addField = (label: string, icon: string) => {
        const newField: PersonalField = {
            id: Date.now().toString(),
            label,
            value: "",
            icon,
        };
        onChange({ ...data, fields: [...data.fields, newField] });
        setShowFieldPicker(false);
    };
    const moveField = (index: number, direction: "up" | "down") => {
        const newFields = [...data.fields];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newFields.length)
            return;
        [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
        onChange({ ...data, fields: newFields });
    };
    // ======= SOCIAL LINKS =======
    const addSocialLink = (type: SocialLinkType) => {
        if (data.socialLinks.some(s => s.type === type))
            return;
        onChange({
            ...data,
            socialLinks: [...data.socialLinks, { type, url: "" }],
        });
        setShowSocialPicker(false);
    };
    const updateSocialLink = (index: number, url: string) => {
        const newLinks = [...data.socialLinks];
        newLinks[index] = { ...newLinks[index], url };
        onChange({ ...data, socialLinks: newLinks });
    };
    const removeSocialLink = (index: number) => {
        onChange({ ...data, socialLinks: data.socialLinks.filter((_, i) => i !== index) });
    };
    // ======= GALLERY =======
    const removeGalleryImage = (index: number) => {
        const newImages = data.galleryImages.filter((_, i) => i !== index);
        onChange({ ...data, galleryImages: newImages });
    };
    // ======= TESTIMONIALS =======
    const addTestimonial = () => {
        if (data.testimonials.length >= 3)
            return;
        const newT: Testimonial = { id: Date.now().toString(), name: "", text: "" };
        onChange({ ...data, testimonials: [...data.testimonials, newT] });
    };
    const updateTestimonial = (id: string, key: "name" | "text", value: string) => {
        onChange({
            ...data,
            testimonials: data.testimonials.map(t => t.id === id ? { ...t, [key]: value } : t),
        });
    };
    const removeTestimonial = (id: string) => {
        onChange({ ...data, testimonials: data.testimonials.filter(t => t.id !== id) });
    };
    // ======= THEME =======
    const setTheme = (themeId: string) => {
        onChange({ ...data, themeId, customColors: {} });
    };
    // ======= COLORS =======
    const updateColor = (key: keyof CardColors, value: string) => {
        onChange({
            ...data,
            customColors: { ...data.customColors, [key]: value },
        });
    };
    const resetColors = () => {
        onChange({ ...data, customColors: {} });
    };
    // ======= BUSINESS HOURS =======
    const hours: BusinessHours[] = data.businessHours || defaultBusinessHours;
    const updateHour = (index: number, key: keyof BusinessHours, value: string | boolean) => {
        const newHours = [...hours];
        newHours[index] = { ...newHours[index], [key]: value };
        onChange({ ...data, businessHours: newHours });
    };
    // ======= EXPERTISE TAGS =======
    const tags: string[] = data.expertiseTags || [];
    const addExpertiseTag = () => {
        const trimmed = expertiseInput.trim();
        if (!trimmed || tags.length >= 12 || tags.includes(trimmed)) return;
        onChange({ ...data, expertiseTags: [...tags, trimmed] });
        setExpertiseInput("");
    };
    const removeExpertiseTag = (index: number) => {
        onChange({ ...data, expertiseTags: tags.filter((_, i) => i !== index) });
    };
    // ======= BEFORE/AFTER =======
    const beforeAfterItems: BeforeAfterItem[] = data.beforeAfterItems || [];
    const addBeforeAfterItem = () => {
        if (beforeAfterItems.length >= 6) return;
        const newItem: BeforeAfterItem = { id: Date.now().toString(), beforeUrl: "", afterUrl: "", caption: "" };
        onChange({ ...data, beforeAfterItems: [...beforeAfterItems, newItem] });
    };
    const updateBeforeAfterItem = (id: string, key: keyof BeforeAfterItem, value: string) => {
        onChange({
            ...data,
            beforeAfterItems: beforeAfterItems.map(item => item.id === id ? { ...item, [key]: value } : item),
        });
    };
    const removeBeforeAfterItem = (id: string) => {
        onChange({ ...data, beforeAfterItems: beforeAfterItems.filter(item => item.id !== id) });
    };
    // ======= STATS =======
    const stats: ProfessionalStats = data.professionalStats || { yearsExperience: 0, projectsCompleted: 0, averageRating: 0, happyClients: 0 };
    const updateStat = (key: keyof ProfessionalStats, value: number) => {
        onChange({ ...data, professionalStats: { ...stats, [key]: value } });
    };

    // Available social types (not yet added)
    const availableSocials = (Object.keys(socialLinkConfig) as SocialLinkType[])
        .filter(type => !data.socialLinks.some(s => s.type === type));
    // Available field templates (not yet added)
    const usedLabels = data.fields.map(f => f.label);
    const availableFields = defaultFieldTemplates.filter(t => !usedLabels.includes(t.label));
    const colorLabels: {
        key: keyof CardColors;
        label: string;
    }[] = [
        { key: "primary", label: txt("src/components/business-card/BusinessCardEditor.tsx::014", "צבע ראשי") },
        { key: "secondary", label: txt("src/components/business-card/BusinessCardEditor.tsx::015", "צבע משני") },
        { key: "background", label: txt("src/components/business-card/BusinessCardEditor.tsx::016", "רקע כרטיס") },
        { key: "headerBg", label: txt("src/components/business-card/BusinessCardEditor.tsx::017", "רקע כותרת") },
        { key: "headerText", label: txt("src/components/business-card/BusinessCardEditor.tsx::018", "טקסט כותרת") },
        { key: "cardBg", label: txt("src/components/business-card/BusinessCardEditor.tsx::019", "רקע אזורים") },
        { key: "text", label: txt("src/components/business-card/BusinessCardEditor.tsx::020", "צבע טקסט") },
        { key: "textMuted", label: txt("src/components/business-card/BusinessCardEditor.tsx::021", "טקסט משני") },
        { key: "border", label: txt("src/components/business-card/BusinessCardEditor.tsx::022", "גבולות") },
        { key: "socialBg", label: txt("src/components/business-card/BusinessCardEditor.tsx::023", "רקע אייקונים") },
        { key: "socialIcon", label: txt("src/components/business-card/BusinessCardEditor.tsx::024", "צבע אייקונים") },
        { key: "buttonBg", label: txt("src/components/business-card/BusinessCardEditor.tsx::025", "רקע כפתורים") },
        { key: "buttonText", label: txt("src/components/business-card/BusinessCardEditor.tsx::026", "טקסט כפתורים") },
    ];

    // Animation options
    const animationOptions: { value: EntryAnimation; label: string }[] = [
        { value: "none", label: txt("src/components/business-card/BusinessCardEditor.tsx::120", "בלי אנימציה") },
        { value: "fade-up", label: txt("src/components/business-card/BusinessCardEditor.tsx::121", "עליה עם דעיכה") },
        { value: "slide-in", label: txt("src/components/business-card/BusinessCardEditor.tsx::122", "החלקה פנימה") },
        { value: "scale-in", label: txt("src/components/business-card/BusinessCardEditor.tsx::123", "הגדלה") },
        { value: "stagger", label: txt("src/components/business-card/BusinessCardEditor.tsx::124", "מדורג") },
    ];

    return (<div className="space-y-4">
      {/* Section Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {sections.map((section) => (<button key={section.key} onClick={() => setActiveSection(section.key)} className={`flex items-center gap-1.5 px-3 py-2 rounded-btn text-xs font-medium transition-all duration-200 ${activeSection === section.key
                ? "bg-gold text-white shadow-sm"
                : "bg-bg-surface text-text-muted hover:text-text-primary border border-border-subtle"}`}>
            {section.icon}
            <span>{section.label}</span>
            {section.count !== undefined && section.count > 0 && (<span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${activeSection === section.key ? "bg-white/30 text-white" : "bg-gold/10 text-gold"}`}>
                {section.count}
              </span>)}
          </button>))}
      </div>

      {/* ===== PERSONAL FIELDS ===== */}
      {activeSection === "fields" && (<div className="card-static space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-heading text-text-primary">{txt("src/components/business-card/BusinessCardEditor.tsx::027", "פרטים אישיים")}</h3>
            <span className="text-text-muted text-xs">{data.fields.length}{txt("src/components/business-card/BusinessCardEditor.tsx::028", "שדות")}</span>
          </div>

          <div className="space-y-2">
            {data.fields.map((field, index) => (<div key={field.id} className="flex items-center gap-2 p-3 bg-bg-surface rounded-btn group">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveField(index, "up")} disabled={index === 0} className="text-text-muted hover:text-gold disabled:opacity-20 transition-colors">
                    <ChevronUp className="w-3 h-3"/>
                  </button>
                  <GripVertical className="w-3 h-3 text-text-muted opacity-30"/>
                  <button onClick={() => moveField(index, "down")} disabled={index === data.fields.length - 1} className="text-text-muted hover:text-gold disabled:opacity-20 transition-colors">
                    <ChevronDown className="w-3 h-3"/>
                  </button>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input type="text" value={field.label} onChange={(e) => updateField(field.id, "label", e.target.value)} className="input-field text-xs py-1.5" placeholder="תווית"/>
                  <input type="text" value={field.value} onChange={(e) => updateField(field.id, "value", e.target.value)} className="input-field text-xs py-1.5" placeholder="ערך"/>
                </div>
                <button onClick={() => removeField(field.id)} className="text-text-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1">
                  <X className="w-3.5 h-3.5"/>
                </button>
              </div>))}
          </div>

          {/* Add field */}
          {showFieldPicker ? (<div className="border border-border-subtle rounded-card p-3">
              <p className="text-text-muted text-xs mb-2">{txt("src/components/business-card/BusinessCardEditor.tsx::031", "בחר שדה להוספה:")}</p>
              <div className="flex flex-wrap gap-1.5">
                {availableFields.map((template) => (<button key={template.label} onClick={() => addField(template.label, template.icon)} className="px-3 py-1.5 rounded-btn text-xs bg-bg-surface border border-border-subtle
                             text-text-primary hover:border-gold hover:text-gold transition-all">
                    {template.label}
                  </button>))}
                <button onClick={() => addField(txt("src/components/business-card/BusinessCardEditor.tsx::032", "שדה חדש"), "user")} className="px-3 py-1.5 rounded-btn text-xs bg-gold/10 border border-gold/30
                           text-gold hover:bg-gold/20 transition-all">{txt("src/components/business-card/BusinessCardEditor.tsx::033", "+ שדה מותאם אישית")}</button>
              </div>
              <button onClick={() => setShowFieldPicker(false)} className="text-text-muted text-xs mt-2 hover:text-text-primary">{txt("src/components/business-card/BusinessCardEditor.tsx::034", "ביטול")}</button>
            </div>) : (<button onClick={() => setShowFieldPicker(true)} className="btn-outline text-sm w-full flex items-center justify-center gap-1 py-2">
              <Plus className="w-4 h-4"/>{txt("src/components/business-card/BusinessCardEditor.tsx::035", "הוסף שדה")}</button>)}
        </div>)}

      {/* ===== SOCIAL LINKS ===== */}
      {activeSection === "social" && (<div className="card-static space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-heading text-text-primary">{txt("src/components/business-card/BusinessCardEditor.tsx::036", "קישורים חברתיים")}</h3>
            <span className="text-text-muted text-xs">{data.socialLinks.length}{txt("src/components/business-card/BusinessCardEditor.tsx::037", "קישורים")}</span>
          </div>

          <div className="space-y-2">
            {data.socialLinks.map((social, index) => {
                const config = socialLinkConfig[social.type];
                return (<div key={`${social.type}-${index}`} className="flex items-center gap-2 p-3 bg-bg-surface rounded-btn group">
                  <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-gold text-[10px] font-bold uppercase">{config.icon}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-text-muted text-[10px] mb-0.5">{config.labelHe}</p>
                    <input type="text" value={social.url} onChange={(e) => updateSocialLink(index, e.target.value)} className="input-field text-xs py-1.5" placeholder={config.placeholder} dir="ltr"/>
                  </div>
                  <button onClick={() => removeSocialLink(index)} className="text-text-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1">
                    <X className="w-3.5 h-3.5"/>
                  </button>
                </div>);
            })}
          </div>

          {/* Add social link */}
          {showSocialPicker ? (<div className="border border-border-subtle rounded-card p-3">
              <p className="text-text-muted text-xs mb-2">{txt("src/components/business-card/BusinessCardEditor.tsx::038", "בחר רשת חברתית:")}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {availableSocials.map((type) => {
                    const config = socialLinkConfig[type];
                    return (<button key={type} onClick={() => addSocialLink(type)} className="flex items-center gap-2 px-3 py-2 rounded-btn text-xs bg-bg-surface
                               border border-border-subtle text-text-primary hover:border-gold
                               hover:text-gold transition-all text-right">
                      <span className="w-6 h-6 rounded bg-gold/10 flex items-center justify-center text-gold text-[9px] font-bold uppercase flex-shrink-0">
                        {config.icon}
                      </span>
                      {config.labelHe}
                    </button>);
                })}
              </div>
              <button onClick={() => setShowSocialPicker(false)} className="text-text-muted text-xs mt-2 hover:text-text-primary">{txt("src/components/business-card/BusinessCardEditor.tsx::039", "ביטול")}</button>
            </div>) : (availableSocials.length > 0 && (<button onClick={() => setShowSocialPicker(true)} className="btn-outline text-sm w-full flex items-center justify-center gap-1 py-2">
                <Plus className="w-4 h-4"/>{txt("src/components/business-card/BusinessCardEditor.tsx::040", "הוסף קישור")}</button>))}
        </div>)}

      {/* ===== GALLERY / PORTFOLIO ===== */}
      {activeSection === "gallery" && (<div className="card-static space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-heading text-text-primary">{txt("src/components/business-card/BusinessCardEditor.tsx::041", "תיק עבודות")}</h3>
            <span className="text-text-muted text-xs">{data.galleryImages.filter(g => g).length}{txt("src/components/business-card/BusinessCardEditor.tsx::042", "/4 תמונות")}</span>
          </div>
          <p className="text-text-muted text-xs">{txt("src/components/business-card/BusinessCardEditor.tsx::043", "העלו עד 4 תמונות לתיק העבודות שיוצג בכרטיס הביקור. מקסימום 5MB לתמונה.")}</p>

          {/* Portfolio URL */}
          <div>
            <label className="text-text-muted text-xs block mb-1">קישור לתיק עבודות</label>
            <input
              type="text"
              value="/projects"
              readOnly
              className="w-full bg-bg-surface border border-border-subtle rounded-btn px-3 py-2 text-text-muted text-xs"
              dir="ltr"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {data.galleryImages.map((url, index) => (<div key={index} className="relative group">
                <div className="relative aspect-square rounded-btn overflow-hidden bg-bg-surface border border-border-subtle">
                  {url ? (<Image src={url} alt="תמונת גלריה" fill unoptimized className="object-contain" onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                    }}/>) : (<div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-text-muted opacity-20"/>
                    </div>)}
                </div>
                <button onClick={() => removeGalleryImage(index)} className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 text-white rounded-full
                           flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-3 h-3"/>
                </button>
              </div>))}
          </div>

          {data.galleryImages.length < 4 && (<GalleryUploadButton onUploaded={(url) => {
                    onChange({ ...data, galleryImages: [...data.galleryImages, url] });
                }}/>)}
        </div>)}

      {/* ===== TESTIMONIALS ===== */}
      {activeSection === "testimonials" && (<div className="card-static space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-heading text-text-primary">{txt("src/components/business-card/BusinessCardEditor.tsx::044", "לקוחות ממליצים")}</h3>
            <span className="text-text-muted text-xs">{data.testimonials.length}{txt("src/components/business-card/BusinessCardEditor.tsx::045", "/3 המלצות")}</span>
          </div>

          <div className="space-y-3">
            {data.testimonials.map((testimonial) => (<div key={testimonial.id} className="p-3 bg-bg-surface rounded-btn border border-border-subtle group relative">
                <button onClick={() => removeTestimonial(testimonial.id)} className="absolute top-2 left-2 text-text-muted hover:text-red-500
                           transition-colors opacity-0 group-hover:opacity-100">
                  <X className="w-3.5 h-3.5"/>
                </button>
                <input type="text" value={testimonial.name} onChange={(e) => updateTestimonial(testimonial.id, "name", e.target.value)} className="input-field text-xs py-1.5 mb-2" placeholder="שם הלקוח/ה"/>
                <textarea value={testimonial.text} onChange={(e) => updateTestimonial(testimonial.id, "text", e.target.value)} className="input-field text-xs py-1.5 resize-none h-16" placeholder="תוכן ההמלצה..."/>
              </div>))}
          </div>

          {data.testimonials.length < 3 && (<button onClick={addTestimonial} className="btn-outline text-sm w-full flex items-center justify-center gap-1 py-2">
              <Plus className="w-4 h-4"/>{txt("src/components/business-card/BusinessCardEditor.tsx::048", "הוסף המלצה (")}{data.testimonials.length}/3)
            </button>)}
        </div>)}

      {/* ===== THEME SELECTION ===== */}
      {activeSection === "theme" && (<div className="card-static space-y-4">
          <h3 className="text-base font-heading text-text-primary">{txt("src/components/business-card/BusinessCardEditor.tsx::049", "בחר ערכת נושא")}</h3>
          <p className="text-text-muted text-xs">{txt("src/components/business-card/BusinessCardEditor.tsx::050", "לחץ על ערכת נושא כדי להחיל אותה. הצבעים ישתנו בתצוגה המקדימה באופן מיידי.")}</p>

          <div className="grid grid-cols-2 gap-3">
            {cardThemes.map((t) => {
                const isActive = data.themeId === t.id;
                return (<button key={t.id} onClick={() => setTheme(t.id)} className={`relative rounded-card overflow-hidden border-2 transition-all duration-200 text-right ${isActive
                        ? "border-gold shadow-gold"
                        : "border-border-subtle hover:border-gold/50"}`}>
                  {/* Mini preview */}
                  <div style={{ background: t.colors.headerBg }} className="h-8 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full border-2" style={{
                        borderColor: t.colors.primary,
                        background: t.colors.cardBg,
                    }}/>
                  </div>
                  <div style={{ background: t.colors.background }} className="p-2.5">
                    <div className="flex gap-1 mb-1.5">
                      {[t.colors.primary, t.colors.secondary, t.colors.socialIcon].map((c, i) => (<div key={i} className="w-4 h-4 rounded-full border" style={{ background: c, borderColor: t.colors.border }}/>))}
                    </div>
                    <p className="text-[10px] font-bold" style={{ color: t.colors.text }}>
                      {t.nameHe}
                    </p>
                    <p className="text-[8px]" style={{ color: t.colors.textMuted }}>
                      {t.name}
                    </p>
                  </div>

                  {/* Active indicator */}
                  {isActive && (<div className="absolute top-1 left-1 w-5 h-5 bg-gold rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white"/>
                    </div>)}
                </button>);
            })}
          </div>
        </div>)}

      {/* ===== FONTS ===== */}
      {activeSection === "fonts" && (<div className="card-static space-y-5">
          <h3 className="text-base font-heading text-text-primary">{txt("src/components/business-card/BusinessCardEditor.tsx::051", "בחירת גופנים")}</h3>
          <p className="text-text-muted text-xs">{txt("src/components/business-card/BusinessCardEditor.tsx::052", "בחרו גופן לכותרות וגופן לטקסט. 30 גופני דפוס ו-10 גופני כתב יד — כולם בעברית.")}</p>

          {/* ---- Heading Font ---- */}
          <div>
            <label className="block text-text-primary text-sm font-medium mb-2">{txt("src/components/business-card/BusinessCardEditor.tsx::053", "גופן כותרות")}</label>

            {/* דפוס */}
            <p className="text-gold text-[11px] font-bold mb-1">{txt("src/components/business-card/BusinessCardEditor.tsx::054", "דפוס (30)")}</p>
            <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto pr-1 mb-3">
              {printFontOptions.map((font) => {
                const isActive = (data.headingFontId || "frank-ruhl") === font.id;
                return (<button key={font.id} onClick={() => onChange({ ...data, headingFontId: font.id })} className={`flex items-center justify-between px-3 py-2 rounded-btn text-right transition-all ${isActive
                        ? "bg-gold/15 border-2 border-gold"
                        : "bg-bg-surface border border-border-subtle hover:border-gold/50"}`}>
                    <div className="flex-1 min-w-0">
                      <span className="block text-[13px] text-text-primary truncate" style={{ fontFamily: font.family }}>
                        {font.sampleText}
                      </span>
                      <span className="block text-[10px] text-text-muted">{font.nameHe}</span>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-gold flex-shrink-0 mr-2"/>}
                  </button>);
            })}
            </div>

            {/* כתב יד */}
            <p className="text-gold text-[11px] font-bold mb-1">{txt("src/components/business-card/BusinessCardEditor.tsx::055", "כתב יד (10)")}</p>
            <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto pr-1">
              {handwritingFontOptions.map((font) => {
                const isActive = (data.headingFontId || "frank-ruhl") === font.id;
                return (<button key={font.id} onClick={() => onChange({ ...data, headingFontId: font.id })} className={`flex items-center justify-between px-3 py-2 rounded-btn text-right transition-all ${isActive
                        ? "bg-gold/15 border-2 border-gold"
                        : "bg-bg-surface border border-border-subtle hover:border-gold/50"}`}>
                    <div className="flex-1 min-w-0">
                      <span className="block text-[13px] text-text-primary truncate" style={{ fontFamily: font.family }}>
                        {font.sampleText}
                      </span>
                      <span className="block text-[10px] text-text-muted">{font.nameHe}</span>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-gold flex-shrink-0 mr-2"/>}
                  </button>);
            })}
            </div>
          </div>

          {/* ---- Body Font ---- */}
          <div>
            <label className="block text-text-primary text-sm font-medium mb-2">{txt("src/components/business-card/BusinessCardEditor.tsx::056", "גופן טקסט")}</label>

            {/* דפוס */}
            <p className="text-gold text-[11px] font-bold mb-1">{txt("src/components/business-card/BusinessCardEditor.tsx::057", "דפוס (30)")}</p>
            <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto pr-1 mb-3">
              {printFontOptions.map((font) => {
                const isActive = (data.bodyFontId || "heebo") === font.id;
                return (<button key={font.id} onClick={() => onChange({ ...data, bodyFontId: font.id })} className={`flex items-center justify-between px-3 py-2 rounded-btn text-right transition-all ${isActive
                        ? "bg-gold/15 border-2 border-gold"
                        : "bg-bg-surface border border-border-subtle hover:border-gold/50"}`}>
                    <div className="flex-1 min-w-0">
                      <span className="block text-[13px] text-text-primary truncate" style={{ fontFamily: font.family }}>
                        {font.sampleText}
                      </span>
                      <span className="block text-[10px] text-text-muted">{font.nameHe}</span>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-gold flex-shrink-0 mr-2"/>}
                  </button>);
            })}
            </div>

            {/* כתב יד */}
            <p className="text-gold text-[11px] font-bold mb-1">{txt("src/components/business-card/BusinessCardEditor.tsx::058", "כתב יד (10)")}</p>
            <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto pr-1">
              {handwritingFontOptions.map((font) => {
                const isActive = (data.bodyFontId || "heebo") === font.id;
                return (<button key={font.id} onClick={() => onChange({ ...data, bodyFontId: font.id })} className={`flex items-center justify-between px-3 py-2 rounded-btn text-right transition-all ${isActive
                        ? "bg-gold/15 border-2 border-gold"
                        : "bg-bg-surface border border-border-subtle hover:border-gold/50"}`}>
                    <div className="flex-1 min-w-0">
                      <span className="block text-[13px] text-text-primary truncate" style={{ fontFamily: font.family }}>
                        {font.sampleText}
                      </span>
                      <span className="block text-[10px] text-text-muted">{font.nameHe}</span>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-gold flex-shrink-0 mr-2"/>}
                  </button>);
            })}
            </div>
          </div>
        </div>)}

      {/* ===== BRANDING ===== */}
      {activeSection === "branding" && (<div className="card-static space-y-5">
          <h3 className="text-base font-heading text-text-primary">{txt("src/components/business-card/BusinessCardEditor.tsx::059", "מיתוג")}</h3>
          <p className="text-text-muted text-xs">{txt("src/components/business-card/BusinessCardEditor.tsx::060", "העלו לוגו, תמונת פרופיל ותמונת רקע לכותרת הכרטיס. מקסימום 5MB לתמונה.")}</p>

          <ImageUploader label="לוגו" value={data.logoUrl || ""} onChange={(url) => onChange({ ...data, logoUrl: url })} shape="square"/>

          <ImageUploader label="תמונת פרופיל" value={data.avatarUrl || ""} onChange={(url) => onChange({ ...data, avatarUrl: url })} shape="circle"/>

          <div>
            <ImageUploader label="תמונת רקע לכותרת" value={data.headerBgImage || ""} onChange={(url) => onChange({ ...data, headerBgImage: url })} shape="banner"/>
            <p className="text-text-muted text-[10px] mt-1">{txt("src/components/business-card/BusinessCardEditor.tsx::064", "תמונה פנורמית מומלצת (1200x400 פיקסלים). תוצג מאחורי הכותרת עם שכבת צבע.")}</p>
          </div>
        </div>)}

      {/* ===== COLOR PALETTE ===== */}
      {activeSection === "colors" && (<div className="card-static space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-heading text-text-primary">{txt("src/components/business-card/BusinessCardEditor.tsx::065", "פלטת צבעים")}</h3>
            <button onClick={resetColors} className="text-text-muted text-xs hover:text-gold transition-colors">{txt("src/components/business-card/BusinessCardEditor.tsx::066", "אפס לברירת מחדל")}</button>
          </div>
          <p className="text-text-muted text-xs">{txt("src/components/business-card/BusinessCardEditor.tsx::067", "התאם כל צבע בכרטיס בדיוק. השינויים יוצגו בזמן אמת בתצוגה המקדימה.")}</p>

          <div className="space-y-2">
            {colorLabels.map(({ key, label }) => (<div key={key} className="flex items-center gap-3 p-2 bg-bg-surface rounded-btn">
                <div className="relative">
                  <input type="color" value={mergedColors[key]} onChange={(e) => updateColor(key, e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-border-subtle" style={{ padding: 0 }}/>
                </div>
                <div className="flex-1">
                  <p className="text-text-primary text-xs font-medium">{label}</p>
                </div>
                <input type="text" value={mergedColors[key]} onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9a-fA-F]{0,8}$/.test(val) || val === "") {
                        updateColor(key, val);
                    }
                }} className="input-field text-[10px] py-1 w-24 font-mono text-center" dir="ltr"/>
                {data.customColors[key] && (<button onClick={() => {
                        const newCustom = { ...data.customColors };
                        delete newCustom[key];
                        onChange({ ...data, customColors: newCustom });
                    }} className="text-text-muted hover:text-red-500 transition-colors" title="אפס">
                    <X className="w-3 h-3"/>
                  </button>)}
              </div>))}
          </div>
        </div>)}

      {/* ===== BUSINESS HOURS ===== */}
      {activeSection === "hours" && (<div className="card-static space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-heading text-text-primary">{txt("src/components/business-card/BusinessCardEditor.tsx::105", "שעות פעילות")}</h3>
          </div>

          {/* Toggle show/hide */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={data.showBusinessHours || false} onChange={(e) => onChange({ ...data, showBusinessHours: e.target.checked, businessHours: data.businessHours || defaultBusinessHours })} className="w-4 h-4 rounded border-border-subtle text-gold focus:ring-gold"/>
            <span className="text-text-primary text-xs">{txt("src/components/business-card/BusinessCardEditor.tsx::106", "הצג שעות פעילות בכרטיס")}</span>
          </label>

          {/* Hours table */}
          <div className="space-y-2">
            {hours.map((h, index) => (<div key={h.day} className="flex items-center gap-2 p-2.5 bg-bg-surface rounded-btn">
                <span className="text-text-primary text-xs font-medium w-14 flex-shrink-0">{h.dayHe}</span>
                <label className="flex items-center gap-1.5 flex-shrink-0">
                  <input type="checkbox" checked={h.closed} onChange={(e) => updateHour(index, "closed", e.target.checked)} className="w-3.5 h-3.5 rounded border-border-subtle text-gold focus:ring-gold"/>
                  <span className="text-text-muted text-[10px]">{txt("src/components/business-card/BusinessCardEditor.tsx::107", "סגור")}</span>
                </label>
                {!h.closed && (<>
                  <input type="time" value={h.from} onChange={(e) => updateHour(index, "from", e.target.value)} className="input-field text-xs py-1 w-24" dir="ltr"/>
                  <span className="text-text-muted text-xs">-</span>
                  <input type="time" value={h.to} onChange={(e) => updateHour(index, "to", e.target.value)} className="input-field text-xs py-1 w-24" dir="ltr"/>
                </>)}
              </div>))}
          </div>
        </div>)}

      {/* ===== EXPERTISE TAGS ===== */}
      {activeSection === "expertise" && (<div className="card-static space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-heading text-text-primary">{txt("src/components/business-card/BusinessCardEditor.tsx::108", "תחומי מומחיות")}</h3>
            <span className="text-text-muted text-xs">{tags.length}/12</span>
          </div>
          <p className="text-text-muted text-xs">{txt("src/components/business-card/BusinessCardEditor.tsx::109", "הוסיפו תגיות שמתארות את תחומי המומחיות שלכם. מקסימום 12 תגיות.")}</p>

          {/* Add tag input */}
          <div className="flex gap-2">
            <input type="text" value={expertiseInput} onChange={(e) => setExpertiseInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addExpertiseTag(); } }} className="input-field text-xs py-1.5 flex-1" placeholder={txt("src/components/business-card/BusinessCardEditor.tsx::110", "למשל: עיצוב גרפי, צילום...")} disabled={tags.length >= 12}/>
            <button onClick={addExpertiseTag} disabled={tags.length >= 12 || !expertiseInput.trim()} className="btn-outline text-xs px-3 py-1.5 disabled:opacity-50">
              <Plus className="w-4 h-4"/>
            </button>
          </div>

          {/* Tag chips */}
          {tags.length > 0 && (<div className="flex flex-wrap gap-1.5">
            {tags.map((tag, index) => (<span key={index} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-gold/10 text-gold border border-gold/20">
                {tag}
                <button onClick={() => removeExpertiseTag(index)} className="hover:text-red-500 transition-colors">
                  <X className="w-3 h-3"/>
                </button>
              </span>))}
          </div>)}
        </div>)}

      {/* ===== BEFORE/AFTER ===== */}
      {activeSection === "beforeafter" && (<div className="card-static space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-heading text-text-primary">{txt("src/components/business-card/BusinessCardEditor.tsx::111", "לפני/אחרי")}</h3>
            <span className="text-text-muted text-xs">{beforeAfterItems.length}/6</span>
          </div>
          <p className="text-text-muted text-xs">{txt("src/components/business-card/BusinessCardEditor.tsx::112", "העלו עד 6 זוגות של תמונות לפני/אחרי להצגת העבודה שלכם.")}</p>

          <div className="space-y-4">
            {beforeAfterItems.map((item) => (<div key={item.id} className="p-3 bg-bg-surface rounded-btn border border-border-subtle group relative">
                <button onClick={() => removeBeforeAfterItem(item.id)} className="absolute top-2 left-2 text-text-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                  <X className="w-3.5 h-3.5"/>
                </button>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <p className="text-text-muted text-[10px] mb-1">{txt("src/components/business-card/BusinessCardEditor.tsx::113", "לפני")}</p>
                    {item.beforeUrl ? (
                      <div className="relative aspect-square rounded-btn overflow-hidden bg-bg-surface border border-border-subtle">
                        <Image src={item.beforeUrl} alt="תמונה לפני" fill unoptimized className="object-contain"/>
                        <button onClick={() => updateBeforeAfterItem(item.id, "beforeUrl", "")} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                          <X className="w-3 h-3"/>
                        </button>
                      </div>
                    ) : (
                      <GalleryUploadButton onUploaded={(url) => updateBeforeAfterItem(item.id, "beforeUrl", url)}/>
                    )}
                  </div>
                  <div>
                    <p className="text-text-muted text-[10px] mb-1">{txt("src/components/business-card/BusinessCardEditor.tsx::114", "אחרי")}</p>
                    {item.afterUrl ? (
                      <div className="relative aspect-square rounded-btn overflow-hidden bg-bg-surface border border-border-subtle">
                        <Image src={item.afterUrl} alt="תמונה אחרי" fill unoptimized className="object-contain"/>
                        <button onClick={() => updateBeforeAfterItem(item.id, "afterUrl", "")} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                          <X className="w-3 h-3"/>
                        </button>
                      </div>
                    ) : (
                      <GalleryUploadButton onUploaded={(url) => updateBeforeAfterItem(item.id, "afterUrl", url)}/>
                    )}
                  </div>
                </div>
                <input type="text" value={item.caption} onChange={(e) => updateBeforeAfterItem(item.id, "caption", e.target.value)} className="input-field text-xs py-1.5 w-full" placeholder={txt("src/components/business-card/BusinessCardEditor.tsx::115", "כיתוב (אופציונלי)")}/>
              </div>))}
          </div>

          {beforeAfterItems.length < 6 && (<button onClick={addBeforeAfterItem} className="btn-outline text-sm w-full flex items-center justify-center gap-1 py-2">
              <Plus className="w-4 h-4"/>{txt("src/components/business-card/BusinessCardEditor.tsx::116", "הוסף זוג לפני/אחרי")} ({beforeAfterItems.length}/6)
            </button>)}
        </div>)}

      {/* ===== STATS ===== */}
      {activeSection === "stats" && (<div className="card-static space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-heading text-text-primary">{txt("src/components/business-card/BusinessCardEditor.tsx::117", "סטטיסטיקות")}</h3>
          </div>

          {/* Toggle show/hide */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={data.showStats || false} onChange={(e) => onChange({ ...data, showStats: e.target.checked })} className="w-4 h-4 rounded border-border-subtle text-gold focus:ring-gold"/>
            <span className="text-text-primary text-xs">{txt("src/components/business-card/BusinessCardEditor.tsx::118", "הצג סטטיסטיקות בכרטיס")}</span>
          </label>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-2.5 bg-bg-surface rounded-btn">
              <span className="text-text-primary text-xs font-medium flex-1">{txt("src/components/business-card/BusinessCardEditor.tsx::130", "שנות ניסיון")}</span>
              <input type="number" min={0} value={stats.yearsExperience} onChange={(e) => updateStat("yearsExperience", parseInt(e.target.value) || 0)} className="input-field text-xs py-1.5 w-20 text-center" dir="ltr"/>
            </div>
            <div className="flex items-center gap-3 p-2.5 bg-bg-surface rounded-btn">
              <span className="text-text-primary text-xs font-medium flex-1">{txt("src/components/business-card/BusinessCardEditor.tsx::131", "פרויקטים שהושלמו")}</span>
              <input type="number" min={0} value={stats.projectsCompleted} onChange={(e) => updateStat("projectsCompleted", parseInt(e.target.value) || 0)} className="input-field text-xs py-1.5 w-20 text-center" dir="ltr"/>
            </div>
            <div className="flex items-center gap-3 p-2.5 bg-bg-surface rounded-btn">
              <span className="text-text-primary text-xs font-medium flex-1">{txt("src/components/business-card/BusinessCardEditor.tsx::132", "דירוג ממוצע (0-5)")}</span>
              <input type="number" min={0} max={5} step={0.1} value={stats.averageRating} onChange={(e) => updateStat("averageRating", Math.min(5, Math.max(0, parseFloat(e.target.value) || 0)))} className="input-field text-xs py-1.5 w-20 text-center" dir="ltr"/>
            </div>
            <div className="flex items-center gap-3 p-2.5 bg-bg-surface rounded-btn">
              <span className="text-text-primary text-xs font-medium flex-1">{txt("src/components/business-card/BusinessCardEditor.tsx::133", "לקוחות מרוצים")}</span>
              <input type="number" min={0} value={stats.happyClients} onChange={(e) => updateStat("happyClients", parseInt(e.target.value) || 0)} className="input-field text-xs py-1.5 w-20 text-center" dir="ltr"/>
            </div>
          </div>
        </div>)}

      {/* ===== ANIMATIONS & ADVANCED ===== */}
      {activeSection === "animations" && (<div className="card-static space-y-5">
          <h3 className="text-base font-heading text-text-primary">{txt("src/components/business-card/BusinessCardEditor.tsx::134", "אנימציות והגדרות מתקדמות")}</h3>

          {/* Entry Animation */}
          <div>
            <label className="block text-text-primary text-sm font-medium mb-2">{txt("src/components/business-card/BusinessCardEditor.tsx::135", "אנימצית כניסה")}</label>
            <div className="space-y-1">
              {animationOptions.map((opt) => (<label key={opt.value} className="flex items-center gap-2 p-2 bg-bg-surface rounded-btn cursor-pointer hover:bg-gold/5 transition-colors">
                  <input type="radio" name="entryAnimation" value={opt.value} checked={(data.entryAnimation || "none") === opt.value} onChange={() => onChange({ ...data, entryAnimation: opt.value })} className="w-3.5 h-3.5 text-gold focus:ring-gold"/>
                  <span className="text-text-primary text-xs">{opt.label}</span>
                </label>))}
            </div>
          </div>

          {/* Dark/Light Mode */}
          <div>
            <label className="block text-text-primary text-sm font-medium mb-2">{txt("src/components/business-card/BusinessCardEditor.tsx::136", "מצב תצוגה")}</label>
            <div className="flex gap-2">
              <button onClick={() => onChange({ ...data, darkMode: false })} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-btn text-xs font-medium transition-all ${!data.darkMode ? "bg-gold/15 border-2 border-gold text-gold" : "bg-bg-surface border border-border-subtle text-text-muted hover:border-gold/50"}`}>
                <Sun className="w-4 h-4"/>
                {txt("src/components/business-card/BusinessCardEditor.tsx::137", "בהיר")}
              </button>
              <button onClick={() => onChange({ ...data, darkMode: true })} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-btn text-xs font-medium transition-all ${data.darkMode ? "bg-gold/15 border-2 border-gold text-gold" : "bg-bg-surface border border-border-subtle text-text-muted hover:border-gold/50"}`}>
                <Moon className="w-4 h-4"/>
                {txt("src/components/business-card/BusinessCardEditor.tsx::138", "כהה")}
              </button>
            </div>
          </div>

          {/* QR Code Toggle */}
          <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-bg-surface rounded-btn">
            <input type="checkbox" checked={data.showQrCode || false} onChange={(e) => onChange({ ...data, showQrCode: e.target.checked })} className="w-4 h-4 rounded border-border-subtle text-gold focus:ring-gold"/>
            <span className="text-text-primary text-xs">{txt("src/components/business-card/BusinessCardEditor.tsx::139", "הצג קוד QR")}</span>
          </label>

          {/* Video URL */}
          <div>
            <label className="block text-text-primary text-sm font-medium mb-2">
              <Video className="w-4 h-4 inline-block ml-1"/>
              {txt("src/components/business-card/BusinessCardEditor.tsx::140", "קישור לסרטון")}
            </label>
            <input type="url" value={data.videoUrl || ""} onChange={(e) => onChange({ ...data, videoUrl: e.target.value })} className="input-field text-xs py-1.5 w-full" placeholder="https://youtube.com/watch?v=..." dir="ltr"/>
          </div>

          {/* vCard Toggle */}
          <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-bg-surface rounded-btn">
            <input type="checkbox" checked={data.showVCard || false} onChange={(e) => onChange({ ...data, showVCard: e.target.checked })} className="w-4 h-4 rounded border-border-subtle text-gold focus:ring-gold"/>
            <span className="text-text-primary text-xs">{txt("src/components/business-card/BusinessCardEditor.tsx::141", "הצג כפתור הורדת vCard")}</span>
          </label>

          {/* Map Button Toggle + Address */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-bg-surface rounded-btn">
              <input type="checkbox" checked={data.showMapButton || false} onChange={(e) => onChange({ ...data, showMapButton: e.target.checked })} className="w-4 h-4 rounded border-border-subtle text-gold focus:ring-gold"/>
              <MapPin className="w-4 h-4 text-text-muted"/>
              <span className="text-text-primary text-xs">{txt("src/components/business-card/BusinessCardEditor.tsx::142", "הצג כפתור מפה")}</span>
            </label>
            {data.showMapButton && (<input type="text" value={data.businessAddress || ""} onChange={(e) => onChange({ ...data, businessAddress: e.target.value })} className="input-field text-xs py-1.5 w-full mt-2" placeholder={txt("src/components/business-card/BusinessCardEditor.tsx::143", "כתובת העסק")}/>)}
          </div>
        </div>)}
    </div>);
}
