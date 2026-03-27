// ==========================================
// Security Layer — WhatsApp Bot
// ==========================================
// Webhook validation, rate limiting, message sanitization,
// prompt injection detection, audit logging, and phone blocking.

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
// Enhanced Prompt Injection Detection
// ==========================================

type InjectionSeverity = "low" | "medium" | "high" | "critical";

interface InjectionPattern {
  pattern: RegExp;
  severity: InjectionSeverity;
  category: string;
}

/**
 * Comprehensive list of prompt injection patterns.
 * Covers English, Hebrew, and technical attack vectors.
 */
const INJECTION_PATTERNS: InjectionPattern[] = [
  // --- English injection patterns ---
  { pattern: /ignore\s+(all\s+)?previous\s+instructions/gi, severity: "critical", category: "instruction_override" },
  { pattern: /forget\s+(all\s+)?previous\s+instructions/gi, severity: "critical", category: "instruction_override" },
  { pattern: /disregard\s+(all\s+)?previous/gi, severity: "critical", category: "instruction_override" },
  { pattern: /you\s+are\s+now\s+/gi, severity: "high", category: "role_change" },
  { pattern: /pretend\s+you\s+are/gi, severity: "high", category: "role_change" },
  { pattern: /act\s+as\s+(a\s+|an\s+)?/gi, severity: "medium", category: "role_change" },
  { pattern: /system\s*prompt/gi, severity: "high", category: "system_access" },
  { pattern: /system\s*message/gi, severity: "high", category: "system_access" },
  { pattern: /reveal\s+your\s+instructions/gi, severity: "high", category: "system_access" },
  { pattern: /what\s+are\s+your\s+rules/gi, severity: "medium", category: "system_access" },
  { pattern: /show\s+me\s+your\s+(system\s+)?prompt/gi, severity: "high", category: "system_access" },
  { pattern: /jailbreak/gi, severity: "critical", category: "jailbreak" },
  { pattern: /\bDAN\b/, severity: "high", category: "jailbreak" },
  { pattern: /developer\s+mode/gi, severity: "high", category: "jailbreak" },
  { pattern: /do\s+anything\s+now/gi, severity: "high", category: "jailbreak" },

  // --- Hebrew injection patterns ---
  { pattern: /התעלם\s+מהוראות\s+קודמות/g, severity: "critical", category: "instruction_override_he" },
  { pattern: /התעלמי?\s+מכל\s+ההוראות/g, severity: "critical", category: "instruction_override_he" },
  { pattern: /שכח\s+(את\s+)?ההוראות/g, severity: "critical", category: "instruction_override_he" },
  { pattern: /אתה\s+עכשיו/g, severity: "high", category: "role_change_he" },
  { pattern: /את\s+עכשיו/g, severity: "high", category: "role_change_he" },
  { pattern: /תעמי?ד\s+פנים/g, severity: "high", category: "role_change_he" },
  { pattern: /חשוף\s+את\s+ההנחיות/g, severity: "high", category: "system_access_he" },
  { pattern: /חשפי?\s+את\s+ההוראות/g, severity: "high", category: "system_access_he" },
  { pattern: /מה\s+הכללים\s+שלך/g, severity: "medium", category: "system_access_he" },
  { pattern: /מה\s+ההנחיות\s+שלך/g, severity: "medium", category: "system_access_he" },
  { pattern: /מה\s+ההוראות\s+שקיבלת/g, severity: "medium", category: "system_access_he" },

  // --- Data extraction attempts (Hebrew) ---
  { pattern: /תן\s+לי\s+את\s+המספר\s+של/g, severity: "high", category: "data_extraction" },
  { pattern: /תני?\s+לי\s+את\s+הטלפון\s+של/g, severity: "high", category: "data_extraction" },
  { pattern: /מה\s+האימייל\s+של/g, severity: "high", category: "data_extraction" },
  { pattern: /מה\s+המייל\s+של/g, severity: "high", category: "data_extraction" },
  { pattern: /תן\s+לי\s+פרטים\s+של\s+כל/g, severity: "high", category: "data_extraction" },
  { pattern: /רשימת\s+(כל\s+)?ה?(מעצבות|ספקים|משתמשים)/g, severity: "medium", category: "data_extraction" },

  // --- SQL injection patterns ---
  { pattern: /DROP\s+TABLE/gi, severity: "critical", category: "sql_injection" },
  { pattern: /DELETE\s+FROM/gi, severity: "critical", category: "sql_injection" },
  { pattern: /INSERT\s+INTO/gi, severity: "high", category: "sql_injection" },
  { pattern: /UPDATE\s+\w+\s+SET/gi, severity: "high", category: "sql_injection" },
  { pattern: /UNION\s+SELECT/gi, severity: "critical", category: "sql_injection" },
  { pattern: /;\s*--/g, severity: "high", category: "sql_injection" },
  { pattern: /'\s*OR\s+'?1'?\s*=\s*'?1/gi, severity: "critical", category: "sql_injection" },
  { pattern: /'\s*;\s*DROP/gi, severity: "critical", category: "sql_injection" },

  // --- LLM-specific attack tokens ---
  { pattern: /\[INST\]/gi, severity: "high", category: "llm_tokens" },
  { pattern: /\[\/INST\]/gi, severity: "high", category: "llm_tokens" },
  { pattern: /<\|im_start\|>/gi, severity: "high", category: "llm_tokens" },
  { pattern: /<\|im_end\|>/gi, severity: "high", category: "llm_tokens" },
  { pattern: /<<SYS>>/gi, severity: "high", category: "llm_tokens" },
  { pattern: /<\/SYS>/gi, severity: "high", category: "llm_tokens" },
  { pattern: /system\s*:\s*/gi, severity: "medium", category: "llm_tokens" },
];

/**
 * Check if a string contains base64-encoded content
 * that might be hiding injection instructions.
 */
function containsBase64Injection(text: string): boolean {
  // Match base64 strings (at least 20 chars long to avoid false positives)
  const base64Pattern = /[A-Za-z0-9+/]{20,}={0,2}/g;
  const matches = text.match(base64Pattern);
  if (!matches) return false;

  for (const match of matches) {
    try {
      const decoded = Buffer.from(match, "base64").toString("utf-8");
      // Check if decoded content contains suspicious keywords
      const suspiciousKeywords = [
        "ignore", "system", "prompt", "instructions",
        "הוראות", "התעלם", "מערכת",
      ];
      const lowerDecoded = decoded.toLowerCase();
      if (suspiciousKeywords.some((kw) => lowerDecoded.includes(kw))) {
        return true;
      }
    } catch {
      // Not valid base64 — skip
    }
  }

  return false;
}

export interface InjectionDetectionResult {
  isInjection: boolean;
  severity: InjectionSeverity | null;
  category: string | null;
  matchedPattern: string | null;
}

/**
 * Detect prompt injection attempts in a message.
 * Returns detection result with severity and category.
 */
export function detectInjection(text: string): InjectionDetectionResult {
  if (!text || typeof text !== "string") {
    return { isInjection: false, severity: null, category: null, matchedPattern: null };
  }

  // Check all patterns
  for (const { pattern, severity, category } of INJECTION_PATTERNS) {
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match) {
      return {
        isInjection: true,
        severity,
        category,
        matchedPattern: match[0],
      };
    }
  }

  // Check for base64-encoded injections
  if (containsBase64Injection(text)) {
    return {
      isInjection: true,
      severity: "high",
      category: "base64_injection",
      matchedPattern: "[base64 encoded instruction detected]",
    };
  }

  return { isInjection: false, severity: null, category: null, matchedPattern: null };
}

