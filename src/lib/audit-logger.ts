// ==========================================
// Audit Logger — Security Event Logging
// ==========================================

export type AuditAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "FILE_UPLOAD"
  | "CONTRACT_SIGNED"
  | "ADMIN_SETTINGS_CHANGE"
  | "LOGOUT";

interface AuditEvent {
  action: AuditAction;
  userId: string | null;
  details: Record<string, unknown>;
  ip: string | null;
  timestamp: string;
}

/**
 * Log a security-relevant event.
 * Writes to stdout as structured JSON so it can be captured by log aggregators.
 * Can be extended to write to a database AuditLog table in the future.
 */
export function logAuditEvent(
  action: AuditAction,
  userId: string | null,
  details: Record<string, unknown>,
  ip: string | null
): void {
  const event: AuditEvent = {
    action,
    userId,
    details,
    ip,
    timestamp: new Date().toISOString(),
  };

  // Structured JSON log line for log aggregators
  console.log(`[AUDIT] ${JSON.stringify(event)}`);
}
