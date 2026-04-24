"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PointerHandler = (e: React.PointerEvent<HTMLElement>) => void;

interface DraggableYResult {
  offsetY: number;
  wasDragged: boolean;
  onPointerDown: PointerHandler;
  onPointerMove: PointerHandler;
  onPointerUp: PointerHandler;
  onPointerCancel: PointerHandler;
  resetDragFlag: () => void;
}

const DRAG_THRESHOLD = 6;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function useDraggableY(storageKey: string, maxOffset = 400): DraggableYResult {
  const [offsetY, setOffsetY] = useState(0);
  const offsetYRef = useRef(0);
  const baselineRef = useRef(0);
  const startYRef = useRef(0);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const [wasDragged, setWasDragged] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const n = Number(saved);
        if (Number.isFinite(n)) {
          const v = clamp(n, 0, maxOffset);
          setOffsetY(v);
          offsetYRef.current = v;
        }
      }
    } catch {}
  }, [storageKey, maxOffset]);

  useEffect(() => {
    offsetYRef.current = offsetY;
  }, [offsetY]);

  const onPointerDown = useCallback<PointerHandler>((e) => {
    draggingRef.current = true;
    movedRef.current = false;
    startYRef.current = e.clientY;
    baselineRef.current = offsetYRef.current;
    setWasDragged(false);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  }, []);

  const onPointerMove = useCallback<PointerHandler>((e) => {
    if (!draggingRef.current) return;
    const delta = startYRef.current - e.clientY;
    if (Math.abs(delta) > DRAG_THRESHOLD) movedRef.current = true;
    const next = clamp(baselineRef.current + delta, 0, maxOffset);
    offsetYRef.current = next;
    setOffsetY(next);
  }, [maxOffset]);

  const finish = useCallback<PointerHandler>((e) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    if (movedRef.current) {
      setWasDragged(true);
      try {
        localStorage.setItem(storageKey, String(offsetYRef.current));
      } catch {}
    }
  }, [storageKey]);

  const resetDragFlag = useCallback(() => setWasDragged(false), []);

  return {
    offsetY,
    wasDragged,
    onPointerDown,
    onPointerMove,
    onPointerUp: finish,
    onPointerCancel: finish,
    resetDragFlag,
  };
}