// ==========================================
// Injection Rate Tracking & Temporary Blocking
// ==========================================
const INJECTION_BLOCK_THRESHOLD = 3; // triggers in 1 hour = temporary block
const INJECTION_BLOCK_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const INJECTION_BLOCK_DURATION_MS = 60 * 60 * 1000; // 1 hour block

// Map<phone, timestamps of injection attempts>
const injectionAttempts = new Map<string, number[]>();
// Map<phone, block expiry timestamp>
const temporaryBlocks = new Map<string, number>();

/**
 * Record an injection attempt from a phone number.
 * Returns true if the phone should now be temporarily blocked.
 */
export function recordInjectionAttempt(phone: string): boolean {
  const now = Date.now();
  const attempts = injectionAttempts.get(phone) || [];

  // Remove old attempts outside the window
  const recent = attempts.filter((t) => now - t < INJECTION_BLOCK_WINDOW_MS);
  recent.push(now);
  injectionAttempts.set(phone, recent);

  if (recent.length >= INJECTION_BLOCK_THRESHOLD) {
    // Temporarily block this phone
    temporaryBlocks.set(phone, now + INJECTION_BLOCK_DURATION_MS);
    injectionAttempts.delete(phone); // Reset counter
    console.warn(`[Security] Temporarily blocked phone ${phone} for repeated injection attempts`);
    return true;
  }

  return false;
}

