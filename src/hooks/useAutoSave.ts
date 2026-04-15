"use client";

/**
 * useAutoSave — debounced auto-save for long forms (contracts, quotes, notes).
 *
 * Contract:
 * - Pass the current `value` and a `save` function that persists it server-side.
 * - On every change, we debounce (default 2s) and call `save`.
 * - Returns `{ status, savedAt, saveNow }`.
 * - Status values: "idle" | "saving" | "saved" | "error".
 * - `saveNow` forces an immediate flush (e.g. on blur, or when the user navigates away).
 *
 * Quality guarantees:
 * - Never saves the same value twice in a row (shallow JSON compare).
 * - Skips the FIRST render so we don't POST on mount before the user did anything.
 * - Cancels pending timer on unmount to avoid setState-after-unmount warnings.
 * - Saves on `beforeunload` as a best-effort so closing the tab doesn't lose work.
 */

import { useEffect, useRef, useState, useCallback } from "react";

export type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

export interface UseAutoSaveOptions<T> {
  value: T;
  /** The server call that actually persists. Resolve on success; throw on failure. */
  save: (value: T) => Promise<void>;
  /** Debounce delay in ms. Default: 2000. */
  delay?: number;
  /** Skip auto-saving entirely (e.g. when editing is disabled). Default: false. */
  disabled?: boolean;
}

export function useAutoSave<T>({
  value,
  save,
  delay = 2000,
  disabled = false,
}: UseAutoSaveOptions<T>) {
  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const lastSavedRef = useRef<string>("");
  const firstRenderRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  const valueRef = useRef(value);

  saveRef.current = save;
  valueRef.current = value;

  const flush = useCallback(async (): Promise<void> => {
    const snapshot = JSON.stringify(valueRef.current);
    if (snapshot === lastSavedRef.current) return; // nothing new
    setStatus("saving");
    try {
      await saveRef.current(valueRef.current);
      lastSavedRef.current = snapshot;
      setSavedAt(new Date());
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (disabled) return;
    // Don't auto-save on mount; only after the user edits.
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      lastSavedRef.current = JSON.stringify(value);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      flush();
    }, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, delay, disabled, flush]);

  // Best-effort save when tab closes
  useEffect(() => {
    const handler = () => {
      if (disabled) return;
      const snapshot = JSON.stringify(valueRef.current);
      if (snapshot !== lastSavedRef.current) {
        // Fire-and-forget; we don't block unload
        void saveRef.current(valueRef.current).catch(() => {});
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [disabled]);

  return {
    status,
    savedAt,
    /** Force an immediate save — useful on blur/submit. */
    saveNow: flush,
  };
}
