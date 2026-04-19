"use client";

import { useState } from "react";
import Logo from "@/components/ui/Logo";
import { siteText } from "@/content/siteText";
import { TwistButton } from "@/components/ds";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"designer" | "supplier">("designer");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const t = siteText.auth.forgotPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t.sendError);
        setLoading(false);
        return;
      }

      setSent(true);
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

        {!sent ? (
          <div className="bg-white rounded-card shadow-card p-8 animate-fade-in">
            <a href="/login" className="flex items-center gap-2 text-text-muted hover:text-gold mb-6 transition-colors text-sm">
              <ArrowLeft className="w-4 h-4 rotate-180" />
              {siteText.auth.common.backToLogin}
            </a>

            <h1 className="text-2xl font-bold text-text-primary mb-2">{t.title}</h1>
            <p className="text-text-muted mb-6">{t.description}</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">{siteText.auth.common.emailLabel}</label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" required className="input-field pr-10" dir="ltr" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">{siteText.auth.common.roleLabel}</label>
                <div className="flex gap-3">
                  {(["designer", "supplier"] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setRole(item)}
                      className={`flex-1 py-2.5 rounded-btn text-sm font-medium border transition-all ${role === item ? "bg-gold/10 border-gold text-gold" : "bg-white border-border-subtle text-text-muted hover:border-gold/50"}`}
                    >
                      {siteText.auth.roles[item].label}
                    </button>
                  ))}
                </div>
              </div>

              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

              <TwistButton type="submit" disabled={loading} variant="primary" size="lg" className="w-full">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t.submitButton}
              </TwistButton>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-card shadow-card p-8 text-center animate-fade-in">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">{t.sentTitle}</h2>
            <p className="text-text-muted mb-6">
              {t.sentPrefix} {email} {t.sentSuffix}
            </p>
            <TwistButton href="/login" variant="primary" size="md">
              {siteText.auth.common.backToLogin}
            </TwistButton>
          </div>
        )}
      </div>
    </div>
  );
}
