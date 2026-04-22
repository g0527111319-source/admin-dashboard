"use client";

// ==========================================
// Designer 3D models management page
// /designer/[id]/models
// ==========================================
// Lets a designer:
//   - Pick one of her portfolio projects
//   - Upload a 3D file (GLB/glTF/IFC/OBJ/FBX/DAE up to 500MB)
//   - See conversion status for each model
//   - Copy the public share link (or remove the model)
//   - Jump into the annotations inbox for a model
//
// The upload flow: presign → PUT to R2 → POST to /models with the key.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, MessageCircle } from "lucide-react";

type Project = { id: string; title: string };
type Model = {
  id: string;
  title: string | null;
  originalFormat: string;
  originalSize: number;
  gltfUrl: string | null;
  thumbnailUrl: string | null;
  conversionStatus: string;
  conversionError: string | null;
  shareToken: string;
  expiresAt: string;
  createdAt: string;
  _count?: { annotations: number };
};

// A stripped-down annotation shape for the global sidebar. The full shape
// lives in the dedicated annotations page; here we only need enough to
// render a one-line preview and a deep-link to the viewer.
type GlobalAnnotation = {
  id: string;
  label: string | null;
  question: string | null;
  status: "OPEN" | "ANSWERED" | "RESOLVED" | "PINNED";
  createdAt: string;
  expiresAt: string;
  createdByType: "client" | "designer";
  model: {
    id: string;
    title: string | null;
    projectId: string;
    project: { id: string; title: string };
    crmClient: { id: string; name: string } | null;
    crmProject: { id: string; name: string } | null;
  };
};

