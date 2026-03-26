// ==========================================
// Security Layer — WhatsApp Bot
// ==========================================
// Webhook validation, rate limiting, message sanitization,
// audit logging, and phone blocking.

import prisma from "@/lib/prisma";

// ==========================================
// Webhook Signature Validation
// ==========================================

/**
 * Validate incoming Green API webhook request.
 * Green API sends a stateInstance and instanceData we can verify.
 */
export function validateWebhookSignature(
  body: Record<string, unknown>,
  expectedInstanceId?: string
): boolean {
  // Green API webhooks include instanceData.idInstance
  const instanceId = expectedInstanceId || process.env.GREEN_API_INSTANCE_ID;

  if (!instanceId) {
    // No instance ID configured — allow in development
    console.warn("[Security] No GREEN_API_INSTANCE_ID set — skipping webhook validation");
    return true;
  }

  const bodyInstanceId =
    (body.instanceData as Record<string, unknown>)?.idInstance;

  if (!bodyInstanceId) {
    console.warn("[Security] Webhook missing instanceData.idInstance");
    return false;
  }

  if (String(bodyInstanceId) !== String(instanceId)) {
    console.warn(
      `[Security] Webhook instance ID mismatch: expected ${instanceId}, got ${bodyInstanceId}`
    );
    return false;
  }

  return true;
}

// ==========================================
// Rate Limiting — Per Phone
// ==========================================
const RATE_LIMIT_MAX_PER_USER = 30; // messages per minute
const RATE_LIMIT_WINDOW_MS = 60_000;

// Map<phone, timestamp[]>
const userMessageTimes = new Map<string, number[]>();

/**
 * Check if a phone number has exceeded the rate limit.
 * Returns true if rate limited (should block).
 */
export function isRateLimited(phone: string): boolean {
  const now = Date.now();
  const times = userMessageTimes.get(phone) || [];

  // Remove timestamps outside window
  const recent = times.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  userMessageTimes.set(phone, recent);

  if (recent.length >= RATE_LIMIT_MAX_PER_USER) {
    console.warn(`[Security] Rate limited phone: ${phone} (${recent.length} msgs in last minute)`);
    return true;
  }

  // Record this message
  recent.push(now);
  userMessageTimes.set(phone, recent);

  return false;
}

// Clean up old rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [phone, times] of userMessageTimes.entries()) {
    const recent = times.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (recent.length === 0) {
      userMessageTimes.delete(phone);
    } else {
      userMessageTimes.set(phone, recent);
    }
  }
}, 5 * 60_000);

// ==========================================
// Message Sanitization
// ==========================================

/**
 * Sanitize incoming message text to prevent injection attacks.
 * Removes potential prompt injection patterns and control characters.
 */
export function sanitizeMessage(text: string): string {
  if (!text || typeof text !== "string") return "";

  let sanitized = text;

  // Remove control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Remove excessive whitespace
  sanitized = sanitized.replace(/\n{4,}/g, "\n\n\n");

  // Limit length to 2000 characters
  if (sanitized.length > 2000) {
    sanitized = sanitized.substring(0, 2000);
  }

  // Strip common prompt injection patterns
  const injectionPatterns = [
    /ignore\s+(all\s+)?previous\s+instructions/gi,
    /forget\s+(all\s+)?previous\s+instructions/gi,
    /you\s+are\s+now\s+a/gi,
    /system\s*:\s*/gi,
    /\[INST\]/gi,
    /\[\/INST\]/gi,
    /<\|im_start\|>/gi,
    /<\|im_end\|>/gi,
    /<<SYS>>/gi,
    /<\/SYS>/gi,
  ];

  for (const pattern of injectionPatterns) {
    sanitized = sanitized.replace(pattern, "[filtered]");
  }

  return sanitized.trim();
}

// ==========================================
// Audit Logging
// ==========================================

/**
 * Log a WhatsApp interaction for auditing purposes.
 * Writes to DB when available, falls back to console.
 */
export async function logInteraction(params: {
  phone: string;
  userType: string;
  userId?: string;
  direction: "inbound" | "outbound";
  message: string;
  toolUsed?: string;
}): Promise<void> {
  try {
    await prisma.whatsAppAuditLog.create({
      data: {
        phone: params.phone,
        userType: params.userType,
        userId: params.userId || null,
        direction: params.direction,
        message: params.message.substring(0, 5000), // Limit stored message length
        toolUsed: params.toolUsed || null,
      },
    });
  } catch (error) {
    // Fallback to console logging if DB is unavailable
    console.log(
      `[Audit] ${params.direction} | ${params.userType}:${params.phone} | ${params.message.substring(0, 100)}` +
        (params.toolUsed ? ` | tool: ${params.toolUsed}` : "")
    );
    console.error("[Audit] DB write failed:", error);
  }
}

// ==========================================
// Phone Blocking
// ==========================================
// In-memory blocklist with optional DB backing
const blockedPhones = new Set<string>();

/**
 * Check if a phone number is blocked
 */
export function isBlocked(phone: string): boolean {
  return blockedPhones.has(phone);
}

/**
 * Block a phone number
 */
export function blockPhone(phone: string): void {
  blockedPhones.add(phone);
  console.log(`[Security] Blocked phone: ${phone}`);
}

/**
 * Unblock a phone number
 */
export function unblockPhone(phone: string): void {
  blockedPhones.delete(phone);
  console.log(`[Security] Unblocked phone: ${phone}`);
}

// ==========================================
// Security summary for status endpoint
// ==========================================
export function getSecurityStats(): {
  activeRateLimits: number;
  blockedPhones: number;
} {
  return {
    activeRateLimits: userMessageTimes.size,
    blockedPhones: blockedPhones.size,
  };
}
