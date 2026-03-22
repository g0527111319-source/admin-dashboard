"use client";

import { useState } from "react";
import Logo from "@/components/ui/Logo";
import { siteText } from "@/content/siteText";
import {
  User, Mail, Phone, Lock, Eye, EyeOff, MapPin, Briefcase, Loader2,
  CheckCircle2, Store, Palette, ArrowLeft,
} from "lucide-react";

type RegisterRole = "designer" | "supplier";

export default function RegisterPage() {
  const [step, setStep] = useState<"choose" | "form">("choose");
  const [role, setRole] = useState<RegisterRole>("designer");
  const t = siteText.auth.register;

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    city: "",
    specialization: "",
    employmentType: "FREELANCE" as "SALARIED" | "FREELANCE",
    yearsAsIndependent: "",
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

    setLoading(true);

    try {
      const body = role === "designer" ? {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        city: form.city || undefined,
        specialization: form.specialization || undefined,
        employmentType: form.employmentType,
        yearsAsIndependent: form.yearsAsIndependent ? parseInt(form.yearsAsIndependent) : undefined,
        role: "designer",
      } : {
        fullName: form.fullName,
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

      setSuccess(true);
    } catch {
      setError(siteText.auth.common.networkError);
      setLoading(false);
    }
  };

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
            <a href="/login" className="btn-gold inline-block px-8 py-2.5">
              {t.backToLogin}
            </a>
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

      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-lg">
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

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    {role === "designer" ? t.fullNameLabel : t.contactNameLabel} *
                  </label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      type="text"
                      name="fullName"
                      value={form.fullName}
                      onChange={handleChange}
                      placeholder={t.fullNamePlaceholder}
                      required
                      className="input-field pr-10"
                    />
                  </div>
                </div>

                {role === "supplier" && (
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">
                      {t.businessNameLabel} *
                    </label>
                    <div className="relative">
                      <Store className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                      <input
                        type="text"
                        name="businessName"
                        value={form.businessName}
                        onChange={handleChange}
                        placeholder={t.businessNamePlaceholder}
                        required
                        className="input-field pr-10"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">
                      {siteText.auth.common.emailLabel} *
                    </label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                      <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="name@example.com" required className="input-field pr-10" dir="ltr" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">
                      {t.phoneLabel} *
                    </label>
                    <div className="relative">
                      <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                      <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="052-1234567" required className="input-field pr-10" dir="ltr" />
                    </div>
                  </div>
                </div>

                {role === "designer" ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1.5">{t.cityLabel}</label>
                        <div className="relative">
                          <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                          <input type="text" name="city" value={form.city} onChange={handleChange} placeholder={t.cityPlaceholder} className="input-field pr-10" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1.5">{t.specializationLabel}</label>
                        <div className="relative">
                          <Briefcase className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                          <select name="specialization" value={form.specialization} onChange={handleChange} className="select-field pr-10">
                            <option value="">{t.specializationPlaceholder}</option>
                            {t.specializations.map((item) => (
                              <option key={item} value={item}>{item}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1.5">{t.employmentTypeLabel} *</label>
                        <div className="flex gap-3">
                          <button type="button" onClick={() => setForm({ ...form, employmentType: "FREELANCE" })} className={`flex-1 py-2.5 rounded-btn text-sm font-medium border transition-all ${form.employmentType === "FREELANCE" ? "bg-gold/10 border-gold text-gold" : "bg-white border-border-subtle text-text-muted hover:border-gold/50"}`}>
                            {t.freelance}
                          </button>
                          <button type="button" onClick={() => setForm({ ...form, employmentType: "SALARIED" })} className={`flex-1 py-2.5 rounded-btn text-sm font-medium border transition-all ${form.employmentType === "SALARIED" ? "bg-gold/10 border-gold text-gold" : "bg-white border-border-subtle text-text-muted hover:border-gold/50"}`}>
                            {t.salaried}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1.5">
                          {t.yearsExperienceLabelPrefix} {form.employmentType === "FREELANCE" ? t.freelanceSuffix : t.salariedSuffix}
                        </label>
                        <input type="number" name="yearsAsIndependent" value={form.yearsAsIndependent} onChange={handleChange} placeholder="0" min="0" max="50" className="input-field" dir="ltr" />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1.5">{t.categoryLabel}</label>
                        <select name="category" value={form.category} onChange={handleChange} className="select-field">
                          <option value="">{t.categoryPlaceholder}</option>
                          {t.supplierCategories.map((item) => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1.5">{t.websiteLabel}</label>
                        <input type="url" name="website" value={form.website} onChange={handleChange} placeholder="https://example.co.il" className="input-field" dir="ltr" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1.5">{t.descriptionLabel}</label>
                      <textarea name="description" value={form.description} onChange={handleChange} placeholder={t.descriptionPlaceholder} className="input-field h-20 resize-none" />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">{siteText.auth.common.passwordLabel} *</label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                      <input type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={handleChange} placeholder={t.passwordPlaceholder} required minLength={6} className="input-field pr-10 pl-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-gold">
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1.5">{t.confirmPasswordLabel} *</label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                      <input type={showPassword ? "text" : "password"} name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder={t.confirmPasswordPlaceholder} required minLength={6} className="input-field pr-10" />
                    </div>
                  </div>
                </div>

                {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

                <button type="submit" disabled={loading} className="w-full btn-gold py-3 text-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t.submitButton}
                </button>
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