const STATUS_LABEL: Record<string, string> = {
  pending: "בתור להמרה",
  processing: "בהמרה...",
  ready: "מוכן",
  failed: "שגיאה",
};

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function daysLeft(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

export default function DesignerModelsPage() {
  const params = useParams<{ id: string }>();
  const designerId = params?.id;

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [models, setModels] = useState<Model[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Global annotations inbox — every live pin across every model the
  // designer owns. Fetched separately so the global count and previews
  // don't depend on which project is selected above.
  const [globalAnnotations, setGlobalAnnotations] = useState<GlobalAnnotation[]>([]);

  useEffect(() => {
    if (!designerId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/designer/crm/annotations?all=true`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setGlobalAnnotations(data.annotations ?? []);
      } catch {
        /* silent — the sidebar simply shows an empty state */
      }
    };
    load();
    // Poll every 20s so the designer sees new questions trickle in.
    const id = setInterval(load, 20_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [designerId]);

  // ── Load portfolio projects (DesignerProject) ─────────────────────
  useEffect(() => {
    if (!designerId) return;
    let cancelled = false;
    // The endpoint returns the array directly (not wrapped). It also
     // scopes by the authenticated user via middleware headers, so we don't
     // pass designerId — but we keep the useEffect dep for page routing.
    fetch(`/api/designer/projects`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !Array.isArray(d)) return;
        const list: Project[] = d.map((p: any) => ({ id: p.id, title: p.title }));
        setProjects(list);
        if (list.length > 0) setProjectId(list[0].id);
      })
      .catch(() => { /* silent — shown as empty state */ });
    return () => {
      cancelled = true;
    };
  }, [designerId]);

  // Tracks models we've already kicked this page-load so we don't
  // hammer /convert on every poll. The kick IS itself idempotent via
  // the route's state-machine check, but keeping a client-side guard
  // cuts needless network round-trips.
  // Map of modelId → timestamp of last kick. We re-kick if a model stays
  // stuck in pending/processing for more than ~45s since the last kick
  // (the convert route's own stale guard will dedupe if truly in-flight).
  const lastKickAtRef = useRef<Map<string, number>>(new Map());

  /**
   * Fire /convert for a specific model. Used both by the background
   * poller (auto-heal) and the "retry" button. The convert route is
   * idempotent — it'll no-op (inFlight) if the model is already ready
   * or truly in-flight. Passing force=true bypasses the inFlight guard
   * on the server for the explicit retry case.
   */
  const kickConversion = useCallback(async (modelId: string, force = false) => {
    try {
      await fetch(
        `/api/designer/crm/models/${modelId}/convert${force ? "?force=1" : ""}`,
        { method: "POST" }
      );
    } catch {
      /* silent — next poll will try again */
    }
  }, []);

  const loadModels = useCallback(async () => {
    if (!projectId) {
      setModels([]);
      return;
    }
    try {
      const res = await fetch(`/api/designer/crm/models?projectId=${projectId}`);
      if (!res.ok) return;
      const data = await res.json();
      const list: Model[] = data.models ?? [];
      setModels(list);

      // Self-heal: fire-and-forget kick for models stuck in pending or
      // processing. We trigger from the browser rather than the server
      // because the upload-time fire-and-forget fetch is unreliable in
      // Vercel's serverless runtime (the parent function terminates
      // before the outbound request connects). A browser-initiated call
      // runs as its own fresh invocation with full maxDuration budget.
      //
      // First kick: 3s after row creation (quickly after the server's
      // own kick had a chance to connect).
      // Re-kick: every 45s thereafter if still stuck. 45s covers the
      // typical convert time (IFC on a 50MB house ≈ 31s) while still
      // re-attempting quickly if the first kick never reached the server.
      const now = Date.now();
      const FIRST_KICK_AFTER_MS = 3_000;
      const REKICK_EVERY_MS = 45_000;
      for (const m of list) {
        if (m.conversionStatus !== "pending" && m.conversionStatus !== "processing") {
          continue;
        }
        const lastKickAt = lastKickAtRef.current.get(m.id);
        const createdAgeMs = now - new Date(m.createdAt).getTime();
        if (lastKickAt === undefined) {
          // Never kicked by this client. Wait briefly so we don't race
          // the server's own initial kick.
          if (createdAgeMs < FIRST_KICK_AFTER_MS) continue;
        } else {
          // Already kicked — back off and retry periodically.
          if (now - lastKickAt < REKICK_EVERY_MS) continue;
        }
        lastKickAtRef.current.set(m.id, now);
        void kickConversion(m.id);
      }
    } catch {
      /* keep previous list */
    }
  }, [projectId, kickConversion]);

  useEffect(() => {
    loadModels();
    // Poll every 8s while we have pending/processing models. Even when
    // everything is ready, a slower background poll keeps the UI in sync
    // if the designer uploads from another tab.
    const id = setInterval(loadModels, 8_000);
    return () => clearInterval(id);
  }, [loadModels]);

  /**
   * Manually re-trigger conversion for a failed or stuck model. Sends
   * force=1 so the server bypasses the "inFlight" guard — otherwise
   * clicking the retry button on a model stuck in "processing" for <90s
   * would just get an inFlight ack and nothing would actually happen.
   */
  async function retryConversion(modelId: string) {
    lastKickAtRef.current.set(modelId, Date.now());
    // Don't await — kickConversion can take the full conversion time
    // (30s+ for a 50MB IFC). We fire it and refresh the list so the UI
    // flips to "processing" quickly.
    void kickConversion(modelId, true);
    setTimeout(() => {
      void loadModels();
    }, 600);
  }

  // ── Upload handler ────────────────────────────────────────────────
  const onFile = useCallback(
    async (file: File) => {
      if (!projectId) {
        setUploadError("נא לבחור פרויקט");
        return;
      }
      setUploading(true);
      setProgress(0);
      setUploadError(null);
      try {
        // 1) Presign
        const presignRes = await fetch("/api/designer/crm/models/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            size: file.size,
            projectId,
          }),
        });
        if (!presignRes.ok) {
          const err = await presignRes.json().catch(() => ({}));
          throw new Error(err.error || "presign failed");
        }
        const { uploadUrl, key, publicUrl, format } = await presignRes.json();

        // 2) PUT to R2 with progress — use XHR (fetch doesn't expose upload progress)
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader(
            "Content-Type",
            file.type || "application/octet-stream"
          );
          xhr.upload.addEventListener("progress", (ev) => {
            if (ev.lengthComputable) {
              setProgress((ev.loaded / ev.total) * 100);
            }
          });
          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`R2 upload failed: ${xhr.status}`));
          });
          xhr.addEventListener("error", () => reject(new Error("network error")));
          xhr.send(file);
        });

        // 3) Create Model3D record
        const createRes = await fetch("/api/designer/crm/models", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            title: file.name.replace(/\.[^.]+$/, ""),
            originalUrl: publicUrl,
            originalR2Key: key,
            originalFormat: format,
            originalSize: file.size,
          }),
        });
        if (!createRes.ok) {
          const err = await createRes.json().catch(() => ({}));
          throw new Error(err.error || "create failed");
        }
        await loadModels();
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : "שגיאה בהעלאה");
      } finally {
        setUploading(false);
        setProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [projectId, loadModels]
  );

  async function onDelete(modelId: string) {
    if (!confirm("למחוק את המודל? פעולה זו סופית.")) return;
    const res = await fetch(`/api/designer/crm/models/${modelId}`, {
      method: "DELETE",
    });
    if (res.ok) await loadModels();
  }

  function copyShareLink(token: string) {
    const url = `${window.location.origin}/projects/3d/${token}`;
    navigator.clipboard.writeText(url).then(
      () => alert("הקישור הועתק"),
      () => prompt("העתק/י ידנית:", url)
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAFAF8] py-8 px-4 lg:px-8">
      <div className="max-w-6xl mx-auto lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6 lg:items-start">
        <div className="min-w-0">
        <Link
          href={`/designer/${designerId}`}
          className="inline-flex items-center gap-1 text-sm text-[#8B6914] hover:text-[#C9A84C] mb-4"
        >
          <ArrowRight className="w-4 h-4" />
          חזרה ללוח הבקרה
        </Link>

        <h1
          className="text-3xl mb-2"
          style={{ fontFamily: "'Frank Ruhl Libre', serif", color: "#1A1A1A" }}
        >
          מודלים תלת-מימד
        </h1>
        <p className="text-sm text-[#8B6914] mb-8">
          העלי קובץ תלת-מימד של פרויקט, קבלי קישור לשיתוף, ונהלי את ההערות של הלקוחה ישירות מהמודל.
          המודלים נשמרים למשך 3 חודשים ונמחקים אוטומטית.
        </p>

        {/* Project picker + upload */}
        <section
          className="bg-white rounded-2xl p-6 mb-6 border"
          style={{ borderColor: "#E5E1D4" }}
        >
          <label className="block text-xs text-[#8B6914] mb-1" style={{ fontFamily: "Rubik, sans-serif" }}>
            פרויקט
          </label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full p-2 border rounded-lg bg-[#FAFAF8] mb-4"
            style={{ borderColor: "#E5E1D4" }}
          >
            {projects.length === 0 && <option value="">אין פרויקטים — צרי קודם בתיק העבודות</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>

          <div
            className="border-2 border-dashed rounded-xl p-8 text-center"
            style={{ borderColor: "#C9A84C", background: "#F5F1E8" }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) onFile(f);
            }}
          >
            <div className="text-[#8B6914] mb-2" style={{ fontFamily: "Rubik, sans-serif" }}>
              גררי קובץ לכאן או
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".ifc,.glb,.gltf,.obj,.fbx,.dae"
              disabled={uploading || !projectId}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
              className="hidden"
              id="model-upload"
            />
            <label
              htmlFor="model-upload"
              className="inline-block px-5 py-2 rounded-full cursor-pointer"
              style={{
                background: uploading || !projectId ? "#E5E1D4" : "#C9A84C",
                color: "#1A1A1A",
                fontFamily: "Rubik, sans-serif",
                fontSize: 14,
                fontWeight: 500,
                pointerEvents: uploading || !projectId ? "none" : "auto",
              }}
            >
              {uploading ? `מעלה... ${Math.round(progress)}%` : "בחרי קובץ"}
            </label>
            <div className="text-xs text-[#8B6914] mt-3 leading-relaxed">
              <div>פורמטים נתמכים: GLB, glTF, OBJ, IFC, FBX, DAE · עד 500MB</div>
              <div className="opacity-70">
                טיפ: glTF רב-קבצי (עם .bin/.png נפרדים) לא נתמך — יש לייצא GLB.
              </div>
            </div>
            {uploading && (
              <div
                className="h-1 mt-3 rounded overflow-hidden"
                style={{ background: "#E5E1D4" }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: "100%",
                    background: "#C9A84C",
                    transition: "width 200ms linear",
                  }}
                />
              </div>
            )}
            {uploadError && (
              <div className="text-sm text-red-700 mt-3">{uploadError}</div>
            )}
          </div>
        </section>

        {/* Models list */}
        <section>
          <h2
            className="text-xl mb-3"
            style={{ fontFamily: "'Frank Ruhl Libre', serif", color: "#8B6914" }}
          >
            מודלים בפרויקט
          </h2>

          {models.length === 0 && (
            <div className="text-center py-10 text-[#8B6914] text-sm">
              אין מודלים בפרויקט הזה עדיין
            </div>
          )}

          <div className="grid gap-3">
            {models.map((m) => {
              const isReady = m.conversionStatus === "ready";
              const days = daysLeft(m.expiresAt);
              return (
                <div
                  key={m.id}
                  className="bg-white rounded-xl p-4 border flex flex-col md:flex-row md:items-center gap-3"
                  style={{ borderColor: "#E5E1D4" }}
                >
                  {/* Thumbnail (lazy — captured by the first client visit). */}
                  <div
                    className="flex-shrink-0 rounded-lg overflow-hidden"
                    style={{
                      width: 88,
                      height: 66,
                      background: "#FAFAF8",
                      border: "1px solid #E5E1D4",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {m.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.thumbnailUrl}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <span style={{ fontSize: 22, opacity: 0.35 }}>📦</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        style={{
                          fontFamily: "'Frank Ruhl Libre', serif",
                          fontSize: 17,
                          color: "#1A1A1A",
                        }}
                      >
                        {m.title || "ללא שם"}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: isReady
                            ? "#B8D4B8"
                            : m.conversionStatus === "failed"
                            ? "#F5C6C6"
                            : "#F5F1E8",
                          color: "#1A1A1A",
                          fontFamily: "Rubik, sans-serif",
                        }}
                      >
                        {STATUS_LABEL[m.conversionStatus] || m.conversionStatus}
                      </span>
                    </div>
                    <div className="text-xs text-[#8B6914] mt-1" style={{ fontFamily: "Rubik, sans-serif" }}>
                      {m.originalFormat.toUpperCase()} · {formatSize(m.originalSize)} · נשאר {days} ימים
                      {m._count && m._count.annotations > 0 && (
                        <> · 💬 {m._count.annotations} הערות</>
                      )}
                    </div>
                    {m.conversionError && (
                      <div className="text-xs text-red-700 mt-1">{m.conversionError}</div>
                    )}
                    {(m.conversionStatus === "failed" ||
                      m.conversionStatus === "pending" ||
                      m.conversionStatus === "processing") && (
                      <button
                        type="button"
                        onClick={() => retryConversion(m.id)}
                        className="text-xs text-[#8B6914] hover:text-[#C9A84C] underline mt-1"
                        style={{ fontFamily: "Rubik, sans-serif" }}
                      >
                        {m.conversionStatus === "failed"
                          ? "נסה שוב"
                          : "זרז המרה"}
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {isReady && (
                      <>
                        <a
                          href={`/projects/3d/${m.shareToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 rounded-lg text-sm"
                          style={{
                            background: "#1A1A1A",
                            color: "#FAFAF8",
                            fontFamily: "Rubik, sans-serif",
                          }}
                        >
                          פתח
                        </a>
                        <Link
                          href={`/designer/${designerId}/models/${m.id}/annotations`}
                          className="px-3 py-2 rounded-lg text-sm border"
                          style={{
                            borderColor: "#8B6914",
                            color: "#8B6914",
                            fontFamily: "Rubik, sans-serif",
                          }}
                        >
                          הערות
                          {m._count && m._count.annotations > 0 ? (
                            <span className="mr-1 text-[10px] opacity-75">
                              ({m._count.annotations})
                            </span>
                          ) : null}
                        </Link>
                        <button
                          onClick={() => copyShareLink(m.shareToken)}
                          className="px-3 py-2 rounded-lg text-sm border"
                          style={{
                            borderColor: "#C9A84C",
                            color: "#8B6914",
                            fontFamily: "Rubik, sans-serif",
                          }}
                        >
                          העתק קישור
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => onDelete(m.id)}
                      className="px-3 py-2 rounded-lg text-sm border"
                      style={{
                        borderColor: "#B00020",
                        color: "#B00020",
                        fontFamily: "Rubik, sans-serif",
                      }}
                    >
                      מחק
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        </div>

        {/* Global annotations sidebar — every live pin across every model */}
        <aside
          className="hidden lg:block bg-white rounded-2xl border p-4 sticky top-8 max-h-[calc(100vh-4rem)] overflow-auto mt-4 lg:mt-0"
          style={{ borderColor: "#E5E1D4" }}
          aria-label="שאלות פתוחות מלקוחות"
        >
          <h2
            className="text-base mb-3 flex items-center gap-2"
            style={{
              fontFamily: "'Frank Ruhl Libre', serif",
              color: "#1A1A1A",
            }}
          >
            <MessageCircle className="w-4 h-4 text-[#8B6914]" />
            שאלות פתוחות מלקוחות
            {globalAnnotations.length > 0 && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "#F5F1E8", color: "#8B6914" }}
              >
                {globalAnnotations.length}
              </span>
            )}
          </h2>

          {globalAnnotations.length === 0 ? (
            <p className="text-xs text-[#8B6914] opacity-75">
              עדיין אין שאלות מלקוחות על מודלים שלך.
            </p>
          ) : (
            <ul className="space-y-2">
              {globalAnnotations.map((a) => {
                const projectTitle =
                  a.model.crmProject?.name ||
                  a.model.project?.title ||
                  "פרויקט";
                const clientName = a.model.crmClient?.name;
                return (
                  <li key={a.id}>
                    <Link
                      href={`/designer/${designerId}/models/${a.model.id}/annotations`}
                      className="block p-2 rounded-lg border hover:bg-[#FAFAF8] transition"
                      style={{ borderColor: "#E5E1D4" }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[#1A1A1A] truncate">
                          {a.model.title || "מודל"}
                        </span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{
                            background:
                              a.status === "OPEN"
                                ? "#F5F1E8"
                                : a.status === "ANSWERED"
                                ? "#E8EFF5"
                                : a.status === "PINNED"
                                ? "#1A1A1A"
                                : "#ECF5EC",
                            color:
                              a.status === "PINNED" ? "#FAFAF8" : "#1A1A1A",
                          }}
                        >
                          {a.status === "OPEN"
                            ? "פתוח"
                            : a.status === "ANSWERED"
                            ? "נענה"
                            : a.status === "PINNED"
                            ? "חשוב"
                            : "נפתר"}
                        </span>
                      </div>
                      <p className="text-xs text-[#1A1A1A] line-clamp-2 leading-snug">
                        {a.question || a.label || "ללא טקסט"}
                      </p>
                      <p className="text-[10px] text-[#8B6914] mt-1 truncate">
                        {projectTitle}
                        {clientName ? ` · ${clientName}` : ""}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
