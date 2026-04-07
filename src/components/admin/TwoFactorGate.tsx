"use client";

import { ReactNode, useRef, useState } from "react";

type Props = {
  adminEmail: string;
  purpose: string;
  contextId?: string;
  onVerified: () => void;
  children: ReactNode;
};

const GOLD = "#C9A84C";
const PANEL = "#141414";
const BORDER = "#2a2a2a";
const TEXT = "#e5e5e5";
const MUTED = "#888";

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
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: PANEL,
          border: `1px solid ${BORDER}`,
          borderRadius: 16,
          padding: 32,
          width: "100%",
          maxWidth: 440,
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            color: GOLD,
            fontWeight: 700,
            fontSize: 18,
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          אימות דו-שלבי
        </div>
        <div
          style={{
            color: TEXT,
            fontSize: 13,
            textAlign: "center",
            marginBottom: 20,
            lineHeight: 1.6,
          }}
        >
          לאימות הפעולה נשלח קוד לאימייל שלך
        </div>

        {!sent && (
          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            style={{
              width: "100%",
              background: GOLD,
              color: "#0a0a0a",
              border: "none",
              padding: "12px 16px",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              cursor: sending ? "not-allowed" : "pointer",
              opacity: sending ? 0.6 : 1,
            }}
          >
            {sending ? "שולחת..." : "שלחי קוד"}
          </button>
        )}

        {sent && (
          <>
            <div style={{ color: MUTED, fontSize: 12, textAlign: "center", marginBottom: 12 }}>
              קוד נשלח אל {adminEmail}
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "center",
                marginBottom: 16,
                direction: "ltr",
              }}
            >
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
                  style={{
                    width: 44,
                    height: 52,
                    background: "#0a0a0a",
                    border: `1px solid ${BORDER}`,
                    borderRadius: 8,
                    color: GOLD,
                    fontSize: 22,
                    fontWeight: 700,
                    textAlign: "center",
                    outline: "none",
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={handleVerify}
              disabled={verifying}
              style={{
                width: "100%",
                background: GOLD,
                color: "#0a0a0a",
                border: "none",
                padding: "12px 16px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                cursor: verifying ? "not-allowed" : "pointer",
                opacity: verifying ? 0.6 : 1,
                marginBottom: 8,
              }}
            >
              {verifying ? "מאמתת..." : "אמתי"}
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              style={{
                width: "100%",
                background: "transparent",
                color: MUTED,
                border: "none",
                padding: "8px",
                fontSize: 12,
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              שלחי קוד חדש
            </button>
          </>
        )}

        {error && (
          <div
            style={{
              marginTop: 12,
              padding: "8px 12px",
              background: "rgba(229,57,53,0.15)",
              border: "1px solid rgba(229,57,53,0.4)",
              borderRadius: 8,
              color: "#ff6b6b",
              fontSize: 12,
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
