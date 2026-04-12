"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Image as ImageIcon, FileText, FolderOpen, Loader2, CheckCircle2, X, AlertCircle } from "lucide-react";
import ImageEditor from "./ImageEditor";

export interface UploadedFile {
  url: string;
  key: string;
  filename: string;
  size: number;
  contentType: string;
}

interface FileUploadProps {
  onUpload: (file: UploadedFile) => void;
  onError?: (error: string) => void;
  folder?: string;
  designerId?: string;
  category?: "image" | "document" | "any";
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  label?: string;
  compact?: boolean;
  currentUrl?: string;
  disabled?: boolean;
  /** Disable the image editor for image uploads */
  skipEditor?: boolean;
  /** Use dark theme styling (for dark backgrounds) */
  dark?: boolean;
}

interface UploadingFileInfo {
  id: string;
  name: string;
  size: number;
  status: "uploading" | "done" | "error";
  progress: number;
  errorMsg?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function FileUpload({
  onUpload,
  onError,
  folder = "general",
  designerId,
  category = "any",
  accept,
  maxSize,
  multiple = false,
  label,
  compact = false,
  currentUrl,
  disabled = false,
  skipEditor = false,
  dark = false,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [editingFile, setEditingFile] = useState<File | null>(null);
  const [uploadQueue, setUploadQueue] = useState<UploadingFileInfo[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const defaultAccept = category === "image"
    ? "image/jpeg,image/png,image/gif,image/webp"
    : category === "document"
    ? ".pdf,.doc,.docx,.xls,.xlsx,.txt"
    : "*";

  // Auto-detect dark mode from parent background
  const isDark = dark || category === "image";

  const updateQueueItem = useCallback((id: string, update: Partial<UploadingFileInfo>) => {
    setUploadQueue(prev => prev.map(item => item.id === id ? { ...item, ...update } : item));
  }, []);

  const removeQueueItem = useCallback((id: string) => {
    setUploadQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  /** Upload a file (or edited blob) directly to R2 */
  const uploadFile = useCallback(async (file: File, queueId?: string) => {
    if (disabled) return;

    // Client-side size check
    const limit = maxSize || (category === "image" ? 10 : category === "document" ? 25 : 50) * 1024 * 1024;
    if (file.size > limit) {
      const msg = `הקובץ ${file.name} גדול מדי. מקסימום ${Math.round(limit / 1024 / 1024)}MB`;
      onError?.(msg);
      if (queueId) updateQueueItem(queueId, { status: "error", errorMsg: msg });
      return;
    }

    if (!multiple) setUploading(true);
    if (queueId) updateQueueItem(queueId, { progress: 15 });

    // Show image preview immediately (single file only)
    if (!multiple && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);
      formData.append("category", category);
      if (designerId) formData.append("designerId", designerId);

      if (queueId) updateQueueItem(queueId, { progress: 40 });

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (queueId) updateQueueItem(queueId, { progress: 85 });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "שגיאה בהעלאה");
      }

      const data = await res.json();
      if (queueId) updateQueueItem(queueId, { progress: 100, status: "done" });
      if (!multiple) setPreview(data.url);

      onUpload({
        url: data.url,
        key: data.key,
        filename: data.filename,
        size: data.size,
        contentType: data.contentType,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "שגיאה בהעלאה";
      onError?.(msg);
      if (queueId) updateQueueItem(queueId, { status: "error", errorMsg: msg });
      if (!multiple) setPreview(currentUrl || null);
    } finally {
      if (!multiple) setUploading(false);
    }
  }, [folder, designerId, category, maxSize, disabled, multiple, onUpload, onError, currentUrl, updateQueueItem]);

  /** Check if file is an editable image */
  const isEditableImage = useCallback((file: File) => {
    return !skipEditor && file.type.startsWith("image/") && !file.type.includes("svg");
  }, [skipEditor]);

  /** Process a selected file — open editor for images, upload directly for others */
  const processFile = useCallback((file: File) => {
    if (isEditableImage(file)) {
      setEditingFile(file);
    } else {
      if (multiple) {
        const queueId = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        setUploadQueue(prev => [...prev, {
          id: queueId,
          name: file.name,
          size: file.size,
          status: "uploading",
          progress: 0,
        }]);
        uploadFile(file, queueId);
      } else {
        uploadFile(file);
      }
    }
  }, [isEditableImage, uploadFile, multiple]);

  /** Called when the image editor saves a cropped/rotated image */
  const handleEditorSave = useCallback((editedBlob: Blob, filename: string) => {
    setEditingFile(null);
    const editedFile = new File([editedBlob], filename, { type: editedBlob.type });
    uploadFile(editedFile);
  }, [uploadFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      if (multiple) {
        files.forEach(processFile);
      } else {
        processFile(files[0]);
      }
    }
  }, [multiple, processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      if (multiple) {
        files.forEach(processFile);
      } else {
        processFile(files[0]);
      }
    }
    // Reset input so same file can be uploaded again
    if (inputRef.current) inputRef.current.value = "";
  }, [multiple, processFile]);

  const isImage = preview && (preview.startsWith("data:image") || /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(preview));

  // Count active/done/error uploads
  const activeUploads = uploadQueue.filter(f => f.status === "uploading").length;
  const doneUploads = uploadQueue.filter(f => f.status === "done").length;
  const errorUploads = uploadQueue.filter(f => f.status === "error").length;

  // Auto-clear done items after 3s
  const clearDoneItems = useCallback(() => {
    setUploadQueue(prev => prev.filter(item => item.status !== "done"));
  }, []);

  // Theme-aware colors
  const colors = isDark ? {
    border: dragOver ? "#C9A84C" : "rgba(255,255,255,0.15)",
    bg: dragOver ? "rgba(201,168,76,0.08)" : uploading ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.03)",
    text: "rgba(255,255,255,0.5)",
    textMuted: "rgba(255,255,255,0.3)",
    hoverOverlay: "rgba(0,0,0,0.5)",
    hoverText: "#fff",
    progressBg: "rgba(255,255,255,0.1)",
    progressFill: "#C9A84C",
    successBg: "rgba(201,168,76,0.1)",
    successBorder: "rgba(201,168,76,0.3)",
    successText: "#C9A84C",
  } : {
    border: dragOver ? "var(--primary, #2563eb)" : "#d1d5db",
    bg: dragOver ? "rgba(37, 99, 235, 0.05)" : uploading ? "#f9fafb" : "#fff",
    text: "#6b7280",
    textMuted: "#9ca3af",
    hoverOverlay: "rgba(0,0,0,0.4)",
    hoverText: "#fff",
    progressBg: "#e5e7eb",
    progressFill: "var(--primary, #2563eb)",
    successBg: "#f0fdf4",
    successBorder: "#bbf7d0",
    successText: "#166534",
  };

  if (compact) {
    return (
      <>
        {editingFile && (
          <ImageEditor
            file={editingFile}
            onSave={handleEditorSave}
            onCancel={() => setEditingFile(null)}
          />
        )}
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <input
            ref={inputRef}
            type="file"
            accept={accept || defaultAccept}
            multiple={multiple}
            onChange={handleFileSelect}
            style={{ display: "none" }}
            disabled={disabled || uploading}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
            style={{
              padding: "7px 16px",
              background: uploading ? (isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb") : (isDark ? "#C9A84C" : "var(--primary, #2563eb)"),
              color: uploading ? (isDark ? "rgba(255,255,255,0.4)" : "#9ca3af") : (isDark ? "#000" : "#fff"),
              border: "none",
              borderRadius: "8px",
              cursor: disabled || uploading ? "not-allowed" : "pointer",
              fontSize: "13px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s ease",
            }}
          >
            {uploading ? (
              <>
                <Loader2 style={{ width: 14, height: 14, animation: "spin 0.8s linear infinite" }} />
                מעלה...
              </>
            ) : (
              <>
                <Upload style={{ width: 14, height: 14 }} />
                {label || "העלאת קובץ"}
              </>
            )}
          </button>
          {preview && isImage && (
            <img
              src={preview}
              alt="preview"
              style={{ width: "40px", height: "40px", borderRadius: "6px", objectFit: "cover", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e5e7eb" }}
            />
          )}
          <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
        </div>
      </>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      {editingFile && (
        <ImageEditor
          file={editingFile}
          onSave={handleEditorSave}
          onCancel={() => setEditingFile(null)}
        />
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept || defaultAccept}
        multiple={multiple}
        onChange={handleFileSelect}
        style={{ display: "none" }}
        disabled={disabled || uploading}
      />

      <div
        onClick={() => !uploading && !disabled && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        style={{
          border: `2px dashed ${colors.border}`,
          borderRadius: "12px",
          padding: preview && isImage ? "8px" : "28px 16px",
          textAlign: "center",
          cursor: disabled || uploading ? "not-allowed" : "pointer",
          background: colors.bg,
          transition: "all 0.25s ease",
          position: "relative",
          overflow: "hidden",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {preview && isImage ? (
          <div style={{ position: "relative" }}>
            <img
              src={preview}
              alt="preview"
              style={{
                maxWidth: "100%",
                maxHeight: "200px",
                borderRadius: "8px",
                objectFit: "contain",
                display: "block",
                margin: "0 auto",
              }}
            />
            {!uploading && (
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                background: colors.hoverOverlay,
                borderRadius: "8px",
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: 0,
                transition: "opacity 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
              >
                <span style={{ color: colors.hoverText, fontSize: "14px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                  <Upload style={{ width: 16, height: 16 }} />
                  לחץ להחלפת תמונה
                </span>
              </div>
            )}
          </div>
        ) : (
          <>
            <div style={{ marginBottom: "8px", opacity: 0.5, display: "flex", justifyContent: "center" }}>
              {category === "image" ? (
                <ImageIcon style={{ width: 32, height: 32, color: isDark ? "#C9A84C" : "#9ca3af" }} />
              ) : category === "document" ? (
                <FileText style={{ width: 32, height: 32, color: isDark ? "#C9A84C" : "#9ca3af" }} />
              ) : (
                <FolderOpen style={{ width: 32, height: 32, color: isDark ? "#C9A84C" : "#9ca3af" }} />
              )}
            </div>
            <div style={{ fontSize: "14px", color: colors.text, marginBottom: "4px", fontWeight: 500 }}>
              {label || (category === "image" ? "גרור תמונה לכאן או לחץ לבחירה" :
                category === "document" ? "גרור מסמך לכאן או לחץ לבחירה" :
                "גרור קובץ לכאן או לחץ לבחירה")}
            </div>
            <div style={{ fontSize: "12px", color: colors.textMuted }}>
              {category === "image" ? "JPG, PNG, GIF, WebP — עד 10MB" :
               category === "document" ? "PDF, DOC, DOCX, XLS, XLSX — עד 25MB" :
               "כל סוגי הקבצים — עד 50MB"}
            </div>
            {multiple && (
              <div style={{ fontSize: "11px", color: isDark ? "rgba(201,168,76,0.6)" : "#a78bfa", marginTop: "4px" }}>
                ניתן לבחור מספר קבצים בו-זמנית
              </div>
            )}
          </>
        )}

        {/* Progress bar (single file) */}
        {uploading && !multiple && (
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            height: "4px", background: colors.progressBg,
          }}>
            <div style={{
              height: "100%",
              width: "70%",
              background: colors.progressFill,
              transition: "width 0.3s ease",
              borderRadius: "0 2px 2px 0",
              animation: "uploadPulse 1.5s ease-in-out infinite",
            }} />
          </div>
        )}
      </div>

      {/* Multi-file upload queue */}
      {uploadQueue.length > 0 && (
        <div style={{ marginTop: "10px" }}>
          {/* Summary bar */}
          {(activeUploads > 0 || doneUploads > 0) && (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px",
              background: isDark ? "rgba(255,255,255,0.05)" : "#f9fafb",
              borderRadius: "8px",
              marginBottom: "6px",
              fontSize: "12px",
              color: isDark ? "rgba(255,255,255,0.6)" : "#6b7280",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {activeUploads > 0 && (
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <Loader2 style={{ width: 12, height: 12, animation: "spin 0.8s linear infinite" }} />
                    מעלה {activeUploads} קבצים...
                  </span>
                )}
                {doneUploads > 0 && (
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", color: isDark ? "#C9A84C" : "#16a34a" }}>
                    <CheckCircle2 style={{ width: 12, height: 12 }} />
                    {doneUploads} הועלו
                  </span>
                )}
                {errorUploads > 0 && (
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#ef4444" }}>
                    <AlertCircle style={{ width: 12, height: 12 }} />
                    {errorUploads} נכשלו
                  </span>
                )}
              </div>
              {activeUploads === 0 && (
                <button
                  onClick={clearDoneItems}
                  style={{
                    background: "none",
                    border: "none",
                    color: isDark ? "rgba(255,255,255,0.3)" : "#9ca3af",
                    cursor: "pointer",
                    fontSize: "11px",
                    padding: "2px 6px",
                  }}
                >
                  נקה
                </button>
              )}
            </div>
          )}

          {/* Individual file items */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {uploadQueue.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 10px",
                  background: isDark ? "rgba(255,255,255,0.03)" : "#fafafa",
                  borderRadius: "8px",
                  border: `1px solid ${
                    item.status === "error" ? (isDark ? "rgba(239,68,68,0.3)" : "#fecaca") :
                    item.status === "done" ? (isDark ? "rgba(201,168,76,0.2)" : "#bbf7d0") :
                    isDark ? "rgba(255,255,255,0.06)" : "#f3f4f6"
                  }`,
                  fontSize: "12px",
                  transition: "all 0.2s ease",
                }}
              >
                {/* Status icon */}
                {item.status === "uploading" && (
                  <Loader2 style={{ width: 14, height: 14, color: isDark ? "#C9A84C" : "#2563eb", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
                )}
                {item.status === "done" && (
                  <CheckCircle2 style={{ width: 14, height: 14, color: isDark ? "#C9A84C" : "#16a34a", flexShrink: 0 }} />
                )}
                {item.status === "error" && (
                  <AlertCircle style={{ width: 14, height: 14, color: "#ef4444", flexShrink: 0 }} />
                )}

                {/* File name */}
                <span style={{
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: item.status === "error" ? "#ef4444" : isDark ? "rgba(255,255,255,0.6)" : "#374151",
                  direction: "ltr",
                  textAlign: "right",
                }}>
                  {item.name}
                </span>

                {/* File size */}
                <span style={{ color: isDark ? "rgba(255,255,255,0.25)" : "#9ca3af", flexShrink: 0, fontSize: "11px" }}>
                  {formatFileSize(item.size)}
                </span>

                {/* Progress bar (inline for uploading) */}
                {item.status === "uploading" && (
                  <div style={{
                    width: "60px",
                    height: "4px",
                    background: isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb",
                    borderRadius: "2px",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${item.progress}%`,
                      background: isDark ? "#C9A84C" : "#2563eb",
                      borderRadius: "2px",
                      transition: "width 0.3s ease",
                    }} />
                  </div>
                )}

                {/* Remove button for errors */}
                {item.status === "error" && (
                  <button
                    onClick={() => removeQueueItem(item.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#ef4444",
                      cursor: "pointer",
                      padding: "2px",
                      flexShrink: 0,
                    }}
                  >
                    <X style={{ width: 12, height: 12 }} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Single file success message */}
      {!multiple && preview && !isImage && preview !== currentUrl && (
        <div style={{
          marginTop: "8px",
          padding: "8px 12px",
          background: colors.successBg,
          border: `1px solid ${colors.successBorder}`,
          borderRadius: "8px",
          fontSize: "13px",
          color: colors.successText,
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}>
          <CheckCircle2 style={{ width: 14, height: 14 }} />
          קובץ הועלה בהצלחה
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes uploadPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
      `}} />
    </div>
  );
}
