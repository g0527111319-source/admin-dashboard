// ==========================================
// TTL rules for annotations (ephemeral pins)
// ==========================================
// Decided spec:
//   OPEN      — 24h from creation
//   ANSWERED  — 48h from designer reply (so client has time to read)
//   RESOLVED  — immediate (next cron sweeps it)
//   PINNED    — rides with the parent model's expiresAt (full project life)
//
// All TTLs are enforced by /api/cron/cleanup-annotations running hourly.
// The UI shows a countdown badge per pin so the client can screenshot
// before something vanishes.

import type { AnnotationStatus } from "@/generated/prisma/client";

const HOUR = 60 * 60 * 1000;

export function ttlForStatus(
  status: AnnotationStatus,
  modelExpiresAt: Date
): Date {
  const now = Date.now();
  switch (status) {
    case "OPEN":
      return new Date(now + 24 * HOUR);
    case "ANSWERED":
      return new Date(now + 48 * HOUR);
    case "RESOLVED":
      return new Date(now); // expire immediately
    case "PINNED":
      return modelExpiresAt; // persists until model itself is deleted
    default:
      return new Date(now + 24 * HOUR);
  }
}
