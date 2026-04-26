"use client";

import { useState, useEffect } from "react";
import Logo from "@/components/ui/Logo";
import { siteText } from "@/content/siteText";
import { TwistButton } from "@/components/ds";
import {
  User, Mail, Phone, Lock, Eye, EyeOff, MapPin, Briefcase, Loader2,
  CheckCircle2, Store, Palette, ArrowLeft, Hash, Calendar, Home, Building2,
  Sparkles,
} from "lucide-react";

type RegisterRole = "designer" | "supplier";

const WORK_TYPES = [
  "דירות מגורים",
  "בתים פרטיים",
  "פנטהאוזים / דופלקסים",
  "וילות",
  "משרדים",
  "חנויות / מסחרי",
  "מסעדות / בתי קפה",
  "מלונות / צימרים",
  "מרפאות / קליניקות",
  "גני ילדים / מוסדות חינוך",
  "מבני ציבור",
  "שיפוצים",
  "סטיילינג",
  "תכנון מטבחים",
  "תכנון חדרי רחצה",
  "ליווי קבלנים",
];

export default function RegisterPage() {
  const [step, setStep] = useState<"choose" | "form">("choose");
  const [role, setRole] = useState<RegisterRole>("designer");
  const t = siteText.auth.register;
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      const code = ref.trim().toUpperCase().slice(0, 64);
      if (code) {
        setReferralCode(code);
        try { sessionStorage.setItem("zirat_ref", code); } catch { }
        return;
      }
    }
    try {
      const saved = sessionStorage.getItem("zirat_ref");
      if (saved) setReferralCode(saved);
    } catch { }
  }, []);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    gender: "female" as "male" | "female",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    // Designer fields
    whatsappPhone: "",
    callOnlyPhone: "",
    idNumber: "",
    city: "",
    neighborhood: "",
    street: "",
    buildingNumber: "",
    apartmentNumber: "",
    floor: "",
    birthDate: "",
    hebrewBirthDate: "",
    specialization: "",
    employmentType: "FREELANCE" as "SALARIED" | "FREELANCE",
    yearsAsIndependent: "",
    workTypes: [] as string[],
    // Supplier fields
    businessName: "",
    category: "",
    website: "",
    description: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const toggleWorkType = (wt: string) => {
    setForm(prev => ({
      ...prev,
      workTypes: prev.workTypes.includes(wt)
        ? prev.workTypes.filter(w => w !== wt)
        : [...prev.workTypes, wt],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    if (form.password.length < 6) {
      setError(t.passwordTooShort);
      return;
    }

    if (role === "designer" && (!form.firstName.trim() || !form.lastName.trim())) {
      setError("יש למלא שם פרטי ושם משפחה");
      return;
    }

    setLoading(true);

    try {
      const body = role === "designer" ? {
        fullName: `${form.firstName.trim()} ${form.lastName.trim()}`,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        gender: form.gender,
        email: form.email,
        phone: form.whatsappPhone || form.phone,
        password: form.password,
        whatsappPhone: form.whatsappPhone || undefined,
        callOnlyPhone: form.callOnlyPhone || undefined,
        idNumber: form.idNumber || undefined,
        city: form.city || undefined,
        neighborhood: form.neighborhood || undefined,
        street: form.street || undefined,
        buildingNumber: form.buildingNumber || undefined,
        apartmentNumber: form.apartmentNumber || undefined,
        floor: form.floor || undefined,
        birthDate: form.birthDate || undefined,
        hebrewBirthDate: form.hebrewBirthDate || undefined,
        specialization: form.specialization || undefined,
        employmentType: form.employmentType,
        yearsAsIndependent: form.yearsAsIndependent ? parseInt(form.yearsAsIndependent) : undefined,
        workTypes: form.workTypes.length > 0 ? form.workTypes : undefined,
        referralCode: referralCode || undefined,
        role: "designer",
      } : {
        fullName: form.firstName.trim() + (form.lastName.trim() ? ` ${form.lastName.trim()}` : ""),
        email: form.email,
        phone: form.phone,
        password: form.password,
        businessName: form.businessName,
        category: form.category || undefined,
        website: form.website || undefined,
        description: form.description || undefined,
        role: "supplier",
      };

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t.registerError);
        setLoading(false);
        return;
      }

      try { sessionStorage.removeItem("zirat_ref"); } catch { }
      setSuccess(true);
    } catch {
      setError(siteText.auth.common.networkError);
      setLoading(false);
    }
  };

  // Section header helper
  const SectionTitle = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
    <div className="flex items-center gap-2 pt-4 pb-2 border-t border-border-subtle mt-2">
      <Icon className="w-4 h-4 text-gold" />
      <h3 className="text-sm font-semibold text-gold">{title}</h3>
    </div>
  );

  if (success) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6" dir="rtl">
        <div className="w-full max-w-md text-center">
          <Logo size="lg" variant="light" />
          <div className="bg-white rounded-card shadow-card p-8 mt-8 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">{t.successTitle}</h2>
            <p className="text-text-muted mb-6">
              {role === "designer" ? t.successDesigner : t.successSupplier}
            </p>
            <TwistButton href="/login" variant="primary" size="md">
              {t.backToLogin}
            </TwistButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex" dir="rtl">
      <div className="hidden lg:flex lg:w-5/12 bg-bg-dark relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-72 h-72 bg-gold/30 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-gold/20 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 text-center px-12">
          <Logo size="xl" variant="dark" />
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-lg py-4">
          <div className="lg:hidden mb-6 text-center">
            <Logo size="lg" variant="light" />
          </div>

          {step === "choose" ? (
            <div className="animate-fade-in">
              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">
                {t.chooseTitle}
              </h1>
              <p className="text-text-muted mb-8">{t.chooseSubtitle}</p>

              <div className="space-y-3">
                <button
                  onClick={() => { setRole("designer"); setStep("form"); }}
                  className="w-full flex items-center gap-4 p-5 rounded-card border border-border-subtle
                           hover:border-gold hover:shadow-card-hover transition-all duration-300
                           bg-white group text-right"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-50 group-hover:bg-gold/20
                                flex items-center justify-center text-gold transition-colors">
                    <Palette className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-text-primary text-lg">{t.designerCardTitle}</div>
                    <div className="text-text-muted text-sm">{t.designerCardDesc}</div>
                  </div>
                  <ArrowLeft className="w-5 h-5 text-text-muted group-hover:text-gold group-hover:-translate-x-1 transition-all" />
                </button>

                <button
                  onClick={() => { setRole("supplier"); setStep("form"); }}
                  className="w-full flex items-center gap-4 p-5 rounded-card border border-border-subtle
                           hover:border-gold hover:shadow-card-hover transition-all duration-300
                           bg-white group text-right"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-50 group-hover:bg-gold/20
                                flex items-center justify-center text-gold transition-colors">
                    <Store className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-text-primary text-lg">{t.supplierCardTitle}</div>
                    <div className="text-text-muted text-sm">{t.supplierCardDesc}</div>
                  </div>
                  <ArrowLeft className="w-5 h-5 text-text-muted group-hover:text-gold group-hover:-translate-x-1 transition-all" />
                </button>
              </div>

              <p className="text-center text-text-muted text-sm mt-6">
                {siteText.auth.common.loginLinkPrefix}{" "}
                <a href="/login" className="text-gold hover:text-gold-dark font-medium">
                  {siteText.auth.common.loginLink}
                </a>
              </p>
            </div>
          ) : (
            <div className="animate-fade-in">
              <button
                onClick={() => setStep("choose")}
                className="flex items-center gap-2 text-text-muted hover:text-gold mb-4 transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4 rotate-180" />
                {siteText.auth.common.backToRoleSelection}
              </button>

              <h1 className="text-2xl font-bold text-text-primary mb-1">
                {t.titlePrefix} {role === "designer" ? t.designerTitleSuffix : t.supplierTitleSuffix}
              </h1>
              <p className="text-text-muted mb-6 text-sm">
                {role === "designer" ? t.designerSubtitle : t.supplierSubtitle}
              </p>

              {referralCode && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-gold/10 border border-gold/30 flex items-center gap-2 text-sm">
                  <Sparkles className="w-4 h-4 text-gold flex-shrink-0" />
                  <span className="text-text-primary">
                    נרשמת דרך <b className="text-gold">{referralCode}</b>
                  </span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">

                {role === "designer" ? (
                  <>
                    {/* ======= פרטים אישיים ======= */}
                    <SectionTitle icon={User} title="פרטים אישיים" />

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">שם פרטי *</label>
                        <input type="text" name="firstName" value={form.firstName} onChange={handleChange} placeholder={form.gender === "male" ? "ישראל" : "ישראלה"} required className="input-field" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">שם משפחה *</label>
                        <input type="text" name="lastName" value={form.lastName} onChange={handleChange} placeholder="כהן" required className="input-field" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">מגדר *</label>
                      <div className="flex gap-3">
                        <button type="button" onClick={() => setForm({ ...form, gender: "female" })}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.gender === "female" ? "bg-gold/20 text-gold border-gold/40" : "bg-bg-surface text-text-muted border-border hover:border-gold/30"}`}>
                          נקבה
                        </button>
                        <button type="button" onClick={() => setForm({ ...form, gender: "male" })}
                          className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.gender === "male" ? "bg-gold/20 text-gold border-gold/40" : "bg-bg-surface text-text-muted border-border hover:border-gold/30"}`}>
                          זכר
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">מס׳ ת.ז.</label>
                        <div className="relative">
                          <Hash className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                          <input type="text" name="idNumber" value={form.idNumber} onChange={handleChange} placeholder="000000000" className="input-field pr-9" dir="ltr" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">תאריך לידה לועזי</label>
                        <input type="date" name="birthDate" value={form.birthDate} onChange={handleChange} className="input-field" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">תאריך לידה עברי</label>
                      <div className="relative">
                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input type="text" name="hebrewBirthDate" value={form.hebrewBirthDate} onChange={handleChange} placeholder={`ט"ו בשבט תשנ"ה`} className="input-field pr-9" />
                      </div>
                    </div>

                    {/* ======= פרטי קשר ======= */}
                    <SectionTitle icon={Phone} title="פרטי קשר" />

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">טלפון עם וואטסאפ *</label>
                        <input type="tel" name="whatsappPhone" value={form.whatsappPhone} onChange={handleChange} placeholder="052-1234567" required className="input-field" dir="ltr" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">טלפון לשיחות בלבד</label>
                        <input type="tel" name="callOnlyPhone" value={form.callOnlyPhone} onChange={handleChange} placeholder="03-1234567" className="input-field" dir="ltr" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">כתובת מייל *</label>
                      <div className="relative">
                        <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="name@example.com" required className="input-field pr-9" dir="ltr" />
                      </div>
                    </div>

                    {/* ======= כתובת ======= */}
                    <SectionTitle icon={Home} title="כתובת" />

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">עיר *</label>
                        <input type="text" name="city" value={form.city} onChange={handleChange} placeholder="תל אביב" required className="input-field" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">שכונה</label>
                        <input type="text" name="neighborhood" value={form.neighborhood} onChange={handleChange} placeholder="פלורנטין" className="input-field" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">רחוב</label>
                        <input type="text" name="street" value={form.street} onChange={handleChange} placeholder="הרצל" className="input-field" />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-sm font-medium text-text-primary mb-1">בניין</label>
                          <input type="text" name="buildingNumber" value={form.buildingNumber} onChange={handleChange} placeholder="12" className="input-field text-center" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text-primary mb-1">דירה</label>
                          <input type="text" name="apartmentNumber" value={form.apartmentNumber} onChange={handleChange} placeholder="5" className="input-field text-center" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text-primary mb-1">קומה</label>
                          <input type="text" name="floor" value={form.floor} onChange={handleChange} placeholder="3" className="input-field text-center" />
                        </div>
                      </div>
                    </div>

                    {/* ======= פרטים מקצועיים ======= */}
                    <SectionTitle icon={Briefcase} title="פרטים מקצועיים" />

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">התמחות</label>
                        <select name="specialization" value={form.specialization} onChange={handleChange} className="select-field">
                          <option value="">בחרי התמחות</option>
                          {t.specializations.map((item) => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">{form.gender === "male" ? "שכיר או עצמאי" : "שכירה או עצמאית"} *</label>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setForm({ ...form, employmentType: "FREELANCE" })} className={`flex-1 py-2 rounded-btn text-sm font-medium border transition-all ${form.employmentType === "FREELANCE" ? "bg-gold/10 border-gold text-gold" : "bg-white border-border-subtle text-text-muted hover:border-gold/50"}`}>
                            {form.gender === "male" ? "עצמאי" : "עצמאית"}
                          </button>
                          <button type="button" onClick={() => setForm({ ...form, employmentType: "SALARIED" })} className={`flex-1 py-2 rounded-btn text-sm font-medium border transition-all ${form.employmentType === "SALARIED" ? "bg-gold/10 border-gold text-gold" : "bg-white border-border-subtle text-text-muted hover:border-gold/50"}`}>
                            {form.gender === "male" ? "שכיר" : "שכירה"}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">
                        כמה שנים {form.gender === "male" ? "אתה עובד" : "את עובדת"} בתחום {form.employmentType === "FREELANCE" ? (form.gender === "male" ? "כעצמאי" : "כעצמאית") : (form.gender === "male" ? "כשכיר" : "כשכירה")}?
                      </label>
                      <input type="number" name="yearsAsIndependent" value={form.yearsAsIndependent} onChange={handleChange} placeholder="0" min="0" max="50" className="input-field w-32" dir="ltr" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1.5">
                        {form.gender === "male" ? "סמן עבודות שיצא לך לקבל במהלך השנים" : "סמני עבודות שיצא לך לקבל במהלך השנים"}
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {WORK_TYPES.map((wt) => (
                          <label
                            key={wt}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                              form.workTypes.includes(wt)
                                ? "bg-gold/10 border-gold text-gold font-medium"
                                : "bg-white border-border-subtle text-text-muted hover:border-gold/40"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={form.workTypes.includes(wt)}
                              onChange={() => toggleWorkType(wt)}
                              className="sr-only"
                            />
                            <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                              form.workTypes.includes(wt) ? "bg-gold border-gold" : "border-gray-300"
                            }`}>
                              {form.workTypes.includes(wt) && (
                                <CheckCircle2 className="w-3 h-3 text-white" />
                              )}
                            </span>
                            {wt}
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* ======= Supplier form ======= */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">שם פרטי *</label>
                        <input type="text" name="firstName" value={form.firstName} onChange={handleChange} required className="input-field" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">שם משפחה</label>
                        <input type="text" name="lastName" value={form.lastName} onChange={handleChange} className="input-field" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1.5">
                        {t.businessNameLabel} *
                      </label>
                      <div className="relative">
                        <Store className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                        <input type="text" name="businessName" value={form.businessName} onChange={handleChange} placeholder={t.businessNamePlaceholder} required className="input-field pr-10" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">{siteText.auth.common.emailLabel} *</label>
                        <div className="relative">
                          <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                          <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="name@example.com" required className="input-field pr-9" dir="ltr" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">{t.phoneLabel} *</label>
                        <div className="relative">
                          <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                          <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="052-1234567" required className="input-field pr-9" dir="ltr" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">{t.categoryLabel}</label>
                        <select name="category" value={form.category} onChange={handleChange} className="select-field">
                          <option value="">{t.categoryPlaceholder}</option>
                          {t.supplierCategories.map((item) => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">{t.websiteLabel}</label>
                        <input type="url" name="website" value={form.website} onChange={handleChange} placeholder="https://example.co.il" className="input-field" dir="ltr" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">{t.descriptionLabel}</label>
                      <textarea name="description" value={form.description} onChange={handleChange} placeholder={t.descriptionPlaceholder} className="input-field h-20 resize-none" />
                    </div>
                  </>
                )}

                {/* ======= סיסמה ======= */}
                <SectionTitle icon={Lock} title="סיסמה" />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">{siteText.auth.common.passwordLabel} *</label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={handleChange} placeholder="לפחות 8 תווים" required minLength={6} className="input-field pr-9 pl-9" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-gold">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">{t.confirmPasswordLabel} *</label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input type={showPassword ? "text" : "password"} name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder="אימות סיסמה" required minLength={6} className="input-field pr-9" />
                    </div>
                  </div>
                </div>

                {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

                <TwistButton type="submit" disabled={loading} variant="primary" size="lg" className="w-full mt-2">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t.submitButton}
                </TwistButton>
              </form>

              <p className="text-center text-text-muted text-sm mt-6">
                {siteText.auth.common.loginLinkPrefix}{" "}
                <a href="/login" className="text-gold hover:text-gold-dark font-medium">
                  {siteText.auth.common.loginLink}
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
