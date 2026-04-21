"use client";

// ==========================================
// PinOverlay — HTML pins projected over the 3D canvas
// ==========================================
// Pins are rendered as absolute-positioned DOM elements (not three.js
// sprites) so they can show status badges, timer countdowns, and be
// styled with the site's design system (Ivory Blinds + Rubik labels).
//
// Each frame of the viewer we re-project the pin's world position to
// screen coords; occluded pins (behind a wall) fade out instead of
// disappearing, so the client understands they're still there.

import { useEffect, useMemo, useRef, useState } from "react";
import type { ThreeDViewerHandle, Vec3 } from "./ThreeDViewer";

type AnnotationStatus = "OPEN" | "ANSWERED" | "RESOLVED" | "PINNED";

export type PinData = {
  id: string;
  pos: Vec3;
  status: AnnotationStatus;
  expiresAt: string; // ISO
  label?: string | null;
  index: number; // 1-based numeric badge
};

type Props = {
  viewerRef: React.RefObject<ThreeDViewerHandle>;
  pins: PinData[];
  activeId?: string | null;
  onPinClick: (id: string) => void;
  refreshTick: number; // increments each frame — triggers reposition
};

const STATUS_COLORS: Record<AnnotationStatus, { bg: string; ring: string; text: string }> = {
  OPEN:     { bg: "#C9A84C", ring: "#8B6914", text: "#1A1A1A" }, // gold
  ANSWERED: { bg: "#E8D88A", ring: "#8B6914", text: "#1A1A1A" }, // pale gold
  RESOLVED: { bg: "#B8D4B8", ring: "#6B8E6B", text: "#1A1A1A" }, // mint
  PINNED:   { bg: "#1A1A1A", ring: "#C9A84C", text: "#FAFAF8" }, // ink
};

function formatTimeLeft(expiresAt: string): string | null {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return null;
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours >= 24) return `${Math.floor(hours / 24)}ד'`;
  if (hours >= 1) return `${hours}ש'`;
  const mins = Math.max(1, Math.floor(ms / (60 * 1000)));
  return `${mins}דק'`;
}

export default function PinOverlay({
  viewerRef,
  pins,
  activeId,
  onPinClick,
  refreshTick,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  // We store projected screen positions as an imperative DOM mutation per
  // frame rather than setState — reconciling 50 pins at 60fps via React
  // would tank performance. Refs ride the raf loop.
  const pinElsRef = useRef<Map<string, HTMLElement>>(new Map());

  // Force a re-render whenever the pins array identity changes so the map
  // of HTML elements stays in sync.
  const pinIds = useMemo(() => pins.map((p) => p.id).join("|"), [pins]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    for (const pin of pins) {
      const el = pinElsRef.current.get(pin.id);
      if (!el) continue;
      const { x, y, visible } = viewer.projectToScreen(pin.pos);
      if (!visible) {
        el.style.display = "none";
        continue;
      }
      const occluded = viewer.isPointOccluded(pin.pos);
      el.style.display = "block";
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      el.style.opacity = occluded ? "0.35" : "1";
      el.style.pointerEvents = occluded ? "none" : "auto";
    }
    // refreshTick is the trigger — we intentionally read pins by closure
    // to keep the raf work minimal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick, pinIds]);

  return (
    <div
      ref={overlayRef}
      aria-hidden={false}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
      }}
    >
      {pins.map((pin) => {
        const colors = STATUS_COLORS[pin.status];
        const isActive = pin.id === activeId;
        const timeLeft = pin.status === "PINNED" ? null : formatTimeLeft(pin.expiresAt);
        return (
          <button
            key={pin.id}
            ref={(el) => {
              if (el) pinElsRef.current.set(pin.id, el);
              else pinElsRef.current.delete(pin.id);
            }}
            onClick={() => onPinClick(pin.id)}
            type="button"
            aria-label={`הערה ${pin.index}${pin.label ? `: ${pin.label}` : ""}`}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: colors.bg,
              color: colors.text,
              border: `2px solid ${colors.ring}`,
              boxShadow: isActive
                ? `0 0 0 4px rgba(201, 168, 76, 0.35), 0 2px 8px rgba(0,0,0,0.2)`
                : "0 2px 8px rgba(0,0,0,0.2)",
              fontFamily: "Rubik, system-ui, sans-serif",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              pointerEvents: "auto",
              display: "none", // will be enabled on first projection
              alignItems: "center",
              justifyContent: "center",
              transition: "box-shadow 180ms ease, opacity 120ms ease",
              zIndex: isActive ? 20 : 10,
            }}
          >
            {pin.index}
            {timeLeft && (
              <span
                style={{
                  position: "absolute",
                  top: -8,
                  right: -8,
                  background: "#1A1A1A",
                  color: "#FAFAF8",
                  fontSize: 9,
                  padding: "2px 5px",
                  borderRadius: 8,
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                }}
              >
                {timeLeft}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
