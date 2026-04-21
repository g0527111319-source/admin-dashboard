"use client";

// ==========================================
// ViewerClient — public 3D viewer + pin threading
// ==========================================
// Wires together:
//   - ThreeDViewer (three.js canvas, loaded lazily)
//   - PinOverlay (HTML pins projected over the canvas)
//   - AnnotationDrawer (thread panel for the active pin)
//   - SWR polling every 10s on annotations so the client sees
//     the designer's reply land without refreshing
//
// Name persistence: we stash the client's self-entered name in
// localStorage so repeat visits to the same share link don't re-prompt.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import useSWR from "swr";
import PinOverlay, { type PinData } from "@/components/viewer/PinOverlay";
import AnnotationDrawer, {
  type AnnotationThread,
} from "@/components/viewer/AnnotationDrawer";
import type { ThreeDViewerHandle, Vec3 } from "@/components/viewer/ThreeDViewer";

// three.js is ~600KB — keep it off the initial bundle.
const ThreeDViewer = dynamic(() => import("@/components/viewer/ThreeDViewer"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#FAFAF8",
        fontFamily: "Heebo, sans-serif",
        color: "#8B6914",
      }}
    >
      טוען צופה תלת-מימד...
    </div>
  ),
});

type ModelResponse = {
  model: {
    id: string;
    title: string | null;
    gltfUrl: string | null;
    gltfSize: number | null;
    thumbnailUrl: string | null;
    conversionStatus: string;
    conversionError: string | null;
    expiresAt: string;
    createdAt: string;
    projectTitle: string | null;
    designer: {
      id: string;
      fullName: string;
      crmSettings: { logoUrl: string | null; companyName: string | null } | null;
    };
  };
};

type AnnotationsResponse = {
  annotations: AnnotationThread[];
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
};

const NAME_STORAGE_KEY = "zirat:3d:clientName";

