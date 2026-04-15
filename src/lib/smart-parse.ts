/**
 * Smart text parsing — detect phones, emails, URLs, and dates inside
 * free-text notes (CRM notes, WhatsApp messages, portal chat).
 *
 * The output is "hints" — the designer is always asked before we
 * persist anything new. We never auto-add contacts silently.
 */

const PHONE_ISRAEL = /(?:\+972[-\s]?|0)(?:[23489]|5[0-9]|7[2-9])[-\s]?\d{3}[-\s]?\d{4}/g;
const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const URL_RE = /\bhttps?:\/\/[^\s<>"')]+/gi;

export type SmartHint =
  | { kind: "phone"; raw: string; normalized: string }
  | { kind: "email"; raw: string; normalized: string }
  | { kind: "url"; raw: string };

/**
 * Normalize an Israeli phone into E.164-ish format.
 * - "050-123-4567" → "+972501234567"
 * - "+972 50 123 4567" → "+972501234567"
 */
export function normalizeIsraeliPhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+972")) return digits;
  if (digits.startsWith("00972")) return "+" + digits.slice(2);
  if (digits.startsWith("972")) return "+" + digits;
  if (digits.startsWith("0")) return "+972" + digits.slice(1);
  return digits;
}

/** Scan free text and return an array of unique hints. */
export function parseSmartHints(text: string): SmartHint[] {
  if (!text) return [];
  const seen = new Set<string>();
  const hints: SmartHint[] = [];

  for (const match of Array.from(text.matchAll(PHONE_ISRAEL))) {
    const raw = match[0];
    const normalized = normalizeIsraeliPhone(raw);
    const key = `phone:${normalized}`;
    if (seen.has(key)) continue;
    seen.add(key);
    hints.push({ kind: "phone", raw, normalized });
  }

  for (const match of Array.from(text.matchAll(EMAIL))) {
    const raw = match[0];
    const normalized = raw.toLowerCase();
    const key = `email:${normalized}`;
    if (seen.has(key)) continue;
    seen.add(key);
    hints.push({ kind: "email", raw, normalized });
  }

  for (const match of Array.from(text.matchAll(URL_RE))) {
    const raw = match[0];
    const key = `url:${raw}`;
    if (seen.has(key)) continue;
    seen.add(key);
    hints.push({ kind: "url", raw });
  }

  return hints;
}

/**
 * Turn plain text into safe JSX with clickable hints highlighted.
 * (The caller renders the returned tokens — this module stays
 * dependency-free for testability.)
 */
export function tokenize(text: string): Array<{ text: string; hint?: SmartHint }> {
  const hints = parseSmartHints(text);
  if (hints.length === 0) return [{ text }];

  // Build a list of (start, end, hint) and sort by start
  const ranges: { start: number; end: number; hint: SmartHint }[] = [];
  for (const hint of hints) {
    const needle = hint.raw;
    let idx = text.indexOf(needle);
    while (idx !== -1) {
      ranges.push({ start: idx, end: idx + needle.length, hint });
      idx = text.indexOf(needle, idx + needle.length);
    }
  }
  ranges.sort((a, b) => a.start - b.start);

  // Walk and emit alternating plain / hint tokens
  const tokens: Array<{ text: string; hint?: SmartHint }> = [];
  let cursor = 0;
  for (const r of ranges) {
    if (r.start < cursor) continue; // overlap — skip
    if (r.start > cursor) tokens.push({ text: text.slice(cursor, r.start) });
    tokens.push({ text: text.slice(r.start, r.end), hint: r.hint });
    cursor = r.end;
  }
  if (cursor < text.length) tokens.push({ text: text.slice(cursor) });
  return tokens;
}
