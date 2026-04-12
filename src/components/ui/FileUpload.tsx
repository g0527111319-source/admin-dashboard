"use client";

import { useState, useRef, useCallback } from "react";

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
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const defaultAccept = category === "image"
    ? "image/jpeg,image/png,image/gif,image/webp"
    : category === "document"
    ? ".pdf,.doc,.docx,.xls,.xlsx,.txt"
    : "*";

  const uploadFile = useCallback(async (file: File) => {
    if (disabled) return;

    // Client-side size check
    const limit = maxSize || (category === "image" ? 10 : category === "document" ? 25 : 50) * 1024 * 1024;
    if (file.size > limit) {
      const msg = `הקובץ גדול מדי. מקסימום ${Math.round(limit / 1024 / 1024)}MB`;
      onError?.(msg);
      return;
    }

    setUploading(true);
    setProgress(10);

    // Show image preview immediately
    if (file.type.startsWith("image/")) {
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

      setProgress(30);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      setProgress(80);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "שגיאה בהעלאה");
      }

      const data = await res.json();
      setProgress(100);
      setPreview(data.url);

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
      setPreview(currentUrl || null);
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 500);
    }
  }, [folder, designerId, category, maxSize, disabled, onUpload, onError, currentUrl]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      if (multiple) {
        files.forEach(uploadFile);
      } else {
        uploadFile(files[0]);
      }
    }
  }, [multiple, uploadFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      if (multiple) {
        files.forEach(uploadFile);
      } else {
        uploadFile(files[0]);
      }
    }
    // Reset input so same file can be uploaded again
    if (inputRef.current) inputRef.current.value = "";
  }, [multiple, uploadFile]);

  const isImage = preview && (preview.startsWith("data:image") || /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(preview));

  if (compact) {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
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
            padding: "6px 14px",
            background: uploading ? "#ccc" : "var(--primary, #2563eb)",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: disabled || uploading ? "not-allowed" : "pointer",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {uploading ? (
            <>
              <span style={{
                width: "14px", height: "14px",
                border: "2px solid rgba(255,255,255,0.3)",
                borderTopColor: "#fff",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                display: "inline-block",
              }} />
              מעלה...
            </>
          ) : (
            <>📎 {label || "העלאת קובץ"}</>
          )}
        </button>
        {preview && isImage && (
          <img
            src={preview}
            alt="preview"
            style={{ width: "32px", height: "32px", borderRadius: "4px", objectFit: "cover" }}
          />
        )}
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
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
          border: `2px dashed ${dragOver ? "var(--primary, #2563eb)" : "#d1d5db"}`,
          borderRadius: "12px",
          padding: preview && isImage ? "8px" : "32px 16px",
          textAlign: "center",
          cursor: disabled || uploading ? "not-allowed" : "pointer",
          background: dragOver ? "rgba(37, 99, 235, 0.05)" : uploading ? "#f9fafb" : "#fff",
          transition: "all 0.2s ease",
          position: "relative",
          overflow: "hidden",
          opacity: disabled ? 0.6 : 1,
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
                background: "rgba(0,0,0,0.4)",
                borderRadius: "8px",
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: 0,
                transition: "opacity 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
              >
                <span style={{ color: "#fff", fontSize: "14px", fontWeight: 600 }}>
                  לחץ להחלפת תמונה
                </span>
              </div>
            )}
          </div>
        ) : (
          <>
            <div style={{ fontSize: "36px", marginBottom: "8px", opacity: 0.5 }}>
              {category === "image" ? "🖼️" : category === "document" ? "📄" : "📁"}
            </div>
            <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "4px" }}>
              {label || (category === "image" ? "גרור תמונה לכאן או לחץ לבחירה" :
                category === "document" ? "גרור מסמך לכאן או לחץ לבחירה" :
                "גרור קובץ לכאן או לחץ לבחירה")}
            </div>
            <div style={{ fontSize: "12px", color: "#9ca3af" }}>
              {category === "image" ? "JPG, PNG, GIF, WebP — עד 10MB" :
               category === "document" ? "PDF, DOC, DOCX, XLS, XLSX — עד 25MB" :
               "כל סוגי הקבצים — עד 50MB"}
            </div>
          </>
        )}

        {/* Progress bar */}
        {uploading && progress > 0 && (
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            height: "4px", background: "#e5e7eb",
          }}>
            <div style={{
              height: "100%",
              width: `${progress}%`,
              background: "var(--primary, #2563eb)",
              transition: "width 0.3s ease",
              borderRadius: "0 2px 2px 0",
            }} />
          </div>
        )}
      </div>

      {preview && !isImage && preview !== currentUrl && (
        <div style={{
          marginTop: "8px",
          padding: "8px 12px",
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "8px",
          fontSize: "13px",
          color: "#166534",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}>
          ✅ קובץ הועלה בהצלחה
        </div>
      )}
    </div>
  );
}
