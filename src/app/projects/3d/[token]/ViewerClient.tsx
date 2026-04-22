"use client";

// ==========================================
// ViewerClient — public 3D viewer + shape threading
// ==========================================
// Wires together:
//   - ThreeDViewer (three.js canvas, loaded lazily)
//   - PinOverlay (HTML pins projected over the canvas for POINT shapes)
//   - AnnotationDrawer (thread panel for the active annotation)
//   - Shape toolbar (POINT / LINE / RECTANGLE / CIRCLE)
//   - SWR polling every 10s on annotations so the client sees the
//     designer's reply land without refreshing
//
// Name persistence: we stash the client's self-entered name in
// localStorage so repeat visits to the same share link don't re-prompt.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import useSWR from "swr";
import {
  MousePointer2,
  Minus,
  Square,
  Circle as CircleIcon,
  Send,
  X,
  Loader2,
  MessageCircle,
} from "lucide-react";
import PinOverlay, { type PinData } from "@/components/viewer/PinOverlay";
import AnnotationDrawer, {
  type AnnotationThread,
} from "@/components/viewer/AnnotationDrawer";
import type {
  ThreeDViewerHandle,
  ShapeName,
  ShapePlaceResult,
  AnnotationPrimitive,
} from "@/components/viewer/ThreeDViewer";

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

type AnnotationFull = AnnotationThread & AnnotationPrimitive;

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
  annotations: AnnotationFull[];
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
};

const NAME_STORAGE_KEY = "zirat:3d:clientName";

const SHAPE_TOOLS: Array<{
  shape: ShapeName;
  label: string;
  hint: string;
  Icon: typeof MousePointer2;
}> = [
  { shape: "POINT", label: "נקודה", hint: "לחיצה אחת", Icon: MousePointer2 },
  { shape: "LINE", label: "קו", hint: "שתי לחיצות", Icon: Minus },
  { shape: "RECTANGLE", label: "ריבוע", hint: "שתי פינות", Icon: Square },
  { shape: "CIRCLE", label: "עיגול", hint: "מרכז + שוליים", Icon: CircleIcon },
];

function shapeHebrew(s: ShapeName): string {
  if (s === "POINT") return "נקודה";
  if (s === "LINE") return "קו";
  if (s === "RECTANGLE") return "ריבוע";
  return "עיגול";
}

function statusHebrew(s: AnnotationThread["status"]): string {
  if (s === "OPEN") return "פתוח";
  if (s === "ANSWERED") return "נענה";
  if (s === "RESOLVED") return "נפתר";
  return "קבוע";
}

