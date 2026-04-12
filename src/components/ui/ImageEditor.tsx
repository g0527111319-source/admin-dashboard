"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

// ==========================================
// Image Editor — Crop, Rotate, Aspect Ratio
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
  const [aspect, setAspect] = useState<number | undefined>(initialAspect);
  const [saving, setSaving] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load file into data URL
  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => setImgSrc(reader.result as string);
    reader.readAsDataURL(file);
  }, [file]);

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
    setRotation((prev) => (prev + degrees) % 360);
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
  }, [completedCrop, rotation, file, onSave, maxOutputWidth, maxOutputHeight]);

  if (!imgSrc) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
        טוען תמונה...
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Aspect ratio buttons */}
        {aspectRatios.map((opt) => (
          <button
            key={opt.label}
            onClick={() => handleAspectChange(opt.value)}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "none",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              background: aspect === opt.value ? "#C9A84C" : "rgba(255,255,255,0.15)",
              color: aspect === opt.value ? "#000" : "#fff",
              transition: "all 0.2s",
            }}
          >
            {opt.label}
          </button>
        ))}

        <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.2)", margin: "0 4px" }} />

        {/* Rotation buttons */}
        <button
          onClick={() => handleRotate(-90)}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            border: "none",
            background: "rgba(255,255,255,0.15)",
            color: "#fff",
            cursor: "pointer",
            fontSize: 16,
          }}
          title="סיבוב שמאלה"
        >
          ↺
        </button>
        <button
          onClick={() => handleRotate(90)}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            border: "none",
            background: "rgba(255,255,255,0.15)",
            color: "#fff",
            cursor: "pointer",
            fontSize: 16,
          }}
          title="סיבוב ימינה"
        >
          ↻
        </button>
      </div>

      {/* Crop area */}
      <div
        style={{
          maxWidth: "85vw",
          maxHeight: "65vh",
          overflow: "hidden",
          borderRadius: 12,
          background: "#111",
        }}
      >
        <ReactCrop
          crop={crop}
          onChange={(c) => setCrop(c)}
          onComplete={(c) => setCompletedCrop(c)}
          aspect={aspect}
          style={{ maxHeight: "65vh" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={imgSrc}
            alt="edit"
            onLoad={onImageLoad}
            style={{
              maxWidth: "85vw",
              maxHeight: "65vh",
              transform: `rotate(${rotation}deg)`,
              transition: "transform 0.3s ease",
            }}
          />
        </ReactCrop>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button
          onClick={onCancel}
          style={{
            padding: "10px 28px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.3)",
            background: "transparent",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ביטול
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "10px 28px",
            borderRadius: 10,
            border: "none",
            background: saving ? "#999" : "#C9A84C",
            color: saving ? "#ccc" : "#000",
            fontSize: 14,
            fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "שומר..." : "שמור ושלח"}
        </button>
      </div>

      {/* Hidden canvas for export */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
