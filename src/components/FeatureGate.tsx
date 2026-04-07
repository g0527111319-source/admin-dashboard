"use client";
import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";

type Props = {
  feature: string;
  children: ReactNode;
  designerId?: string;
};

const GOLD = "#C9A84C";

export default function FeatureGate({ feature, children, designerId }: Props) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (!designerId) {
      // No designer id — demo mode, allow
      setHasAccess(true);
      return;
    }
    let cancelled = false;
    fetch(
      `/api/designer/check-feature?feature=${encodeURIComponent(
        feature
      )}&designerId=${encodeURIComponent(designerId)}`
    )
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setHasAccess(Boolean(d.hasAccess));
      })
      .catch(() => {
        if (!cancelled) setHasAccess(false);
      });
    return () => {
      cancelled = true;
    };
  }, [feature, designerId]);

  if (hasAccess === null) {
    return (
      <div className="text-white/60 text-center py-12" dir="rtl">
        טוען...
      </div>
    );
  }

  if (!hasAccess) {
    const subscriptionHref = designerId
      ? `/designer/${designerId}/subscription`
      : "#";
    const trialHref = designerId
      ? `/designer/${designerId}/subscription?trial=1`
      : "#";

    return (
      <div dir="rtl" style={{ width: "100%" }}>
        <style
          dangerouslySetInnerHTML={{
            __html: `
            @keyframes featureGateGlow {
              0%, 100% { box-shadow: 0 0 0 0 rgba(201,168,76,0.25), 0 0 24px 0 rgba(201,168,76,0.15); }
              50% { box-shadow: 0 0 0 4px rgba(201,168,76,0.15), 0 0 48px 4px rgba(201,168,76,0.35); }
            }
            .feature-gate-card {
              animation: featureGateGlow 3s ease-in-out infinite;
            }
            .fg-btn-primary:hover { background: #e0c068 !important; }
            .fg-btn-outline:hover { background: rgba(201,168,76,0.1) !important; }
            `,
          }}
        />
        <div
          className="feature-gate-card"
          style={{
            background: "#1a1a2e",
            border: `2px solid ${GOLD}`,
            borderRadius: 20,
            padding: 48,
            textAlign: "center",
            maxWidth: 600,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 999,
              background: "rgba(201,168,76,0.15)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <Lock style={{ width: 44, height: 44, color: GOLD }} />
          </div>
          <h3
            style={{
              fontSize: 24,
              color: "#fff",
              fontWeight: 700,
              marginBottom: 12,
            }}
          >
            פיצ&apos;ר זה זמין במנוי המקצועי
          </h3>
          <p
            style={{
              color: "rgba(255,255,255,0.65)",
              fontSize: 14,
              marginBottom: 24,
            }}
          >
            שדרגי כדי לפתוח את כל היכולות המקצועיות
          </p>

          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "0 auto 28px",
              maxWidth: 360,
              textAlign: "right",
            }}
          >
            {[
              "מערכת CRM מלאה לניהול לקוחות",
              "כרטיס ביקור דיגיטלי וחוזים אוטומטיים",
              "תיק עבודות והודעות ישירות ללקוחות",
            ].map((b) => (
              <li
                key={b}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 0",
                  color: "rgba(255,255,255,0.8)",
                  fontSize: 14,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    background: "rgba(34,197,94,0.15)",
                    color: "#22c55e",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  ✓
                </span>
                {b}
              </li>
            ))}
          </ul>

          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              href={trialHref}
              className="fg-btn-primary"
              style={{
                background: GOLD,
                color: "#000",
                padding: "12px 28px",
                borderRadius: 12,
                fontWeight: 700,
                textDecoration: "none",
                fontSize: 14,
                transition: "background 0.2s",
              }}
            >
              נסי חינם 7 ימים
            </Link>
            <Link
              href={subscriptionHref}
              className="fg-btn-outline"
              style={{
                background: "transparent",
                color: GOLD,
                padding: "12px 28px",
                borderRadius: 12,
                fontWeight: 600,
                textDecoration: "none",
                fontSize: 14,
                border: `1px solid ${GOLD}`,
                transition: "background 0.2s",
              }}
            >
              הסבר על המנוי
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
