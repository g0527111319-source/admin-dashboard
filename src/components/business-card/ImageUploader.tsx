"use client";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { Upload, X, Loader2, Check, RotateCcw } from "lucide-react";

interface ImageUploaderProps {
    value: string;
    onChange: (url: string) => void;
    label: string;
    /** Shape of preview: "square", "circle", "banner" */
    shape?: "square" | "circle" | "banner";
    folder?: string;
    /** Allow sticker-style transparent images (shows checkerboard bg) */
    sticker?: boolean;
}

export default function ImageUploader({ value, onChange, label, shape = "square", folder = "business-cards", sticker = false }: ImageUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    // Post-upload editor state (circle shape only, e.g. logo)
    const [editorSrc, setEditorSrc] = useState<string | null>(null);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        return () => {
            if (editorSrc) URL.revokeObjectURL(editorSrc);
        };
    }, [editorSrc]);

    const validateFile = (file: File): string | null => {
        if (!file.type.startsWith("image/")) return "יש להעלות קובץ תמונה בלבד";
        if (file.size > 5 * 1024 * 1024) return "הקובץ גדול מדי. מקסימום 5MB";
        return null;
    };

    const uploadBlob = async (blob: Blob, filename: string) => {
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", blob, filename);
            formData.append("folder", folder);
            const controller = new AbortController();
            const timeoutId = window.setTimeout(() => controller.abort(), 25000);
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
                signal: controller.signal,
            });
            window.clearTimeout(timeoutId);
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "שגיאה בהעלאה");
            }
            const { url } = await res.json();
            onChange(url);
            return true;
        } catch (err) {
            if (err instanceof DOMException && err.name === "AbortError") {
                setError("ההעלאה לקחה יותר מדי זמן. נסה תמונה קטנה יותר");
            } else {
                setError(err instanceof Error ? err.message : "שגיאה בהעלאה");
            }
            return false;
        } finally {
            setUploading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const validationError = validateFile(file);
        if (validationError) {
            setError(validationError);
            if (inputRef.current) inputRef.current.value = "";
            return;
        }
        setError("");
        if (shape === "circle") {
            const blobUrl = URL.createObjectURL(file);
            setEditorSrc(blobUrl);
            setScale(1);
            setOffset({ x: 0, y: 0 });
        } else {
            await uploadBlob(file, file.name);
        }
        if (inputRef.current) inputRef.current.value = "";
    };

    const handleApplyEdit = async () => {
        if (!editorSrc) return;
        setError("");
        const img = new window.Image();
        img.src = editorSrc;
        try {
            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error("שגיאה בטעינת התמונה"));
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "שגיאה בטעינת התמונה");
            return;
        }
        const CANVAS_SIZE = 512;
        const PREVIEW_SIZE = 256;
        const canvasScale = CANVAS_SIZE / PREVIEW_SIZE;
        const canvas = document.createElement("canvas");
        canvas.width = CANVAS_SIZE;
        canvas.height = CANVAS_SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            setError("הדפדפן לא תומך בעריכה");
            return;
        }
        const aspect = img.width / img.height;
        let baseW: number, baseH: number;
        if (aspect >= 1) {
            baseW = CANVAS_SIZE;
            baseH = CANVAS_SIZE / aspect;
        } else {
            baseH = CANVAS_SIZE;
            baseW = CANVAS_SIZE * aspect;
        }
        const dw = baseW * scale;
        const dh = baseH * scale;
        const cx = CANVAS_SIZE / 2 + offset.x * canvasScale;
        const cy = CANVAS_SIZE / 2 + offset.y * canvasScale;
        ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
        if (!blob) {
            setError("שגיאה בעיבוד התמונה");
            return;
        }
        URL.revokeObjectURL(editorSrc);
        setEditorSrc(null);
        await uploadBlob(blob, "logo.png");
    };

    const handleCancelEdit = () => {
        if (editorSrc) URL.revokeObjectURL(editorSrc);
        setEditorSrc(null);
    };

    const handleRemove = () => {
        onChange("");
        setError("");
    };

    const dragRef = useRef({ dragging: false, startX: 0, startY: 0, startOX: 0, startOY: 0 });
    const onDragStart = (e: React.PointerEvent) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        dragRef.current = {
            dragging: true,
            startX: e.clientX,
            startY: e.clientY,
            startOX: offset.x,
            startOY: offset.y,
        };
    };
    const onDragMove = (e: React.PointerEvent) => {
        if (!dragRef.current.dragging) return;
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        setOffset({ x: dragRef.current.startOX + dx, y: dragRef.current.startOY + dy });
    };
    const onDragEnd = (e: React.PointerEvent) => {
        dragRef.current.dragging = false;
        try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { }
    };

    const previewClass = shape === "circle"
        ? "w-24 h-24 rounded-full"
        : shape === "banner"
            ? "w-full aspect-[3/1] rounded-lg"
            : "w-24 h-24 rounded-lg";

    const checkerboardStyle = sticker ? {
        backgroundImage: `linear-gradient(45deg, #e0e0e0 25%, transparent 25%),
          linear-gradient(-45deg, #e0e0e0 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #e0e0e0 75%),
          linear-gradient(-45deg, transparent 75%, #e0e0e0 75%)`,
        backgroundSize: "12px 12px",
        backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0px",
    } : {};

    const acceptTypes = sticker
        ? "image/*,.png,.webp,.svg,.gif,.jpg,.jpeg,.sticker"
        : ".png,.webp,.svg,.jpg,.jpeg,image/png,image/webp,image/svg+xml,image/jpeg";

    return (<div>
      <label className="block text-text-primary text-xs font-medium mb-1.5">
        {label}
        {sticker && <span className="text-text-muted font-normal mr-1">(PNG/SVG/WebP עם רקע שקוף)</span>}
      </label>

      {value ? (
        /* Preview with remove button */
        <div className="relative inline-block group">
          <div className={`${previewClass} relative overflow-hidden border-2 border-border-subtle`} style={checkerboardStyle}>
            <Image src={value} alt="" fill unoptimized className="object-contain" onError={(e) => {
                (e.target as HTMLImageElement).src = "";
                (e.target as HTMLImageElement).style.display = "none";
            }}/>
          </div>
          <button type="button" onClick={handleRemove} className="absolute -top-2 -left-2 w-6 h-6 bg-red-500 text-white rounded-full
                       flex items-center justify-center opacity-0 group-hover:opacity-100
                       transition-opacity shadow-sm">
            <X className="w-3.5 h-3.5"/>
          </button>
          <button type="button" onClick={() => inputRef.current?.click()} className="absolute bottom-1 left-1 px-2 py-1 bg-black/60 text-white rounded text-[10px]
                       opacity-0 group-hover:opacity-100 transition-opacity">{"החלף"}</button>
        </div>) : (
        /* Upload button */
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className={`${shape === "banner" ? "w-full aspect-[3/1]" : "w-24 h-24"} ${shape === "circle" ? "rounded-full" : "rounded-lg"} border-2 border-dashed border-border-subtle bg-bg-surface
            hover:border-gold/50 hover:bg-gold/5 transition-all
            flex flex-col items-center justify-center gap-1 cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed`}>
          {uploading ? (<Loader2 className="w-5 h-5 text-gold animate-spin"/>) : (<>
              <Upload className="w-5 h-5 text-text-muted"/>
              <span className="text-text-muted text-[10px]">{sticker ? "העלאת מדבקה/לוגו" : "העלאת תמונה"}</span>
            </>)}
        </button>)}

      <input ref={inputRef} type="file" accept={acceptTypes} onChange={handleUpload} className="hidden"/>

      {error && (<p className="text-red-500 text-[10px] mt-1">{error}</p>)}

      {editorSrc && (
        <div
          className="fixed inset-0 z-[10002] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          dir="rtl"
          onClick={(e) => { if (e.target === e.currentTarget && !uploading) handleCancelEdit(); }}
        >
          <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 w-full max-w-sm shadow-2xl">
            <h3 className="font-heading font-bold text-text-primary text-center mb-1">התאמת הלוגו</h3>
            <p className="text-[11px] text-text-muted text-center mb-4">גררי כדי להזיז · החליקי את הסליידר לגודל</p>
            <div
              className="relative w-64 h-64 mx-auto rounded-full overflow-hidden border-2 border-gold cursor-move select-none"
              style={{ ...checkerboardStyle, touchAction: "none" }}
              onPointerDown={onDragStart}
              onPointerMove={onDragMove}
              onPointerUp={onDragEnd}
              onPointerCancel={onDragEnd}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={editorSrc}
                alt=""
                draggable={false}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                  transformOrigin: "center",
                  userSelect: "none",
                  pointerEvents: "none",
                }}
              />
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                <span>גודל</span>
                <span>{Math.round(scale * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.3}
                max={3}
                step={0.02}
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full accent-gold"
              />
              <button
                type="button"
                onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }}
                className="mt-2 text-[11px] text-text-muted hover:text-gold inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> איפוס
              </button>
            </div>
            <div className="flex items-center gap-2 mt-5">
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={uploading}
                className="flex-1 px-4 py-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-surface-2 disabled:opacity-50"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleApplyEdit}
                disabled={uploading}
                className="flex-1 px-4 py-2 rounded-lg bg-gold hover:bg-gold-dark text-white font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                שמירה
              </button>
            </div>
          </div>
        </div>
      )}
    </div>);
}