export default function ViewerClient({ token }: { token: string }) {
  const viewerRef = useRef<ThreeDViewerHandle>(null);
  const [placementMode, setPlacementMode] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadPct, setLoadPct] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [frameTick, setFrameTick] = useState(0);
  const [clientName, setClientName] = useState("");
  const [pendingPin, setPendingPin] = useState<{ pos: Vec3; normal: Vec3 } | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Restore name from last visit
  useEffect(() => {
    try {
      const saved = localStorage.getItem(NAME_STORAGE_KEY);
      if (saved) setClientName(saved);
    } catch {
      /* private browsing — silently ignore */
    }
  }, []);

  useEffect(() => {
    if (!clientName) return;
    try {
      localStorage.setItem(NAME_STORAGE_KEY, clientName);
    } catch {
      /* noop */
    }
  }, [clientName]);

  // ── Model data (fetched once) ─────────────────────────────────────
  const { data: modelData, error: modelError } = useSWR<ModelResponse>(
    `/api/public/models/${token}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  // ── Annotations (polled every 10s) ────────────────────────────────
  const { data: annData, mutate: refreshAnnotations } = useSWR<AnnotationsResponse>(
    `/api/public/models/${token}/annotations`,
    fetcher,
    { refreshInterval: 10000 }
  );

  const annotations = annData?.annotations ?? [];

  // ── Map annotations into PinData for overlay ──────────────────────
  const pins: PinData[] = useMemo(
    () =>
      annotations.map((a, i) => ({
        id: a.id,
        pos: { x: (a as any).posX, y: (a as any).posY, z: (a as any).posZ },
        status: a.status,
        expiresAt: a.expiresAt,
        label: a.label,
        index: i + 1,
      })),
    [annotations]
  );

  const activeAnnotation = activeId
    ? annotations.find((a) => a.id === activeId) ?? null
    : null;

  // ── Raf-driven tick for overlay reposition ────────────────────────
  // We throttle to every ~2 frames to save CPU on mobile — pins don't need
  // 60fps precision to look smooth to the eye.
  const frameCounterRef = useRef(0);
  const onViewerFrame = useCallback(() => {
    frameCounterRef.current++;
    if (frameCounterRef.current % 2 === 0) {
      setFrameTick((t) => (t + 1) % 1_000_000);
    }
  }, []);

  // ── Pin placement flow ────────────────────────────────────────────
  const onPinPlace = useCallback((pos: Vec3, normal: Vec3) => {
    setPendingPin({ pos, normal });
    setPlacementMode(false);
  }, []);

  async function submitPendingPin() {
    if (!pendingPin) return;
    if (!clientName.trim()) {
      alert("נא להזין שם לפני שליחה");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/models/${token}/annotations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          posX: pendingPin.pos.x,
          posY: pendingPin.pos.y,
          posZ: pendingPin.pos.z,
          normX: pendingPin.normal.x,
          normY: pendingPin.normal.y,
          normZ: pendingPin.normal.z,
          question: pendingQuestion,
          clientName: clientName.trim(),
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const body = await res.json();
      setPendingPin(null);
      setPendingQuestion("");
      await refreshAnnotations();
      setActiveId(body.annotation?.id ?? null);
    } catch (e) {
      alert("שגיאה בשליחה: " + (e instanceof Error ? e.message : "unknown"));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Reply from client into existing thread ────────────────────────
  async function submitReply(body: string) {
    if (!activeAnnotation) return;
    const res = await fetch(
      `/api/public/annotations/${activeAnnotation.id}/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, authorName: clientName.trim() }),
      }
    );
    if (!res.ok) throw new Error("שגיאה בתגובה");
    await refreshAnnotations();
  }

  // ── Render: various error/loading states ──────────────────────────
  if (modelError) {
    return (
      <div style={fullCentered}>
        <div style={{ textAlign: "center", color: "#1A1A1A" }}>
          <h1 style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: 28 }}>
            מודל לא נמצא
          </h1>
          <p style={{ color: "#8B6914" }}>הקישור לא תקף או פג תוקף.</p>
        </div>
      </div>
    );
  }

  if (!modelData) {
    return (
      <div style={fullCentered}>
        <div style={{ color: "#8B6914", fontFamily: "Heebo, sans-serif" }}>
          טוען...
        </div>
      </div>
    );
  }

  const { model } = modelData;

  if (model.conversionStatus === "pending" || model.conversionStatus === "processing") {
    return (
      <div style={fullCentered}>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 44,
              height: 44,
              border: "3px solid #E5E1D4",
              borderTopColor: "#C9A84C",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <h1 style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: 24 }}>
            המודל בעיבוד
          </h1>
          <p style={{ color: "#8B6914", fontFamily: "Heebo, sans-serif" }}>
            רוענ/י את הדף בעוד דקה-שתיים
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (model.conversionStatus === "failed" || !model.gltfUrl) {
    return (
      <div style={fullCentered}>
        <div style={{ textAlign: "center", color: "#B00020" }}>
          <h1 style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: 24 }}>
            שגיאה בעיבוד המודל
          </h1>
          <p style={{ color: "#8B6914" }}>
            {model.conversionError || "נא לפנות למעצבת"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      style={{
        position: "fixed",
        inset: 0,
        background: "#FAFAF8",
        overflow: "hidden",
        fontFamily: "Heebo, system-ui, sans-serif",
      }}
    >
      {/* Header bar */}
      <header
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "12px 20px",
          background: "rgba(250, 250, 248, 0.92)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid #E5E1D4",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          zIndex: 40,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Frank Ruhl Libre', serif",
              fontSize: 18,
              color: "#1A1A1A",
            }}
          >
            {model.projectTitle || model.title || "פרויקט"}
          </div>
          <div style={{ fontSize: 12, color: "#8B6914" }}>
            {model.designer.fullName}
          </div>
        </div>

        <button
          onClick={() => {
            if (!loaded) return;
            if (!clientName.trim()) {
              const name = prompt("השם שלך:");
              if (!name?.trim()) return;
              setClientName(name.trim());
            }
            setPlacementMode((v) => !v);
            setActiveId(null);
          }}
          disabled={!loaded}
          style={{
            padding: "10px 20px",
            background: placementMode ? "#1A1A1A" : "#C9A84C",
            color: placementMode ? "#FAFAF8" : "#1A1A1A",
            border: "none",
            borderRadius: 24,
            fontFamily: "Rubik, sans-serif",
            fontSize: 14,
            fontWeight: 500,
            cursor: loaded ? "pointer" : "not-allowed",
            opacity: loaded ? 1 : 0.5,
          }}
        >
          {placementMode ? "ביטול" : "+ הוסף הערה"}
        </button>
      </header>

      {/* Canvas */}
      <div style={{ position: "absolute", inset: 0, top: 60 }}>
        <ThreeDViewer
          ref={viewerRef}
          gltfUrl={model.gltfUrl}
          placementMode={placementMode}
          onPinPlace={onPinPlace}
          onLoadProgress={setLoadPct}
          onLoadComplete={() => {
            setLoaded(true);
            setLoadPct(100);
            // Fire-and-forget thumbnail upload, only if the server doesn't
            // already have one. We wait a tick after loadComplete so the
            // auto-fit framing finishes before the capture — otherwise the
            // first-frame shot is often of the model mid-zoom.
            if (!model.thumbnailUrl) {
              setTimeout(() => {
                (async () => {
                  try {
                    const blob = await viewerRef.current?.captureThumbnail(512, 0.75);
                    if (!blob) return;
                    await fetch(`/api/public/models/${token}/thumbnail`, {
                      method: "POST",
                      headers: { "Content-Type": blob.type || "image/jpeg" },
                      body: blob,
                    });
                  } catch (err) {
                    // Thumbnail capture is best-effort; never block the UI.
                    console.debug("[viewer] thumbnail capture failed:", err);
                  }
                })();
              }, 600);
            }
          }}
          onLoadError={setLoadError}
          onFrame={onViewerFrame}
        />

        {/* Loading overlay */}
        {!loaded && !loadError && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(250, 250, 248, 0.85)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 200,
                height: 3,
                background: "#E5E1D4",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.round(loadPct)}%`,
                  height: "100%",
                  background: "#C9A84C",
                  transition: "width 200ms linear",
                }}
              />
            </div>
            <div style={{ color: "#8B6914", fontSize: 13 }}>
              טוען מודל... {Math.round(loadPct)}%
            </div>
          </div>
        )}

        {loadError && (
          <div style={fullCentered}>
            <div style={{ color: "#B00020", textAlign: "center" }}>
              <div>שגיאה בטעינה</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>{loadError}</div>
            </div>
          </div>
        )}

        {/* Pins overlay */}
        {loaded && (
          <PinOverlay
            viewerRef={viewerRef}
            pins={pins}
            activeId={activeId}
            onPinClick={(id) => {
              setActiveId(id);
              setPlacementMode(false);
            }}
            refreshTick={frameTick}
          />
        )}
      </div>

      {/* Placement helper banner */}
      {placementMode && !pendingPin && (
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1A1A1A",
            color: "#FAFAF8",
            padding: "10px 20px",
            borderRadius: 24,
            fontSize: 14,
            zIndex: 45,
          }}
        >
          לחצ/י על המודל כדי להניח סיכה
        </div>
      )}

      {/* Pending-pin dialog */}
      {pendingPin && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(26, 26, 26, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#FAFAF8",
              borderRadius: 16,
              padding: 24,
              maxWidth: 440,
              width: "100%",
              boxShadow: "0 16px 48px rgba(0,0,0,0.25)",
            }}
          >
            <h2
              style={{
                fontFamily: "'Frank Ruhl Libre', serif",
                fontSize: 22,
                margin: "0 0 4px",
                color: "#8B6914",
              }}
            >
              הערה חדשה
            </h2>
            <p style={{ fontSize: 13, color: "#8B6914", margin: "0 0 14px" }}>
              ⏱ נמחק אוטומטית אחרי 24 שעות אם לא נענה
            </p>

            <label style={labelStyle}>שם</label>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              maxLength={80}
              style={inputStyle}
            />

            <label style={{ ...labelStyle, marginTop: 12 }}>השאלה / הערה</label>
            <textarea
              value={pendingQuestion}
              onChange={(e) => setPendingQuestion(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="למשל: מה הצבע של הקיר הזה?"
              style={{ ...inputStyle, resize: "vertical" }}
              autoFocus
            />

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                onClick={() => {
                  setPendingPin(null);
                  setPendingQuestion("");
                }}
                style={btnSecondary}
              >
                ביטול
              </button>
              <button
                onClick={submitPendingPin}
                disabled={submitting || !clientName.trim() || !pendingQuestion.trim()}
                style={{
                  ...btnPrimary,
                  opacity:
                    submitting || !clientName.trim() || !pendingQuestion.trim()
                      ? 0.5
                      : 1,
                }}
              >
                {submitting ? "שולח..." : "שלח"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thread drawer */}
      <AnnotationDrawer
        annotation={activeAnnotation}
        viewerRole="client"
        onClose={() => setActiveId(null)}
        onReply={submitReply}
        clientName={clientName}
        onClientNameChange={setClientName}
      />
    </div>
  );
}

// ── shared inline styles (keep the file self-contained) ─────────────
const fullCentered: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#FAFAF8",
  fontFamily: "Heebo, system-ui, sans-serif",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "Rubik, sans-serif",
  fontSize: 12,
  color: "#8B6914",
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #E5E1D4",
  borderRadius: 8,
  background: "#FAFAF8",
  fontFamily: "Heebo, sans-serif",
  fontSize: 14,
  boxSizing: "border-box",
};

const btnPrimary: React.CSSProperties = {
  flex: 1,
  padding: "10px",
  background: "#C9A84C",
  color: "#1A1A1A",
  border: "none",
  borderRadius: 8,
  fontFamily: "Rubik, sans-serif",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
};

const btnSecondary: React.CSSProperties = {
  flex: 1,
  padding: "10px",
  background: "transparent",
  color: "#1A1A1A",
  border: "1px solid #E5E1D4",
  borderRadius: 8,
  fontFamily: "Rubik, sans-serif",
  fontSize: 14,
  cursor: "pointer",
};
