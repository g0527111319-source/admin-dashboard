"use client";
import { useState } from "react";
import Link from "next/link";
import PlanComparisonTable, { Plan } from "./PlanComparisonTable";

type Props = {
  designerId: string;
  plans: Plan[];
};

const GOLD = "#C9A84C";
const GOLD_SOFT = "#e0c068";
const DARK_BG = "#1a1a2e";

export default function OnboardingWizard({ designerId, plans }: Props) {
  const [step, setStep] = useState(1);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || null;

  async function handleStartTrial() {
    if (!selectedPlanId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/designer/subscription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": designerId,
        },
        body: JSON.stringify({
          planId: selectedPlanId,
          designerId,
          startTrial: true,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "שגיאה בהפעלת תקופת הניסיון");
      }
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה בהפעלת תקופת הניסיון");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir="rtl" style={{ width: "100%", maxWidth: 1100, margin: "0 auto" }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes confettiPop {
            0% { transform: scale(0.6); opacity: 0; }
            60% { transform: scale(1.1); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          .ow-confetti { animation: confettiPop 0.6s ease-out; }
          .ow-btn-primary:hover:not(:disabled) { background: ${GOLD_SOFT} !important; }
          .ow-btn-outline:hover:not(:disabled) { background: rgba(201,168,76,0.1) !important; }
          `,
        }}
      />

      {/* Progress dots */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 14,
          marginBottom: 36,
        }}
      >
        {[1, 2, 3].map((s) => {
          const active = s <= step;
          return (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  background: active ? GOLD : "rgba(255,255,255,0.15)",
                  boxShadow: s === step ? `0 0 16px ${GOLD}` : "none",
                  transition: "all 0.3s",
                }}
              />
              {s < 3 && (
                <span
                  style={{
                    width: 40,
                    height: 2,
                    background:
                      s < step ? GOLD : "rgba(255,255,255,0.15)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.4)",
            color: "#fca5a5",
            padding: "12px 16px",
            borderRadius: 12,
            marginBottom: 20,
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {/* STEP 1: Welcome */}
      {step === 1 && !success && (
        <div
          style={{
            background: DARK_BG,
            border: `1px solid rgba(201,168,76,0.3)`,
            borderRadius: 20,
            padding: 48,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 56, marginBottom: 16 }}>👋</div>
          <h1
            style={{
              fontSize: 32,
              color: GOLD,
              marginBottom: 12,
              fontWeight: 700,
            }}
          >
            ברוכה הבאה!
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.75)",
              fontSize: 16,
              maxWidth: 600,
              margin: "0 auto 32px",
              lineHeight: 1.7,
            }}
          >
            שמחות שהצטרפת לקהילת זירת. נעזור לך להתחיל בכמה צעדים פשוטים — נכיר
            את התוכניות הזמינות, נבחר את המתאימה לך, ונפעיל לך תקופת ניסיון
            חינם.
          </p>
          <button
            onClick={() => setStep(2)}
            className="ow-btn-primary"
            style={{
              background: GOLD,
              color: "#000",
              border: "none",
              padding: "14px 36px",
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 16,
              cursor: "pointer",
              transition: "background 0.2s",
            }}
          >
            בואי נתחיל
          </button>
        </div>
      )}

      {/* STEP 2: Plan selection */}
      {step === 2 && !success && (
        <div>
          <h2
            style={{
              fontSize: 24,
              color: GOLD,
              marginBottom: 8,
              textAlign: "center",
              fontWeight: 700,
            }}
          >
            בחרי את התוכנית שלך
          </h2>
          <p
            style={{
              color: "rgba(255,255,255,0.6)",
              textAlign: "center",
              marginBottom: 28,
              fontSize: 14,
            }}
          >
            תמיד אפשר לשדרג או להחליף תוכנית בהמשך
          </p>
          <PlanComparisonTable
            plans={plans}
            highlightedPlanSlug="pro"
            onSelect={(id) => setSelectedPlanId(id)}
          />
          {selectedPlan && (
            <p
              style={{
                textAlign: "center",
                color: GOLD,
                marginTop: 20,
                fontSize: 14,
              }}
            >
              נבחרה: {selectedPlan.name}
            </p>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 12,
              marginTop: 24,
            }}
          >
            <button
              onClick={() => setStep(1)}
              className="ow-btn-outline"
              style={{
                background: "transparent",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.2)",
                padding: "12px 28px",
                borderRadius: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              חזרה
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!selectedPlanId}
              className="ow-btn-primary"
              style={{
                background: selectedPlanId ? GOLD : "rgba(255,255,255,0.1)",
                color: selectedPlanId ? "#000" : "rgba(255,255,255,0.4)",
                border: "none",
                padding: "12px 32px",
                borderRadius: 12,
                fontWeight: 700,
                cursor: selectedPlanId ? "pointer" : "not-allowed",
                transition: "background 0.2s",
              }}
            >
              הבא
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Confirm + start trial */}
      {step === 3 && !success && (
        <div
          style={{
            background: DARK_BG,
            border: `1px solid rgba(201,168,76,0.3)`,
            borderRadius: 20,
            padding: 48,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎁</div>
          <h2
            style={{
              fontSize: 28,
              color: GOLD,
              marginBottom: 12,
              fontWeight: 700,
            }}
          >
            הפעלת תקופת ניסיון חינם
          </h2>
          <p
            style={{
              color: "rgba(255,255,255,0.75)",
              fontSize: 16,
              marginBottom: 8,
            }}
          >
            תקופת ניסיון של 7 ימים, ללא חיוב, ללא התחייבות.
          </p>
          {selectedPlan && (
            <p
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: 14,
                marginBottom: 32,
              }}
            >
              תוכנית נבחרת: <span style={{ color: GOLD }}>{selectedPlan.name}</span>
            </p>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <button
              onClick={() => setStep(2)}
              disabled={loading}
              className="ow-btn-outline"
              style={{
                background: "transparent",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.2)",
                padding: "14px 28px",
                borderRadius: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              חזרה
            </button>
            <button
              onClick={handleStartTrial}
              disabled={loading}
              className="ow-btn-primary"
              style={{
                background: GOLD,
                color: "#000",
                border: "none",
                padding: "14px 36px",
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 16,
                cursor: loading ? "wait" : "pointer",
                transition: "background 0.2s",
              }}
            >
              {loading ? "מפעילים..." : "הפעילי תקופת ניסיון"}
            </button>
          </div>
        </div>
      )}

      {/* SUCCESS */}
      {success && (
        <div
          className="ow-confetti"
          style={{
            background: DARK_BG,
            border: `2px solid ${GOLD}`,
            borderRadius: 20,
            padding: 48,
            textAlign: "center",
            boxShadow: `0 0 48px rgba(201,168,76,0.3)`,
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉✨🎊</div>
          <h2
            style={{
              fontSize: 28,
              color: GOLD,
              marginBottom: 12,
              fontWeight: 700,
            }}
          >
            מזל טוב! הכול מוכן
          </h2>
          <p
            style={{
              color: "rgba(255,255,255,0.75)",
              fontSize: 16,
              marginBottom: 32,
            }}
          >
            תקופת הניסיון שלך פעילה. עכשיו את יכולה ליהנות מכל הפיצ'רים של המנוי.
          </p>
          <Link
            href={`/designer/${designerId}`}
            style={{
              display: "inline-block",
              background: GOLD,
              color: "#000",
              padding: "14px 36px",
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 16,
              textDecoration: "none",
            }}
          >
            למעבר לדשבורד
          </Link>
        </div>
      )}
    </div>
  );
}