/**
 * Check if a phone is temporarily blocked due to injection attempts.
 */
export function isTemporarilyBlocked(phone: string): boolean {
  const blockExpiry = temporaryBlocks.get(phone);
  if (!blockExpiry) return false;

  if (Date.now() > blockExpiry) {
    temporaryBlocks.delete(phone);
    return false;
  }

  return true;
}

/**
 * Log a security event (injection attempt, etc.) to the audit log.
 */
export async function logSecurityEvent(params: {
  phone: string;
  severity: InjectionSeverity;
  category: string;
  matchedPattern: string;
  originalMessage: string;
}): Promise<void> {
  const logMessage = `[SECURITY:${params.severity.toUpperCase()}] category=${params.category} pattern="${params.matchedPattern}" msg="${params.originalMessage.substring(0, 200)}"`;

  try {
    await prisma.whatsAppAuditLog.create({
      data: {
        phone: params.phone,
        userType: "security",
        userId: null,
        direction: "inbound",
        message: logMessage,
        toolUsed: `security_${params.category}`,
      },
    });
  } catch (error) {
    console.error("[Security] Failed to log security event:", error);
  }

  console.warn(`[Security] ${logMessage}`);
}

/**
 * Send a security alert to admin phones when a user is temporarily blocked.
 */
export async function notifyAdminOfBlock(phone: string, reason: string): Promise<void> {
  const { sendMessage } = await import("./green-api");
  const adminPhones = (process.env.ADMIN_WHATSAPP_PHONES || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const message = `🚨 התראת אבטחה\n\nהמספר ${phone} נחסם זמנית (שעה).\nסיבה: ${reason}\n\nהמספר ניסה ${INJECTION_BLOCK_THRESHOLD} ניסיונות הזרקה בתוך שעה.`;

  for (const adminPhone of adminPhones) {
    try {
      await sendMessage(adminPhone, message);
    } catch (error) {
      console.error(`[Security] Failed to notify admin ${adminPhone}:`, error);
    }
  }
}

// ==========================================
// Message Sanitization
// ==========================================

/** The standard rejection message for detected injection attempts */
export const INJECTION_REJECTION_MESSAGE = "לא הצלחתי להבין את ההודעה. נסי לנסח אחרת 😊";

/**
 * Sanitize incoming message text to prevent injection attacks.
 * Removes potential prompt injection patterns and control characters.
 *
 * NOTE: This function sanitizes (cleans) the message. For detection
 * and blocking, use detectInjection() separately before sanitizing.
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

  // Strip LLM-specific formatting tokens (these are never legitimate in WhatsApp messages)
  const tokenPatterns = [
    /\[INST\]/gi,
    /\[\/INST\]/gi,
    /<\|im_start\|>/gi,
    /<\|im_end\|>/gi,
    /<<SYS>>/gi,
    /<\/SYS>/gi,
  ];

  for (const pattern of tokenPatterns) {
    sanitized = sanitized.replace(pattern, "");
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
 * Check if a phone number is blocked (permanently or temporarily)
 */
export function isBlocked(phone: string): boolean {
  return blockedPhones.has(phone) || isTemporarilyBlocked(phone);
}

/**
 * Block a phone number permanently
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
  temporaryBlocks.delete(phone);
  console.log(`[Security] Unblocked phone: ${phone}`);
}

// ==========================================
// Security summary for status endpoint
// ==========================================
export function getSecurityStats(): {
  activeRateLimits: number;
  blockedPhones: number;
  temporaryBlocks: number;
} {
  return {
    activeRateLimits: userMessageTimes.size,
    blockedPhones: blockedPhones.size,
    temporaryBlocks: temporaryBlocks.size,
  };
}

// ==========================================
// Cleanup: Periodic purge of expired temporary blocks
// ==========================================
setInterval(() => {
  const now = Date.now();
  for (const [phone, expiry] of temporaryBlocks.entries()) {
    if (now > expiry) {
      temporaryBlocks.delete(phone);
    }
  }
  for (const [phone, attempts] of injectionAttempts.entries()) {
    const recent = attempts.filter((t) => now - t < INJECTION_BLOCK_WINDOW_MS);
    if (recent.length === 0) {
      injectionAttempts.delete(phone);
    } else {
      injectionAttempts.set(phone, recent);
    }
  }
}, 10 * 60_000); // Every 10 minutes
