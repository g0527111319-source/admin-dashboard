"use client";

// ==========================================
// Designer — single model annotations viewer
// /designer/[id]/models/[modelId]/annotations
// ==========================================
// Displays the model with every live annotation drawn in-world. The
// designer can click a question in the sidebar → the camera flies to it
// and the right-hand drawer opens with the thread so she can reply,
// mark it resolved/pinned, or delete it.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  Loader2,
  MessageCircle,
  AlertCircle,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import type {
  ThreeDViewerHandle,
  AnnotationPrimitive,
} from "@/components/viewer/ThreeDViewer";
import PinOverlay, { type PinData } from "@/components/viewer/PinOverlay";
import AnnotationDrawer, {
  type AnnotationThread,
} from "@/components/viewer/AnnotationDrawer";

const ThreeDViewer = dynamic(() => import("@/components/viewer/ThreeDViewer"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#FAFAF8] text-[#8B6914]">
      טוען צופה תלת-מימד...
    </div>
  ),
});

type Model = {
  id: string;
  title: string | null;
  projectId: string;
  originalFormat: string;
  conversionStatus: string;
  conversionError: string | null;
  gltfUrl: string | null;
  expiresAt: string;
};

type AnnotationFull = AnnotationThread &
  AnnotationPrimitive & {
    question: string | null;
  };

function statusHebrew(s: AnnotationThread["status"]): string {
  if (s === "OPEN") return "פתוח";
  if (s === "ANSWERED") return "נענה";
  if (s === "RESOLVED") return "נפתר";
  return "קבוע";
}

function shapeHebrew(s: AnnotationPrimitive["shape"]): string {
  if (s === "POINT") return "נקודה";
  if (s === "LINE") return "קו";
  if (s === "RECTANGLE") return "ריבוע";
  return "עיגול";
}

