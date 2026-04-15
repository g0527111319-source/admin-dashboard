"use client";

/**
 * PdfCanvasViewer — renders a PDF as a stack of canvas images using pdf.js.
 *
 * Why not an <iframe>?
 * Chrome's built-in PDF viewer has several issues when embedded:
 *  - It has its own scrollbar/page-nav UI that competes with the parent page.
 *  - A `transform: scale()` anywhere up the tree breaks its hit-testing —
 *    the toolbar and page navigation stop responding.
 *  - We can't place field overlays cleanly inside the PDF since the iframe
 *    is a separate document.
 *
 * By rendering to canvases we:
 *  - See all pages stacked vertically by default (natural scroll).
 *  - Keep the whole viewer inside the normal DOM (so field % positions
 *    stay aligned and clicking works everywhere).
 *  - Report back the real page count so the parent can size overlays.
 */

import { useEffect, useRef, useState } from "react";

interface Props {
  url: string;
  /** Called once the PDF loads, with the real page count. */
  onPageCount?: (pages: number) => void;
  /** Target render width in CSS pixels (canvases scale to this). */
  width?: number;
  className?: string;
}

/**
 * We load pdf.js from a CDN at runtime instead of importing it through
 * webpack. The npm build uses modern JS features (private fields, ESM worker
 * bootstrapping) that the Next.js dev bundler does not handle cleanly —
 * importing it ended up throwing `Object.defineProperty called on non-object`
 * at runtime.
 *
 * Script-tag injection of the UMD build is bulletproof: it runs in the page
 * context, matches the worker version exactly, and needs zero bundler setup.
 */
// v3.11.174 is the latest pdf.js release that still ships a classic UMD
// script build (pdf.min.js) — newer releases are ESM-only and can't be loaded
// via a plain <script> tag without import-maps.
const PDFJS_VERSION = "3.11.174";
const PDFJS_CDN_BASE = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfJs = any;

let pdfjsPromise: Promise<PdfJs> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-pdfjs="${src}"]`
    );
    if (existing) {
      if (existing.dataset.loaded === "1") return resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error(`load ${src}`)));
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.pdfjs = src;
    s.addEventListener("load", () => {
      s.dataset.loaded = "1";
      resolve();
    });
    s.addEventListener("error", () => reject(new Error(`load ${src}`)));
    document.head.appendChild(s);
  });
}

async function getPdfjs(): Promise<PdfJs> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      await loadScript(`${PDFJS_CDN_BASE}/pdf.min.js`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lib = (window as any).pdfjsLib;
      if (!lib) throw new Error("pdf.js failed to initialize");
      lib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN_BASE}/pdf.worker.min.js`;
      return lib;
    })();
  }
  return pdfjsPromise;
}

export default function PdfCanvasViewer({
  url,
  onPageCount,
  width = 800,
  className = "",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Keep the latest onPageCount callback in a ref so we can call it without
  // re-running the render effect when the parent passes an inline function.
  // (Inline functions are a fresh reference every render; depending on them
  // creates an infinite reload loop.)
  const onPageCountRef = useRef(onPageCount);
  useEffect(() => {
    onPageCountRef.current = onPageCount;
  }, [onPageCount]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setStatus("loading");
        const pdfjs = await getPdfjs();
        if (cancelled) return;

        const doc = await pdfjs.getDocument(url).promise;
        if (cancelled) { doc.destroy(); return; }

        onPageCountRef.current?.(doc.numPages);

        const container = containerRef.current;
        if (!container) return;
        // Clear any previous render.
        container.innerHTML = "";

        for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
          const page = await doc.getPage(pageNum);
          if (cancelled) return;

          // Render at a high enough scale for clarity on retina screens,
          // then down-display via CSS width.
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = (width / baseViewport.width) * (window.devicePixelRatio || 1);
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.display = "block";
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          // Canvas itself is background — user clicks go to field overlays
          // stacked above it.
          canvas.style.pointerEvents = "none";
          canvas.style.userSelect = "none";

          const ctx = canvas.getContext("2d");
          if (!ctx) continue;

          const pageWrapper = document.createElement("div");
          pageWrapper.style.marginBottom = "8px";
          pageWrapper.appendChild(canvas);
          container.appendChild(pageWrapper);

          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
          if (cancelled) return;
        }

        if (!cancelled) setStatus("ready");
      } catch (err) {
        console.error("PdfCanvasViewer error:", err);
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : "שגיאת טעינה");
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url, width]);

  return (
    <div className={`relative ${className}`}>
      {status === "loading" && (
        <div className="flex flex-col items-center justify-center py-16 text-text-muted">
          <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-sm">טוען PDF...</span>
        </div>
      )}
      {status === "error" && (
        <div className="text-center py-12 text-sm text-red-500">
          שגיאה בטעינת PDF: {errorMsg}
        </div>
      )}
      <div ref={containerRef} />
    </div>
  );
}
