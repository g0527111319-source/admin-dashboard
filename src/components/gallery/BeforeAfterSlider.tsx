"use client";

// BeforeAfterSlider — lightweight vanilla before/after comparison slider.
// No external deps. Keyboard + mouse + touch support.
//
// Pairs of images are derived from DesignerProjectImage captions: when a
// caption starts with "לפני" it's a before; "אחרי" is an after. We pair by
// index: the first "לפני" with the first "אחרי", etc. See
// ProjectDetailClient for the pairing logic.

import { useCallback, useEffect, useRef, useState } from "react";

export type BeforeAfterPair = {
  beforeUrl: string;
  afterUrl: string;
  beforeCaption?: string | null;
  afterCaption?: string | null;
};

function proxyImageUrl(url: string): string {
  if (
    url.includes("drive.google.com") ||
    url.includes("instagram.com") ||
    url.includes("cdninstagram.com") ||
    url.includes("photos.app.goo.gl") ||
    url.includes("photos.google.com")
  ) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

function Slider({ pair }: { pair: BeforeAfterPair }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState(50); // 0..100 (% from right, since RTL)
  const draggingRef = useRef(false);

  const setFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(pct);
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    draggingRef.current = true;
    setFromClientX(e.clientX);
  };
  const onTouchStart = (e: React.TouchEvent) => {
    draggingRef.current = true;
    if (e.touches[0]) setFromClientX(e.touches[0].clientX);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      setFromClientX(e.clientX);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!draggingRef.current) return;
      if (e.touches[0]) setFromClientX(e.touches[0].clientX);
    };
    const onUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [setFromClientX]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") setPosition((p) => Math.max(0, p - 5));
    else if (e.key === "ArrowRight") setPosition((p) => Math.min(100, p + 5));
  };

  // In RTL we want the "after" (אחרי) on the right and "before" (לפני) on
  // the left. clip-path: inset(top right bottom left) — we clip the "after"
  // layer from the right so moving the handle reveals more after going
  // right-ward. Using a left-offset inset() keeps the visual intuition simple
  // regardless of document direction.
  const afterClip = `inset(0 0 0 ${position}%)`;

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-border-subtle bg-bg-surface select-none"
      ref={containerRef}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      role="slider"
      tabIndex={0}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(position)}
      aria-label="השוואת לפני ואחרי"
      onKeyDown={onKey}
      style={{ aspectRatio: "16/10", cursor: "ew-resize" }}
    >
      {/* Before (base) */}
      <img
        src={proxyImageUrl(pair.beforeUrl)}
        alt={pair.beforeCaption || "לפני"}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        draggable={false}
      />
      {/* After (clipped) */}
      <img
        src={proxyImageUrl(pair.afterUrl)}
        alt={pair.afterCaption || "אחרי"}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        draggable={false}
        style={{ clipPath: afterClip, WebkitClipPath: afterClip }}
      />

      {/* Labels */}
      <div
        className="absolute top-3 px-2.5 py-1 rounded-full bg-black/65 text-white text-[11px] font-semibold tracking-wide pointer-events-none"
        style={{ right: 12 }}
      >
        לפני
      </div>
      <div
        className="absolute top-3 px-2.5 py-1 rounded-full bg-gold text-white text-[11px] font-semibold tracking-wide pointer-events-none"
        style={{ left: 12 }}
      >
        אחרי
      </div>

      {/* Handle */}
      <div
        className="absolute top-0 bottom-0 pointer-events-none"
        style={{ left: `${position}%`, transform: "translateX(-50%)" }}
      >
        <div className="w-[2px] h-full bg-white/85 shadow-[0_0_12px_rgba(0,0,0,0.35)]" />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white shadow-lg grid place-items-center"
          aria-hidden
        >
          <span className="text-gold-dim text-sm font-bold leading-none">↔</span>
        </div>
      </div>
    </div>
  );
}

export default function BeforeAfterSlider({
  pairs,
}: {
  pairs: BeforeAfterPair[];
}) {
  if (!pairs || pairs.length === 0) return null;

  return (
    <div className="flex flex-col gap-5">
      {pairs.map((pair, idx) => (
        <div key={idx} className="space-y-2">
          <Slider pair={pair} />
          {(pair.beforeCaption || pair.afterCaption) && (
            <p className="text-[12.5px] text-text-muted text-center">
              {pair.afterCaption || pair.beforeCaption}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