export default function DesignerModelAnnotationsPage() {
  const params = useParams<{ id: string; modelId: string }>();
  const designerId = params?.id;
  const modelId = params?.modelId;

  const viewerRef = useRef<ThreeDViewerHandle>(null);
  const [model, setModel] = useState<Model | null>(null);
  const [annotations, setAnnotations] = useState<AnnotationFull[]>([]);
  const [loadError, setLoadError] = useState("");
  const [modelLoaded, setModelLoaded] = useState(false);
  const [frameTick, setFrameTick] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  // When false we hide the in-world outlines + HTML pins so the designer
  // can take a clean screenshot of the model without comment markers.
  const [annotationsVisible, setAnnotationsVisible] = useState(true);
  // Mobile sidebar toggle — md+ always shows inline.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!modelId) return;
    try {
      const [modelRes, annRes] = await Promise.all([
        fetch(`/api/designer/crm/models/${modelId}`, { cache: "no-store" }),
        fetch(`/api/designer/crm/annotations?modelId=${modelId}`, {
          cache: "no-store",
        }),
      ]);

      if (!modelRes.ok) {
        const body = await modelRes.json().catch(() => ({}));
        throw new Error(body.error || "שגיאה בטעינת המודל");
      }
      if (!annRes.ok) {
        const body = await annRes.json().catch(() => ({}));
        throw new Error(body.error || "שגיאה בטעינת ההערות");
      }

      const modelBody = await modelRes.json();
      const annBody = await annRes.json();
      setModel(modelBody.model);
      setAnnotations(annBody.annotations ?? []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "שגיאה");
    }
  }, [modelId]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15_000);
    return () => clearInterval(id);
  }, [refresh]);

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

  const activeAnnotation =
    activeId ? annotations.find((a) => a.id === activeId) ?? null : null;

  const frameCounter = useRef(0);
  const onViewerFrame = useCallback(() => {
    frameCounter.current++;
    if (frameCounter.current % 2 === 0) {
      setFrameTick((t) => (t + 1) % 1_000_000);
    }
  }, []);

  function selectAnnotation(id: string) {
    setActiveId(id);
    const a = annotations.find((x) => x.id === id);
    if (a) viewerRef.current?.focusOnAnnotation(a);
  }

  async function submitReply(body: string) {
    if (!activeAnnotation) return;
    const res = await fetch(
      `/api/designer/crm/annotations/${activeAnnotation.id}/reply`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      }
    );
    if (!res.ok) throw new Error("שגיאה בתגובה");
    await refresh();
  }

  async function onStatusChange(status: AnnotationThread["status"]) {
    if (!activeAnnotation) return;
    const res = await fetch(
      `/api/designer/crm/annotations/${activeAnnotation.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }
    );
    if (!res.ok) throw new Error("שגיאה בעדכון סטטוס");
    await refresh();
  }

  async function onDeleteAnnotation() {
    if (!activeAnnotation) return;
    if (!confirm("למחוק את ההערה לצמיתות?")) return;
    const res = await fetch(
      `/api/designer/crm/annotations/${activeAnnotation.id}`,
      { method: "DELETE" }
    );
    if (!res.ok) return;
    setActiveId(null);
    await refresh();
  }

  // ── Render ─────────────────────────────────────────────────────────

  if (loadError) {
    return (
      <FullMessage title="שגיאה" detail={loadError} designerId={designerId} />
    );
  }
  if (!model) {
    return (
      <FullMessage title="טוען..." designerId={designerId}>
        <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#8B6914]" />
      </FullMessage>
    );
  }
  if (
    model.conversionStatus === "pending" ||
    model.conversionStatus === "processing"
  ) {
    return (
      <FullMessage
        title="המודל בעיבוד"
        detail="נסי שוב בעוד דקה"
        designerId={designerId}
      />
    );
  }
  if (model.conversionStatus === "failed" || !model.gltfUrl) {
    return (
      <FullMessage
        title="שגיאה בעיבוד המודל"
        detail={model.conversionError || "נסי להעלות מחדש"}
        designerId={designerId}
      />
    );
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-0 bg-[#FAFAF8] overflow-hidden"
      style={{ fontFamily: "Heebo, system-ui, sans-serif" }}
    >
      <header className="absolute top-0 inset-x-0 z-40 px-5 py-3 border-b border-[#E5E1D4] bg-[rgba(250,250,248,0.92)] backdrop-blur flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1
            className="text-lg text-[#1A1A1A] truncate"
            style={{ fontFamily: "'Frank Ruhl Libre', serif" }}
          >
            {model.title || "מודל"} — תצוגת הערות
          </h1>
          <p className="text-xs text-[#8B6914]">
            {annotations.length} הערות פעילות
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setAnnotationsVisible((v) => !v)}
            aria-pressed={!annotationsVisible}
            aria-label={annotationsVisible ? "הסתר הערות" : "הצג הערות"}
            className={
              "flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition " +
              (annotationsVisible
                ? "border-[#E5E1D4] text-[#8B6914] hover:bg-[#F5F1E8]"
                : "border-[#1A1A1A] bg-[#1A1A1A] text-white")
            }
            title={annotationsVisible ? "הסתר הערות" : "הצג הערות"}
          >
            {annotationsVisible ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {annotationsVisible ? "הסתר" : "הצג"}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="md:hidden flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-[#E5E1D4] text-[#8B6914] hover:bg-[#F5F1E8]"
            aria-label={`הערות (${annotations.length})`}
          >
            <MessageCircle className="w-4 h-4" />
            {annotations.length}
          </button>
          <Link
            href={`/designer/${designerId}/models`}
            className="text-sm text-[#8B6914] hover:text-[#1A1A1A] flex items-center gap-1"
          >
            <ArrowRight className="w-4 h-4" />
            <span className="hidden sm:inline">חזרה לניהול מודלים</span>
          </Link>
        </div>
      </header>

      <div className="absolute inset-0 pt-14 pb-0 md:left-80">
        <ThreeDViewer
          ref={viewerRef}
          gltfUrl={model.gltfUrl}
          placementMode={false}
          annotations={
            annotationsVisible
              ? annotations.map((a) => ({
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
                }))
              : []
          }
          highlightedId={annotationsVisible ? activeId : null}
          onLoadComplete={() => setModelLoaded(true)}
          onFrame={onViewerFrame}
        />
        {modelLoaded && annotationsVisible && (
          <PinOverlay
            viewerRef={viewerRef}
            pins={pins}
            activeId={activeId}
            onPinClick={selectAnnotation}
            refreshTick={frameTick}
          />
        )}
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <aside
          dir="rtl"
          className="md:hidden absolute top-14 bottom-0 right-0 w-[min(340px,88vw)] bg-white border-l border-[#E5E1D4] z-40 overflow-auto p-4 shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <h2
              className="text-base text-[#1A1A1A] flex items-center gap-1"
              style={{ fontFamily: "'Frank Ruhl Libre', serif" }}
            >
              <MessageCircle className="w-4 h-4 text-[#8B6914]" />
              הערות ({annotations.length})
            </h2>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="סגור"
              className="p-1 text-[#8B6914] hover:text-[#1A1A1A]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {annotations.length === 0 ? (
            <div className="text-sm text-[#8B6914] opacity-75 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>הלקוח/ה עדיין לא סימנ/ה שאלות על המודל הזה.</span>
            </div>
          ) : (
            <ul className="space-y-2">
              {annotations.map((a, i) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => {
                      selectAnnotation(a.id);
                      setSidebarOpen(false);
                    }}
                    className={
                      "w-full text-right p-3 rounded-lg border transition " +
                      (activeId === a.id
                        ? "bg-[#F5F1E8] border-[#C9A84C]"
                        : "bg-white border-[#E5E1D4] hover:bg-[#FAFAF8]")
                    }
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#8B6914]">
                        #{i + 1} · {shapeHebrew(a.shape)}
                      </span>
                      <span
                        className={
                          "text-[10px] px-2 py-0.5 rounded-full " +
                          (a.status === "OPEN"
                            ? "bg-amber-100 text-amber-800"
                            : a.status === "ANSWERED"
                            ? "bg-blue-100 text-blue-800"
                            : a.status === "PINNED"
                            ? "bg-[#1A1A1A] text-white"
                            : "bg-green-100 text-green-800")
                        }
                      >
                        {statusHebrew(a.status)}
                      </span>
                    </div>
                    <p className="text-sm text-[#1A1A1A] line-clamp-3 leading-snug">
                      {a.question || a.label || "ללא טקסט"}
                    </p>
                    <p className="text-[10px] text-[#8B6914] mt-1">
                      מאת {a.createdByType === "client" ? "הלקוח" : "את"}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      )}

      {/* Desktop sidebar — list of all annotations on this model */}
      <aside className="absolute top-14 bottom-0 right-0 w-80 max-w-full bg-white border-l border-[#E5E1D4] p-4 overflow-auto hidden md:block">
        <h2
          className="text-base text-[#1A1A1A] mb-3 flex items-center gap-1"
          style={{ fontFamily: "'Frank Ruhl Libre', serif" }}
        >
          <MessageCircle className="w-4 h-4 text-[#8B6914]" />
          הערות של הלקוח
        </h2>
        {annotations.length === 0 ? (
          <div className="text-sm text-[#8B6914] opacity-75 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>הלקוח/ה עדיין לא סימנ/ה שאלות על המודל הזה.</span>
          </div>
        ) : (
          <ul className="space-y-2">
            {annotations.map((a, i) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => selectAnnotation(a.id)}
                  className={
                    "w-full text-right p-3 rounded-lg border transition " +
                    (activeId === a.id
                      ? "bg-[#F5F1E8] border-[#C9A84C]"
                      : "bg-white border-[#E5E1D4] hover:bg-[#FAFAF8]")
                  }
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#8B6914]">
                      #{i + 1} · {shapeHebrew(a.shape)}
                    </span>
                    <span
                      className={
                        "text-[10px] px-2 py-0.5 rounded-full " +
                        (a.status === "OPEN"
                          ? "bg-amber-100 text-amber-800"
                          : a.status === "ANSWERED"
                          ? "bg-blue-100 text-blue-800"
                          : a.status === "PINNED"
                          ? "bg-[#1A1A1A] text-white"
                          : "bg-green-100 text-green-800")
                      }
                    >
                      {statusHebrew(a.status)}
                    </span>
                  </div>
                  <p className="text-sm text-[#1A1A1A] line-clamp-3 leading-snug">
                    {a.question || a.label || "ללא טקסט"}
                  </p>
                  <p className="text-[10px] text-[#8B6914] mt-1">
                    מאת {a.createdByType === "client" ? "הלקוח" : "את"}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {activeAnnotation && (
        <AnnotationDrawer
          annotation={activeAnnotation}
          viewerRole="designer"
          onClose={() => setActiveId(null)}
          onReply={submitReply}
          onStatusChange={onStatusChange}
          onDelete={onDeleteAnnotation}
        />
      )}
    </div>
  );
}

function FullMessage({
  title,
  detail,
  designerId,
  children,
}: {
  title: string;
  detail?: string;
  designerId?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      dir="rtl"
      className="fixed inset-0 bg-[#FAFAF8] flex flex-col items-center justify-center px-5 text-center"
      style={{ fontFamily: "Heebo, system-ui, sans-serif" }}
    >
      <h1
        className="text-2xl text-[#1A1A1A] mb-2"
        style={{ fontFamily: "'Frank Ruhl Libre', serif" }}
      >
        {title}
      </h1>
      {detail && <p className="text-[#8B6914] text-sm">{detail}</p>}
      {children}
      {designerId && (
        <Link
          href={`/designer/${designerId}/models`}
          className="mt-6 text-sm text-[#8B6914] underline"
        >
          חזרה לניהול מודלים
        </Link>
      )}
    </div>
  );
}
