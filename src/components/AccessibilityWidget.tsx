"use client";
import { useState, useEffect, useCallback } from "react";

type AccessibilitySettings = {
  fontSize: number; // 0=100%, 1=120%, 2=140%
  highContrast: boolean;
  grayscale: boolean;
  underlineLinks: boolean;
  readableFont: boolean;
};

const defaultSettings: AccessibilitySettings = {
  fontSize: 0,
  highContrast: false,
  grayscale: false,
  underlineLinks: false,
  readableFont: false,
};

const FONT_SIZES = [100, 120, 140];

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);

  // Apply settings to document
  const applySettings = useCallback((s: AccessibilitySettings) => {
    const html = document.documentElement;

    // Font size
    html.style.fontSize = `${FONT_SIZES[s.fontSize]}%`;

    // High contrast
    if (s.highContrast) {
      html.classList.add("a11y-high-contrast");
    } else {
      html.classList.remove("a11y-high-contrast");
    }

    // Grayscale
    if (s.grayscale) {
      html.classList.add("a11y-grayscale");
    } else {
      html.classList.remove("a11y-grayscale");
    }

    // Underline links
    if (s.underlineLinks) {
      html.classList.add("a11y-underline-links");
    } else {
      html.classList.remove("a11y-underline-links");
    }

    // Readable font
    if (s.readableFont) {
      html.classList.add("a11y-readable-font");
    } else {
      html.classList.remove("a11y-readable-font");
    }
  }, []);

  useEffect(() => {
    applySettings(settings);
  }, [settings, applySettings]);

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const increaseFontSize = () => {
    setSettings((prev) => ({
      ...prev,
      fontSize: Math.min(prev.fontSize + 1, 2) as 0 | 1 | 2,
    }));
  };

  const decreaseFontSize = () => {
    setSettings((prev) => ({
      ...prev,
      fontSize: Math.max(prev.fontSize - 1, 0) as 0 | 1 | 2,
    }));
  };

  const resetAll = () => {
    setSettings(defaultSettings);
  };

  const hasChanges =
    settings.fontSize !== 0 ||
    settings.highContrast ||
    settings.grayscale ||
    settings.underlineLinks ||
    settings.readableFont;

  return (
    <>
      {/* Accessibility CSS */}
      <style jsx global>{`
        .a11y-high-contrast {
          filter: contrast(1.4) !important;
        }
        .a11y-high-contrast * {
          border-color: #fff !important;
        }
        .a11y-grayscale {
          filter: grayscale(1) !important;
        }
        .a11y-high-contrast.a11y-grayscale {
          filter: contrast(1.4) grayscale(1) !important;
        }
        .a11y-underline-links a {
          text-decoration: underline !important;
          text-underline-offset: 3px !important;
        }
        .a11y-readable-font,
        .a11y-readable-font * {
          font-family: Arial, Helvetica, sans-serif !important;
          letter-spacing: 0.03em !important;
        }
      `}</style>

      {/* FAB Button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed",
          bottom: 20,
          left: 20,
          zIndex: 10000,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "#C9A84C",
          color: "#000",
          border: "none",
          cursor: "pointer",
          fontSize: 26,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 16px rgba(201,168,76,0.4)",
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
        aria-label="נגישות"
        title="נגישות"
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "scale(1.1)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "scale(1)";
        }}
      >
        ♿
      </button>

      {/* Panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 90,
            left: 20,
            zIndex: 10000,
            background: "#1a1a1a",
            border: "1px solid #C9A84C",
            borderRadius: 12,
            padding: 20,
            width: 300,
            color: "#fff",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            direction: "rtl",
            fontFamily: "inherit",
          }}
          dir="rtl"
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: "#C9A84C",
              }}
            >
              ♿ הגדרות נגישות
            </h3>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "none",
                border: "none",
                color: "#999",
                fontSize: 20,
                cursor: "pointer",
                padding: 0,
                lineHeight: 1,
              }}
              aria-label="סגור"
            >
              ✕
            </button>
          </div>

          {/* Font Size */}
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: 13,
                marginBottom: 6,
                color: "#ccc",
              }}
            >
              גודל פונט: {FONT_SIZES[settings.fontSize]}%
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={decreaseFontSize}
                disabled={settings.fontSize === 0}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 8,
                  border: "1px solid #444",
                  background: settings.fontSize > 0 ? "#333" : "#222",
                  color: settings.fontSize > 0 ? "#fff" : "#666",
                  cursor: settings.fontSize > 0 ? "pointer" : "not-allowed",
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                א-
              </button>
              <button
                onClick={increaseFontSize}
                disabled={settings.fontSize === 2}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 8,
                  border: "1px solid #444",
                  background: settings.fontSize < 2 ? "#333" : "#222",
                  color: settings.fontSize < 2 ? "#fff" : "#666",
                  cursor: settings.fontSize < 2 ? "pointer" : "not-allowed",
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                א+
              </button>
            </div>
          </div>

          {/* Toggle Buttons */}
          {[
            {
              key: "highContrast" as const,
              label: "ניגודיות גבוהה",
              active: settings.highContrast,
            },
            {
              key: "grayscale" as const,
              label: "גווני אפור",
              active: settings.grayscale,
            },
            {
              key: "underlineLinks" as const,
              label: "קו תחתון לקישורים",
              active: settings.underlineLinks,
            },
            {
              key: "readableFont" as const,
              label: "פונט קריא",
              active: settings.readableFont,
            },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => updateSetting(item.key, !item.active)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "10px 12px",
                marginBottom: 8,
                borderRadius: 8,
                border: item.active
                  ? "1px solid #C9A84C"
                  : "1px solid #333",
                background: item.active ? "rgba(201,168,76,0.15)" : "#222",
                color: item.active ? "#C9A84C" : "#ccc",
                cursor: "pointer",
                fontSize: 13,
                textAlign: "right",
                direction: "rtl",
              }}
            >
              <span>{item.label}</span>
              <span
                style={{
                  width: 36,
                  height: 20,
                  borderRadius: 10,
                  background: item.active ? "#C9A84C" : "#444",
                  position: "relative",
                  display: "inline-block",
                  transition: "background 0.2s",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#fff",
                    position: "absolute",
                    top: 2,
                    transition: "right 0.2s",
                    right: item.active ? 2 : 18,
                  }}
                />
              </span>
            </button>
          ))}

          {/* Reset */}
          {hasChanges && (
            <button
              onClick={resetAll}
              style={{
                width: "100%",
                padding: "10px 0",
                borderRadius: 8,
                border: "1px solid #555",
                background: "#333",
                color: "#fff",
                cursor: "pointer",
                fontSize: 13,
                marginTop: 4,
                marginBottom: 8,
              }}
            >
              איפוס הגדרות
            </button>
          )}

          {/* Accessibility Declaration Link */}
          <div style={{ marginTop: 8, textAlign: "center" }}>
            <a
              href="/accessibility"
              style={{
                color: "#C9A84C",
                fontSize: 12,
                textDecoration: "underline",
              }}
            >
              הצהרת נגישות
            </a>
          </div>
        </div>
      )}
    </>
  );
}
