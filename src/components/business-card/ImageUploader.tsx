"use client";
import Image from "next/image";
import { useState, useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
interface ImageUploaderProps {
    value: string;
    onChange: (url: string) => void;
    label: string;
    /** Shape of preview: "square", "circle", "banner" */
    shape?: "square" | "circle" | "banner";
    folder?: string;
}
export default function ImageUploader({ value, onChange, label, shape = "square", folder = "business-cards", }: ImageUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        // Client-side validation
        if (!file.type.startsWith("image/")) {
            setError("\u05D9\u05E9 \u05DC\u05D4\u05E2\u05DC\u05D5\u05EA \u05E7\u05D5\u05D1\u05E5 \u05EA\u05DE\u05D5\u05E0\u05D4 \u05D1\u05DC\u05D1\u05D3");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setError("\u05D4\u05E7\u05D5\u05D1\u05E5 \u05D2\u05D3\u05D5\u05DC \u05DE\u05D3\u05D9. \u05DE\u05E7\u05E1\u05D9\u05DE\u05D5\u05DD 5MB");
            return;
        }
        setError("");
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("folder", folder);
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05E2\u05DC\u05D0\u05D4");
            }
            const { url } = await res.json();
            onChange(url);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05E2\u05DC\u05D0\u05D4");
        }
        finally {
            setUploading(false);
            // Reset input so same file can be re-uploaded
            if (inputRef.current)
                inputRef.current.value = "";
        }
    };
    const handleRemove = () => {
        onChange("");
        setError("");
    };
    const previewClass = shape === "circle"
        ? "w-24 h-24 rounded-full"
        : shape === "banner"
            ? "w-full aspect-[3/1] rounded-lg"
            : "w-24 h-24 rounded-lg";
    return (<div>
      <label className="block text-text-primary text-xs font-medium mb-1.5">
        {label}
      </label>

      {value ? (
        /* Preview with remove button */
        <div className="relative inline-block group">
          <div className={`${previewClass} relative overflow-hidden border-2 border-border-subtle bg-bg-surface`}>
            <Image src={value} alt="" fill unoptimized className="object-cover" onError={(e) => {
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
                       opacity-0 group-hover:opacity-100 transition-opacity">{"\u05D4\u05D7\u05DC\u05E3"}</button>
        </div>) : (
        /* Upload button */
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className={`${shape === "banner" ? "w-full aspect-[3/1]" : "w-24 h-24"} ${shape === "circle" ? "rounded-full" : "rounded-lg"} border-2 border-dashed border-border-subtle bg-bg-surface
            hover:border-gold/50 hover:bg-gold/5 transition-all
            flex flex-col items-center justify-center gap-1 cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed`}>
          {uploading ? (<Loader2 className="w-5 h-5 text-gold animate-spin"/>) : (<>
              <Upload className="w-5 h-5 text-text-muted"/>
              <span className="text-text-muted text-[10px]">{"\u05D4\u05E2\u05DC\u05D0\u05EA \u05EA\u05DE\u05D5\u05E0\u05D4"}</span>
            </>)}
        </button>)}

      <input ref={inputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden"/>

      {error && (<p className="text-red-500 text-[10px] mt-1">{error}</p>)}
    </div>);
}


