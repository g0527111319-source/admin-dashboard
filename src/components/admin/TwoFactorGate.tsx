"use client";

import { ReactNode, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";

type Props = {
  adminEmail: string;
  purpose: string;
  contextId?: string;
  onVerified: () => void;
  children: ReactNode;
};

export default function TwoFactorGate({
  adminEmail,
  purpose,
  contextId,
  onVerified,
  children,
}: Props) {
  const [verified, setVerified] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const handleSend = async () => {
    setSending(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/2fa/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminEmail, purpose, contextId }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        setError(j.error || "שגיאה בשליחת קוד");
      } else {
        setSent(true);
        setTimeout(() => inputs.current[0]?.focus(), 50);
      }
    } catch {
      setError("שגיאה בשליחת קוד");
    } finally {
      setSending(false);
    }
  };

  const handleDigit = (i: number, value: string) => {
    const v = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const data = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!data) return;
    e.preventDefault();
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < data.length; i++) next[i] = data[i];
    setDigits(next);
    const focusIdx = Math.min(data.length, 5);
    inputs.current[focusIdx]?.focus();
  };

  const handleVerify = async () => {
    const code = digits.join("");
    if (code.length !== 6) {
      setError("אנא הזיני קוד בן 6 ספרות");
      return;
    }
    setVerifying(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminEmail, purpose, code, contextId }),
      });
      const j = await r.json();
      if (j.ok) {
        setVerified(true);
        onVerified();
      } else {
        setError("הקוד שגוי או פג תוקף");
      }
    } catch {
      setError("שגיאה באימות הקוד");
    } finally {
      setVerifying(false);
    }
  };

  if (verified) return <>{children}</>;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 bg-black/75 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm"
    >
      <div className="bg-bg-dark-surface border border-white/10 rounded-xl p-8 w-full max-w-[440px] shadow-[0_20px_60px_rgba(0,0,0,0.6)] animate-modal-enter">
        <div className="text-gold font-bold text-lg mb-2 text-center">אימות דו-שלבי</div>
        <div className="text-white/80 text-[13px] text-center mb-5 leading-relaxed">
          לאימות הפעולה נשלח קוד לאימייל שלך
        </div>

        {!sent && (
          <Button
            variant="gold"
            size="lg"
            fullWidth
            loading={sending}
            onClick={handleSend}
          >
            {sending ? "שולחת..." : "שלחי קוד"}
          </Button>
        )}

        {sent && (
          <>
            <div className="text-white/50 text-xs text-center mb-3">
              קוד נשלח אל {adminEmail}
            </div>
            {/* OTP inputs — LTR for digit order */}
            <div className="flex gap-2 justify-center mb-4" dir="ltr">
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  value={d}
                  onChange={(e) => handleDigit(i, e.target.value)}
                  onKeyDown={(e) => handleKey(i, e)}
                  onPaste={handlePaste}
                  maxLength={1}
                  className={cn(
                    "w-11 h-[52px] bg-bg-dark border border-white/10 rounded-btn",
                    "text-gold text-[22px] font-bold text-center",
                    "outline-none transition-all duration-200",
                    "focus:border-gold focus:shadow-[0_0_0_3px_rgba(201,168,76,0.2)]"
                  )}
                />
              ))}
            </div>
            <Button
              variant="gold"
              size="lg"
              fullWidth
              loading={verifying}
              onClick={handleVerify}
              className="mb-2"
            >
              {verifying ? "מאמתת..." : "אמתי"}
            </Button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="w-full bg-transparent text-white/50 border-none p-2 text-xs cursor-pointer underline hover:text-gold transition-colors disabled:opacity-50"
            >
              שלחי קוד חדש
            </button>
          </>
        )}

        {error && (
          <div className="mt-3 px-3 py-2 bg-red-500/15 border border-red-500/40 rounded-btn text-red-400 text-xs text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
