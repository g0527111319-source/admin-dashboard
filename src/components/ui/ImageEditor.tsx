"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { RotateCcw, RotateCw, FlipHorizontal, FlipVertical, ZoomIn, ZoomOut, X, Check, Loader2 } from "lucide-react";

// ==========================================
// Image Editor — Crop, Rotate, Flip, Zoom
// ==========================================

export interface ImageEditorProps {
  file: File;
  onSave: (editedBlob: Blob, filename: string) => void;
  onCancel: () => void;
  aspectRatios?: AspectOption[];
  initialAspect?: number;
  maxOutputWidth?: number;
  maxOutputHeight?: number;
}

export interface AspectOption {
  label: string;
  value: number | undefined; // undefined = free crop
}

const DEFAULT_ASPECTS: AspectOption[] = [
  { label: "חופשי", value: undefined },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:4", value: 3 / 4 },
  { label: "16:9", value: 16 / 9 },
  { label: "9:16", value: 9 / 16 },
];

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop(
      { unit: "%", width: 90 },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export default function ImageEditor({
  file,
  onSave,
  onCancel,
  aspectRatios = DEFAULT_ASPECTS,
  initialAspect,
  maxOutputWidth = 2000,
  maxOutputHeight = 2000,
}: ImageEditorProps) {
  const [imgSrc, setImgSrc] = useState("");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<number | undefined>(initialAspect);
  const [saving, setSaving] = useState(false);
  const [fileInfo, setFileInfo] = useState({ name: "", size: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load file into data URL
  useEffect(() => {
    setFileInfo({ name: file.name, size: file.size });
    const reader = new FileReader();
    reader.onload = () => setImgSrc(reader.result as string);
    reader.readAsDataURL(file);
  }, [file]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
      if (aspect) {
        setCrop(centerAspectCrop(w, h, aspect));
      } else {
        setCrop({ unit: "%", x: 5, y: 5, width: 90, height: 90 });
      }
    },
    [aspect]
  );

  const handleAspectChange = (newAspect: number | undefined) => {
    setAspect(newAspect);
    if (imgRef.current && newAspect) {
      const { naturalWidth: w, naturalHeight: h } = imgRef.current;
      setCrop(centerAspectCrop(w, h, newAspect));
    }
  };

  const handleRotate = (degrees: number) => {
    setRotation((prev) => (prev + degrees + 360) % 360);
  };

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };

  const handleSave = useCallback(async () => {
    if (!imgRef.current || !canvasRef.current) return;
    setSaving(true);

    const image = imgRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Determine output dimensions
    let srcX = 0, srcY = 0, srcW = image.naturalWidth, srcH = image.naturalHeight;
    if (completedCrop) {
      srcX = completedCrop.x * scaleX;
      srcY = completedCrop.y * scaleY;
      srcW = completedCrop.width * scaleX;
      srcH = completedCrop.height * scaleY;
    }

    // Handle rotation swap of width/height
    const isRotated90or270 = rotation === 90 || rotation === 270;
    let outW = isRotated90or270 ? srcH : srcW;
    let outH = isRotated90or270 ? srcW : srcH;

    // Limit output size
    if (outW > maxOutputWidth || outH > maxOutputHeight) {
      const ratio = Math.min(maxOutputWidth / outW, maxOutputHeight / outH);
      outW = Math.round(outW * ratio);
      outH = Math.round(outH * ratio);
    }

    canvas.width = outW;
    canvas.height = outH;

    ctx.save();
    ctx.translate(outW / 2, outH / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    // Apply flip
    const scaleFlipX = flipH ? -1 : 1;
    const scaleFlipY = flipV ? -1 : 1;
    ctx.scale(scaleFlipX, scaleFlipY);

    const drawW = isRotated90or270 ? outH : outW;
    const drawH = isRotated90or270 ? outW : outH;

    ctx.drawImage(image, srcX, srcY, srcW, srcH, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const ext = file.name.split(".").pop() || "jpg";
          const baseName = file.name.replace(/\.[^.]+$/, "");
          onSave(blob, `${baseName}-edited.${ext}`);
        }
        setSaving(false);
      },
      file.type || "image/jpeg",
      0.92
    );
  }, [completedCrop, rotation, flipH, flipV, file, onSave, maxOutputWidth, maxOutputHeight]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  if (!imgSrc) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.9)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Loader2 style={{ width: 32, height: 32, color: "#C9A84C", animation: "spin 0.8s linear infinite" }} />
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
      </div>
    );
  }

  const toolBtnStyle = (active?: boolean): React.CSSProperties => ({
    padding: "8px 12px",
    borderRadius: 8,
    border: "none",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    background: active ? "#C9A84C" : "rgba(255,255,255,0.1)",
    color: active ? "#000" : "#fff",
    transition: "all 0.15s ease",
    display: "flex",
    alignItems: "center",
    gap: "5px",
  });

  const iconBtnStyle = (active?: boolean): React.CSSProperties => ({
    padding: "8px",
    borderRadius: 8,
    border: active ? "1px solid #C9A84C" : "1px solid transparent",
    background: active ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.08)",
    color: active ? "#C9A84C" : "#fff",
    cursor: "pointer",
    transition: "all 0.15s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });

  return (
    <div
      dir="rtl"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.92)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Top bar - file info & close */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "14px", fontWeight: 600 }}>
            עריכת תמונה
          </span>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px" }}>
            {fileInfo.name} ({formatSize(fileInfo.size)})
          </span>
        </div>
        <button
          onClick={onCancel}
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "none",
            borderRadius: "8px",
            padding: "6px",
            cursor: "pointer",
            color: "rgba(255,255,255,0.6)",
            transition: "all 0.15s ease",
          }}
        >
          <X style={{ width: 20, height: 20 }} />
        </button>
      </div>

      {/* Toolbar */}
      <div style={{
        display: "flex",
        gap: "6px",
        padding: "10px 20px",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        {/* Aspect ratio buttons */}
        {aspectRatios.map((opt) => (
          <button
            key={opt.label}
            onClick={() => handleAspectChange(opt.value)}
            style={toolBtnStyle(aspect === opt.value)}
          >
            {opt.label}
          </button>
        ))}

        <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.15)", margin: "0 6px" }} />

        {/* Rotation buttons */}
        <button onClick={() => handleRotate(-90)} style={iconBtnStyle()} title="סיבוב שמאלה">
          <RotateCcw style={{ width: 18, height: 18 }} />
        </button>
        <button onClick={() => handleRotate(90)} style={iconBtnStyle()} title="סיבוב ימינה">
          <RotateCw style={{ width: 18, height: 18 }} />
        </button>

        <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.15)", margin: "0 6px" }} />

        {/* Flip buttons */}
        <button onClick={() => setFlipH(f => !f)} style={iconBtnStyle(flipH)} title="שיקוף אופקי">
          <FlipHorizontal style={{ width: 18, height: 18 }} />
        </button>
        <button onClick={() => setFlipV(f => !f)} style={iconBtnStyle(flipV)} title="שיקוף אנכי">
          <FlipVertical style={{ width: 18, height: 18 }} />
        </button>

        <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.15)", margin: "0 6px" }} />

        {/* Zoom */}
        <button onClick={() => handleZoom(-0.25)} style={iconBtnStyle()} title="הקטנה">
          <ZoomOut style={{ width: 18, height: 18 }} />
        </button>
        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", minWidth: "40px", textAlign: "center" }}>
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={() => handleZoom(0.25)} style={iconBtnStyle()} title="הגדלה">
          <ZoomIn style={{ width: 18, height: 18 }} />
        </button>
      </div>

      {/* Crop area - centered */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        padding: "16px",
      }}>
        <div
          style={{
            maxWidth: "85vw",
            maxHeight: "calc(100vh - 200px)",
            overflow: "hidden",
            borderRadius: 12,
            background: "#111",
            boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
          }}
        >
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
            style={{ maxHeight: "calc(100vh - 200px)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imgSrc}
              alt="edit"
              onLoad={onImageLoad}
              style={{
                maxWidth: "85vw",
                maxHeight: "calc(100vh - 200px)",
                transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1}) scale(${zoom})`,
                transition: "transform 0.3s ease",
                transformOrigin: "center center",
              }}
            />
          </ReactCrop>
        </div>
      </div>

      {/* Bottom action bar */}
      <div style={{
        display: "flex",
        gap: 12,
        justifyContent: "center",
        padding: "14px 20px",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.4)",
      }}>
        <button
          onClick={onCancel}
          style={{
            padding: "10px 28px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "transparent",
            color: "rgba(255,255,255,0.7)",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.15s ease",
          }}
        >
          <X style={{ width: 16, height: 16 }} />
          ביטול
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "10px 32px",
            borderRadius: 10,
            border: "none",
            background: saving ? "rgba(201,168,76,0.3)" : "#C9A84C",
            color: saving ? "rgba(0,0,0,0.4)" : "#000",
            fontSize: 14,
            fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.15s ease",
            boxShadow: saving ? "none" : "0 2px 12px rgba(201,168,76,0.3)",
          }}
        >
          {saving ? (
            <>
              <Loader2 style={{ width: 16, height: 16, animation: "spin 0.8s linear infinite" }} />
              שומר...
            </>
          ) : (
            <>
              <Check style={{ width: 16, height: 16 }} />
              אישור ושמירה
            </>
          )}
        </button>
      </div>

      {/* Hidden canvas for export */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { to { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
