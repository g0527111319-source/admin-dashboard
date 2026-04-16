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
 *    is a separate document with its own layout.
 *
 * By rendering to canvases we:
 *  - See all pages stacked vertically by default (natural scroll).
 *  - Keep the whole viewer inside the normal DOM (so field % positions
 *    stay aligned and clicking works everywhere).
 *  - Report back the real page count so the parent can size overlays.
 *
 * Why self-host pdf.js (from /public/pdfjs)?
 *
 * pdf.js v5 is ESM-only and its worker is a module worker. Loading it from
 * a CDN (cdnjs, jsdelivr, unpkg — all tried) fails in one of two ways:
 *  - `disableWorker: true` hangs forever on complex PDFs (e.g. Hebrew
 *    contracts with transparency groups).
 *  - Module workers have stricter cross-origin rules than classic workers
 *    and silently fail to start, so rendering just hangs.
 *
 * We previously shipped pdf.js v3.11.174 via a classic <script> tag from
 * cdnjs — that *loaded* fine but had a rendering bug where pages with a
 * Transparency Group + embedded subset fonts (exactly what the Hebrew
 * contract uses) painted as a ~99% black rectangle.
 *
 * Self-hosting v5 from /public/pdfjs (copied there at build time by
 * scripts/copy-pdfjs.mjs) gives us:
 *  - Same-origin module worker (no CORS weirdness).
 *  - A modern pdf.js that renders the Hebrew contract correctly.
 *  - cmaps + standard_fonts locally, so non-Latin glyphs resolve.
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

// Path prefix where scripts/copy-pdfjs.mjs puts the pdf.js runtime.
const PDFJS_BASE = "/pdfjs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfJs = any;

let pdfjsPromise: Promise<PdfJs> | null = null;

async function getPdfjs(): Promise<PdfJs> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      // Dynamic import with a runtime-computed URL: `webpackIgnore: true`
      // tells Next.js's webpack to emit a raw `import()` call instead of
      // trying to resolve this at build time (which would fail — the file
      // only exists at runtime in /public).
      const modUrl = `${PDFJS_BASE}/pdf.min.mjs`;
      const lib = await import(/* webpackIgnore: true */ modUrl);
      lib.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}/pdf.worker.min.mjs`;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let doc: any = null;

    (async () => {
      try {
        setStatus("loading");
        const pdfjs = await getPdfjs();
        if (cancelled) return;

        // Pass CMap + standard font URLs so pdf.js can decode non-Latin
        // character encodings (Hebrew, Arabic, CJK...). Without these, PDFs
        // that use CID-keyed fonts render as broken / disconnected glyphs.
        doc = await pdfjs.getDocument({
          url,
          cMapUrl: `${PDFJS_BASE}/cmaps/`,
          cMapPacked: true,
          standardFontDataUrl: `${PDFJS_BASE}/standard_fonts/`,
        }).promise;
        if (cancelled) {
          doc.destroy();
          return;
        }

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
          const scale =
            (width / baseViewport.width) * (window.devicePixelRatio || 1);
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

          // Explicit white page background — PDFs with transparency groups
          // don't declare a paper color and would otherwise show as
          // transparent / black on the canvas default.
          await page.render({
            canvasContext: ctx,
            viewport,
            canvas,
            background: "rgba(255, 255, 255, 1)",
          }).promise;
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
      if (doc) {
        try {
          doc.destroy();
        } catch {
          // Ignore — doc may already be torn down.
        }
      }
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
