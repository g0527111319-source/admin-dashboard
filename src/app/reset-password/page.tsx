"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Logo from "@/components/ui/Logo";
import { siteText } from "@/content/siteText";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gold" /></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const t = siteText.auth.resetPassword;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6" dir="rtl">
        <div className="bg-white rounded-card shadow-card p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">{t.invalidTitle}</h2>
          <p className="text-text-muted mb-6">{t.invalidDescription}</p>
          <a href="/forgot-password" className="btn-gold inline-block px-8 py-2.5">
            {t.requestNewLink}
          </a>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(siteText.auth.register.passwordMismatch);
      return;
    }

    if (password.length < 6) {
      setError(siteText.auth.register.passwordTooShort);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t.resetError);
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError(siteText.auth.common.networkError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo size="lg" variant="light" />
        </div>

        {!success ? (
          <div className="bg-white rounded-card shadow-card p-8 animate-fade-in">
            <h1 className="text-2xl font-bold text-text-primary mb-2">{t.title}</h1>
            <p className="text-text-muted mb-6">{t.description}</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">{t.newPasswordLabel}</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={siteText.auth.register.passwordPlaceholder} required minLength={6} className="input-field pr-10 pl-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-gold">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">{t.confirmPasswordLabel}</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder={siteText.auth.register.confirmPasswordPlaceholder} required minLength={6} className="input-field pr-10" />
                </div>
              </div>

              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

              <button type="submit" disabled={loading} className="w-full btn-gold py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t.saveButton}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-card shadow-card p-8 text-center animate-fade-in">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">{t.successTitle}</h2>
            <p className="text-text-muted mb-6">{t.successDescription}</p>
            <a href="/login" className="btn-gold inline-block px-8 py-2.5">
              {siteText.auth.common.loginButton}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
