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
import { ArrowRight } from "lucide-react";

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

  const loadModels = useCallback(async () => {
    if (!projectId) {
      setModels([]);
      return;
    }
    try {
      const res = await fetch(`/api/designer/crm/models?projectId=${projectId}`);
      if (!res.ok) return;
      const data = await res.json();
      setModels(data.models ?? []);
    } catch {
      /* keep previous list */
    }
  }, [projectId]);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

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
      <div className="max-w-5xl mx-auto">
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
              <div>פורמטים נתמכים: GLB, glTF, OBJ, IFC · עד 500MB</div>
              <div className="opacity-70">
                FBX, DAE — בקרוב. המירי בינתיים ל-glTF (Blender מייצא ישירות)
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
    </div>
  );
}