export default function ViewerClient({ token }: { token: string }) {
  const viewerRef = useRef<ThreeDViewerHandle>(null);
  const [shape, setShape] = useState<ShapeName>("POINT");
  const [placementMode, setPlacementMode] = useState(false);
  const [partialStage, setPartialStage] = useState<"idle" | "first">("idle");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadPct, setLoadPct] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [frameTick, setFrameTick] = useState(0);
  const [clientName, setClientName] = useState("");
  const [pending, setPending] = useState<ShapePlaceResult | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const annotations = useMemo(() => annData?.annotations ?? [], [annData]);

  // Only POINT shapes get HTML pin overlays. LINE/RECT/CIRCLE are rendered
  // in-world by the viewer itself.
  const pins: PinData[] = useMemo(
    () =>
      annotations
        .filter((a) => a.shape === "POINT")
        .map((a, i) => ({
          id: a.id,
          pos: { x: a.posX, y: a.posY, z: a.posZ },
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

  // ── Shape placement flow ──────────────────────────────────────────
  const onShapePlace = useCallback((result: ShapePlaceResult) => {
    setPending(result);
    setPartialStage("idle");
    setPlacementMode(false);
  }, []);

  const onPartialPlace = useCallback((stage: "first" | "cleared") => {
    setPartialStage(stage === "first" ? "first" : "idle");
  }, []);

  function startPlacement(nextShape: ShapeName) {
    // Require a name up front so the drawer later can attribute replies.
    if (!clientName.trim()) {
      const name = prompt("השם שלך:");
      if (!name?.trim()) return;
      setClientName(name.trim());
    }
    setShape(nextShape);
    setPlacementMode(true);
    setActiveId(null);
    setPending(null);
    setPartialStage("idle");
  }

  async function submitPending() {
    if (!pending) return;
    if (!clientName.trim()) {
      alert("נא להזין שם לפני שליחה");
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        shape: pending.shape,
        posX: pending.pos.x,
        posY: pending.pos.y,
        posZ: pending.pos.z,
        normX: pending.normal.x,
        normY: pending.normal.y,
        normZ: pending.normal.z,
        question: pendingQuestion,
        clientName: clientName.trim(),
      };
      if (pending.pos2) {
        body.pos2X = pending.pos2.x;
        body.pos2Y = pending.pos2.y;
        body.pos2Z = pending.pos2.z;
      }
      if (pending.norm2) {
        body.norm2X = pending.norm2.x;
        body.norm2Y = pending.norm2.y;
        body.norm2Z = pending.norm2.z;
      }
      if (pending.radius) body.radius = pending.radius;

      const res = await fetch(`/api/public/models/${token}/annotations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "שגיאה בשליחה");
      }
      const resp = await res.json();
      setPending(null);
      setPendingQuestion("");
      await refreshAnnotations();
      setActiveId(resp.annotation?.id ?? null);
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

  function selectAnnotation(id: string) {
    setActiveId(id);
    const a = annotations.find((x) => x.id === id);
    if (a) viewerRef.current?.focusOnAnnotation(a);
    setSidebarOpen(false);
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
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "'Frank Ruhl Libre', serif",
              fontSize: 18,
              color: "#1A1A1A",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {model.projectTitle || model.title || "פרויקט"}
          </div>
          <div style={{ fontSize: 12, color: "#8B6914" }}>
            {model.designer.fullName}
          </div>
        </div>

        {/* "My annotations" button — always available, toggles sidebar */}
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label={`הערות (${annotations.length})`}
          style={{
            position: "relative",
            padding: "8px 14px",
            background: sidebarOpen ? "#1A1A1A" : "transparent",
            color: sidebarOpen ? "#FAFAF8" : "#8B6914",
            border: "1px solid " + (sidebarOpen ? "#1A1A1A" : "#E5E1D4"),
            borderRadius: 999,
            fontFamily: "Rubik, sans-serif",
            fontSize: 13,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <MessageCircle size={16} />
          הערות
          {annotations.length > 0 && (
            <span
              style={{
                background: "#C9A84C",
                color: "#1A1A1A",
                borderRadius: 999,
                padding: "0 6px",
                fontSize: 11,
                fontWeight: 600,
                minWidth: 20,
                textAlign: "center",
              }}
            >
              {annotations.length}
            </span>
          )}
        </button>
      </header>

      {/* Shape toolbar — vertical, right-pinned under header */}
      <div
        role="group"
        aria-label="כלי סימון"
        style={{
          position: "absolute",
          top: 72,
          right: 12,
          zIndex: 40,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(8px)",
          border: "1px solid #E5E1D4",
          borderRadius: 12,
          padding: 6,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {SHAPE_TOOLS.map((tool) => {
          const active = placementMode && shape === tool.shape;
          return (
            <button
              key={tool.shape}
              type="button"
              onClick={() => startPlacement(tool.shape)}
              disabled={!loaded}
              aria-pressed={active}
              aria-label={`${tool.label} · ${tool.hint}`}
              title={`${tool.label} · ${tool.hint}`}
              style={{
                width: 40,
                height: 40,
                border: "none",
                borderRadius: 8,
                background: active ? "#C9A84C" : "transparent",
                color: active ? "#FAFAF8" : "#8B6914",
                cursor: loaded ? "pointer" : "not-allowed",
                opacity: loaded ? 1 : 0.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <tool.Icon size={18} />
            </button>
          );
        })}
        {placementMode && (
          <button
            type="button"
            onClick={() => {
              setPlacementMode(false);
              setPartialStage("idle");
            }}
            aria-label="ביטול סימון"
            title="ביטול"
            style={{
              width: 40,
              height: 40,
              border: "none",
              borderRadius: 8,
              background: "transparent",
              color: "#B00020",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Placement hint */}
      {placementMode && (
        <div
          style={{
            position: "absolute",
            top: 72,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 40,
            background: "#1A1A1A",
            color: "#FAFAF8",
            padding: "6px 14px",
            borderRadius: 999,
            fontSize: 12,
            maxWidth: "calc(100vw - 140px)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {shape === "POINT" && "לחצ/י על המודל לסימון נקודה"}
          {(shape === "LINE" || shape === "RECTANGLE") &&
            (partialStage === "first"
              ? "לחצ/י שוב לקבלת הנקודה השנייה"
              : shape === "LINE"
              ? "לחצ/י על נקודת התחלה"
              : "לחצ/י על פינה ראשונה")}
          {shape === "CIRCLE" &&
            (partialStage === "first"
              ? "לחצ/י על שולי העיגול"
              : "לחצ/י על מרכז העיגול")}
        </div>
      )}

      {/* Canvas */}
      <div style={{ position: "absolute", inset: 0, top: 60 }}>
        <ThreeDViewer
          ref={viewerRef}
          gltfUrl={model.gltfUrl}
          shape={shape}
          placementMode={placementMode}
          onShapePlace={onShapePlace}
          onPartialPlace={onPartialPlace}
          annotations={annotations.map((a) => ({
            id: a.id,
            shape: a.shape,
            posX: a.posX,
            posY: a.posY,
            posZ: a.posZ,
            normX: a.normX,
            normY: a.normY,
            normZ: a.normZ,
            pos2X: a.pos2X,
            pos2Y: a.pos2Y,
            pos2Z: a.pos2Z,
            radius: a.radius,
          }))}
          highlightedId={activeId}
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

        {/* Pin overlay (only for POINT annotations) */}
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

      {/* Annotations sidebar — slides in from left, always reachable */}
      {sidebarOpen && (
        <aside
          dir="rtl"
          style={{
            position: "absolute",
            top: 60,
            bottom: 0,
            left: 0,
            width: "min(340px, 90vw)",
            background: "#FFFFFF",
            borderLeft: "1px solid #E5E1D4",
            boxShadow: "2px 0 12px rgba(0,0,0,0.08)",
            zIndex: 45,
            overflowY: "auto",
            padding: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <h2
              style={{
                fontFamily: "'Frank Ruhl Libre', serif",
                fontSize: 16,
                color: "#1A1A1A",
                margin: 0,
              }}
            >
              הערות על המודל ({annotations.length})
            </h2>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="סגור"
              style={{
                background: "transparent",
                border: "none",
                color: "#8B6914",
                cursor: "pointer",
                padding: 4,
              }}
            >
              <X size={18} />
            </button>
          </div>
          {annotations.length === 0 ? (
            <p style={{ fontSize: 13, color: "#8B6914", opacity: 0.75 }}>
              עדיין לא נוספו הערות. לחצ/י על אחד מכלי הסימון כדי להתחיל.
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {annotations.map((a, i) => (
                <li key={a.id} style={{ marginBottom: 8 }}>
                  <button
                    type="button"
                    onClick={() => selectAnnotation(a.id)}
                    style={{
                      width: "100%",
                      textAlign: "right",
                      padding: 10,
                      borderRadius: 8,
                      border:
                        "1px solid " +
                        (activeId === a.id ? "#C9A84C" : "#E5E1D4"),
                      background: activeId === a.id ? "#F5F1E8" : "#FFFFFF",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontSize: 11, color: "#8B6914" }}>
                        #{i + 1} · {shapeHebrew(a.shape)}
                      </span>
                      <span style={{ fontSize: 10, color: "#8B6914" }}>
                        {statusHebrew(a.status)}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 13,
                        color: "#1A1A1A",
                        margin: 0,
                        lineHeight: 1.4,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {a.question || a.label || "ללא טקסט"}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      )}

      {/* Pending-annotation composer */}
      {pending && (
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
              {shapeHebrew(pending.shape)} חדש
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
                  setPending(null);
                  setPendingQuestion("");
                }}
                style={btnSecondary}
              >
                ביטול
              </button>
              <button
                onClick={submitPending}
                disabled={submitting || !clientName.trim() || !pendingQuestion.trim()}
                style={{
                  ...btnPrimary,
                  opacity:
                    submitting || !clientName.trim() || !pendingQuestion.trim()
                      ? 0.5
                      : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
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
