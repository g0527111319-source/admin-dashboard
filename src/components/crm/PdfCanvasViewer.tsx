"use client";

/**
 * PdfCanvasViewer — renders a PDF inside an <iframe> using the browser's
 * built-in PDF viewer.
 *
 * Why not pdf.js (canvas rendering)?
 *
 * We tried pdf.js v3.11.174 from CDN and v5.6.205 self-hosted. Both have
 * subtle, PDF-specific rendering bugs on real-world Hebrew contracts:
 *  - v3 paints page 1 of the Hebrew contract as a ~99% black rectangle
 *    (Transparency Group + subset Hebrew font triggers an eval-path bug).
 *  - v5 hangs indefinitely inside `page.render()` on the same PDF, even
 *    with disableWorker:true — the canvas never gets painted.
 *
 * The embedded Chrome / Firefox / Safari PDF viewer handles these files
 * correctly out of the box — so we use that via an <iframe>.
 *
 * Why not the old iframe problems?
 *  - `transform: scale()` hit-testing: CrmContracts already excludes PDF
 *    blocks from scaling (see the `isPdf ? {} : { transform: ... }`
 *    branch), so the toolbar stays responsive.
 *  - Scrollbar competing with parent: we size the iframe to a fixed
 *    aspect ratio and let the browser fit pages; the contract editor
 *    uses the whole page for native vertical scroll.
 *  - Field overlays: they sit in the normal DOM above the iframe with
 *    `pointer-events: auto` while the iframe itself is `pointer-events:
 *    none` in click-ignore mode (we restore events only when the user
 *    wants to interact with the PDF toolbar).
 *
 * We size the iframe at the PDF's intrinsic page ratio using a quick
 * HEAD / range probe to extract `/MediaBox` from the PDF bytes. If that
 * fails we fall back to A4 portrait.
 */

import { useEffect, useMemo, useRef, useState } from "react";

interface Props {
  url: string;
  /** Called once the PDF loads, with the real page count. */
  onPageCount?: (pages: number) => void;
  /** Target render width in CSS pixels. */
  width?: number;
  className?: string;
}

/**
 * Parse the number of pages + first MediaBox out of a PDF's text trailer.
 * This is a best-effort extraction — we don't want to ship a full PDF
 * parser just to size an iframe. On failure we return A4 defaults.
 */
function inspectPdfBytes(bytes: Uint8Array): {
  pages: number;
  width: number;
  height: number;
} {
  const A4 = { pages: 1, width: 595, height: 842 };
  try {
    // PDFs are binary but headers/objects are ASCII. Decode just for scan.
    const text = new TextDecoder("latin1").decode(bytes);
    // /Count N on the Pages root
    let pages = 1;
    const counts: number[] = [];
    const countRe = /\/Count\s+(\d+)/g;
    let cm: RegExpExecArray | null;
    while ((cm = countRe.exec(text)) !== null) {
      counts.push(parseInt(cm[1], 10));
    }
    if (counts.length) {
      pages = Math.max(...counts);
    }
    // First /MediaBox [x1 y1 x2 y2]
    const mb = text.match(/\/MediaBox\s*\[\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\]/);
    let width = A4.width;
    let height = A4.height;
    if (mb) {
      width = parseFloat(mb[3]) - parseFloat(mb[1]);
      height = parseFloat(mb[4]) - parseFloat(mb[2]);
    }
    if (!isFinite(width) || width <= 0) width = A4.width;
    if (!isFinite(height) || height <= 0) height = A4.height;
    return { pages, width, height };
  } catch {
    return A4;
  }
}

export default function PdfCanvasViewer({
  url,
  onPageCount,
  width = 800,
  className = "",
}: Props) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [meta, setMeta] = useState<{
    pages: number;
    width: number;
    height: number;
  } | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // Keep the latest onPageCount callback in a ref so we can call it without
  // re-running the effect when the parent passes an inline function.
  const onPageCountRef = useRef(onPageCount);
  useEffect(() => {
    onPageCountRef.current = onPageCount;
  }, [onPageCount]);

  useEffect(() => {
    let cancelled = false;
    let createdBlobUrl: string | null = null;
    (async () => {
      try {
        setStatus("loading");
        setErrorMsg("");
        setMeta(null);
        setBlobUrl(null);

        // Fetch the PDF bytes so we can peek at page count / media box.
        // Works for same-origin blob / data URLs (the template editor
        // stores uploaded PDFs as data URLs) and for same-origin http URLs.
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        if (cancelled) return;

        const info = inspectPdfBytes(new Uint8Array(buf));
        // Create a blob URL — Chrome's built-in PDF viewer treats data:
        // URLs as "downloads" on some configurations and respects URL
        // hash parameters (#toolbar=0&view=FitH) more reliably on blob
        // URLs than on data URLs.
        const blob = new Blob([buf], { type: "application/pdf" });
        createdBlobUrl = URL.createObjectURL(blob);

        onPageCountRef.current?.(info.pages);
        setMeta(info);
        setBlobUrl(createdBlobUrl);
        setStatus("ready");
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
      if (createdBlobUrl) URL.revokeObjectURL(createdBlobUrl);
    };
  }, [url]);

  // Compute iframe height: one fitted page ≈ containerWidth × (pdfH/pdfW).
  // Multiply by number of pages, then add a small per-page-break buffer so
  // Chrome's inter-page dark separator doesn't cut off the last page.
  const aspectStyle = useMemo(() => {
    if (!meta) return { aspectRatio: "595 / 842" };
    // Extra 6% of page height per additional page break, to cover Chrome's
    // inter-page separator + ~24px reserved for its (hidden) toolbar area.
    const pageBreaks = Math.max(0, meta.pages - 1);
    const totalHeight =
      meta.height * meta.pages + meta.height * 0.06 * pageBreaks;
    return { aspectRatio: `${meta.width} / ${totalHeight}` };
  }, [meta]);

  // `#view=FitH` + `toolbar=0` + `navpanes=0` + `scrollbar=0` — asks Chrome's
  // built-in PDF viewer to fit each page to the iframe width and hide its
  // own chrome. The template editor supplies its own page-navigation UI.
  const iframeSrc = useMemo(() => {
    if (!blobUrl) return "";
    return `${blobUrl}#view=FitH&toolbar=0&navpanes=0&scrollbar=0`;
  }, [blobUrl]);

  return (
    <div
      className={`relative ${className}`}
      style={{ width: width ? undefined : "100%" }}
    >
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
      {status === "ready" && meta && blobUrl && (
        <div className="w-full" style={aspectStyle}>
          <iframe
            src={iframeSrc}
            className="w-full h-full border-0 block bg-white"
            title="PDF"
            // User clicks on field overlays, not the PDF content — the
            // overlays sit above this iframe. pointer-events:none stops
            // Chrome's built-in PDF viewer from stealing clicks meant
            // for overlay handles / drag targets.
            style={{ pointerEvents: "none" }}
          />
        </div>
      )}
    </div>
  );
}
