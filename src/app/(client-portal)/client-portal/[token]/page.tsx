"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Mail, Lock, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function ClientPortalEntry() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [step, setStep] = useState<"loading" | "request-otp" | "verify-otp" | "error">("loading");
  const [clientName, setClientName] = useState("");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // Check if token is valid on load
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/client-portal/${token}/project`);
        if (res.ok) {
          const data = await res.json();
          setClientName(data.client?.name || "");
          // Check if already authenticated (via cookie)
          const sessionCookie = document.cookie.includes("client_portal_session");
          if (sessionCookie) {
            router.push(`/client-portal/${token}/dashboard`);
            return;
          }
          setStep("request-otp");
        } else {
          setStep("error");
          setError("הקישור אינו תקין או שפג תוקפו");
        }
      } catch {
        setStep("error");
        setError("שגיאת חיבור לשרת");
      }
    })();
  }, [token, router]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError("");

    try {
      const res = await fetch(`/api/client-portal/${token}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "שגיאה בשליחת קוד");
        return;
      }

      setOtpSent(true);
      setStep("verify-otp");
    } catch {
      setError("שגיאת רשת");
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setError("");

    try {
      const res = await fetch(`/api/client-portal/${token}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: otpCode.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "קוד שגוי");
        return;
      }

      // Set a simple session cookie (in production, use httpOnly from server)
      document.cookie = `client_portal_session=${token}; path=/client-portal; max-age=86400; samesite=strict`;
      router.push(`/client-portal/${token}/dashboard`);
    } catch {
      setError("שגיאת רשת");
    } finally {
      setVerifying(false);
    }
  };

  if (step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-heading text-text-primary mb-2">שגיאה</h1>
          <p className="text-text-muted">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-gold" />
          </div>
          <h1 className="text-2xl font-heading text-text-primary mb-1">
            פורטל לקוח
          </h1>
          {clientName && (
            <p className="text-text-muted">
              שלום {clientName}, נא אמתי את הזהות כדי לצפות בפרויקט
            </p>
          )}
        </div>

        {/* Request OTP */}
        {step === "request-otp" && (
          <form onSubmit={handleSendOtp} className="bg-white border border-border-subtle rounded-card p-6 shadow-sm space-y-4">
            <div>
              <label className="text-text-secondary text-sm font-medium block mb-1">
                כתובת מייל
              </label>
              <div className="relative">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="email"
                  className="input-field pr-11"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  dir="ltr"
                  required
                />
              </div>
              <p className="text-text-muted text-xs mt-1">
                נשלח אליך קוד אימות חד-פעמי
              </p>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={sending}
              className="btn-gold w-full flex items-center justify-center gap-2"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              {sending ? "שולח..." : "שלח קוד אימות"}
            </button>
          </form>
        )}

        {/* Verify OTP */}
        {step === "verify-otp" && (
          <form onSubmit={handleVerifyOtp} className="bg-white border border-border-subtle rounded-card p-6 shadow-sm space-y-4">
            {otpSent && (
              <div className="flex items-center gap-2 text-emerald-600 text-sm bg-emerald-50 rounded-btn p-3">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                קוד אימות נשלח ל-{email}
              </div>
            )}
            <div>
              <label className="text-text-secondary text-sm font-medium block mb-1">
                קוד אימות
              </label>
              <input
                type="text"
                className="input-field text-center text-2xl tracking-[0.5em] font-mono"
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                dir="ltr"
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={verifying || otpCode.length !== 6}
              className="btn-gold w-full flex items-center justify-center gap-2"
            >
              {verifying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {verifying ? "מאמת..." : "אימות כניסה"}
            </button>
            <button
              type="button"
              onClick={() => { setStep("request-otp"); setOtpCode(""); setError(""); }}
              className="w-full text-center text-sm text-text-muted hover:text-gold transition-colors flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              שלח קוד מחדש
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
