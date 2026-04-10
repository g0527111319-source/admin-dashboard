import { txt } from "@/content/siteText";
import { NextRequest, NextResponse } from "next/server";
import { loginWithEmail, setSessionCookie, type UserRole } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit-logger";
import prisma from "@/lib/prisma";
export const dynamic = "force-dynamic";

// ==========================================
// Rate Limiting — In-memory per-IP tracker
// ==========================================

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
}

const failedAttempts = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 5;

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
}

function isRateLimited(ip: string): boolean {
  const entry = failedAttempts.get(ip);
  if (!entry) return false;

  // Window expired — clean up
  if (Date.now() - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    failedAttempts.delete(ip);
    return false;
  }

  return entry.attempts >= MAX_FAILED_ATTEMPTS;
}

function recordFailedAttempt(ip: string): void {
  const entry = failedAttempts.get(ip);
  const now = Date.now();

  if (!entry || now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    failedAttempts.set(ip, { attempts: 1, firstAttempt: now });
  } else {
    entry.attempts++;
  }
}

function clearFailedAttempts(ip: string): void {
  failedAttempts.delete(ip);
}

// Periodic cleanup of stale entries (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  failedAttempts.forEach((entry, ip) => {
    if (now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
      failedAttempts.delete(ip);
    }
  });
}, 10 * 60 * 1000);

// POST /api/auth/login — כניסה עם אימייל וסיסמה
export async function POST(req: NextRequest) {
    const ip = getClientIp(req);

    // Check rate limit
    if (isRateLimited(ip)) {
        logAuditEvent("LOGIN_FAILURE", null, { reason: "rate_limited" }, ip);
        return NextResponse.json(
            { error: txt("src/app/api/auth/login/route.ts::004", "\u05E0\u05D9\u05E1\u05D9\u05D5\u05E0\u05D5\u05EA \u05DB\u05E0\u05D9\u05E1\u05D4 \u05E8\u05D1\u05D9\u05DD \u05DE\u05D3\u05D9. \u05E0\u05E1\u05D4 \u05E9\u05D5\u05D1 \u05D1\u05E2\u05D5\u05D3 15 \u05D3\u05E7\u05D5\u05EA") },
            { status: 429 }
        );
    }

    try {
        const { email, password, role } = await req.json();
        if (!email || !password) {
            return NextResponse.json({ error: txt("src/app/api/auth/login/route.ts::001", "\u05E0\u05D3\u05E8\u05E9 \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05D5\u05E1\u05D9\u05E1\u05DE\u05D4") }, { status: 400 });
        }
        const validRoles: UserRole[] = ["admin", "supplier", "designer"];
        const userRole: UserRole = validRoles.includes(role) ? role : "designer";
        const result = await loginWithEmail(email, password, userRole);
        if (!result.success || !result.session) {
            recordFailedAttempt(ip);
            logAuditEvent("LOGIN_FAILURE", null, { email, role: userRole }, ip);
            // Generic error message — do not reveal whether email exists
            return NextResponse.json(
                { error: txt("src/app/api/auth/login/route.ts::002", "\u05E4\u05E8\u05D8\u05D9 \u05DB\u05E0\u05D9\u05E1\u05D4 \u05E9\u05D2\u05D5\u05D9\u05D9\u05DD") },
                { status: 401 }
            );
        }
        // שמירת session
        await setSessionCookie(result.session);
        clearFailedAttempts(ip);
        logAuditEvent("LOGIN_SUCCESS", result.session.userId, { email: result.session.email, role: result.session.role }, ip);

        // Track lastLoginAt for churn detection (item 20)
        if (result.session.role === "designer") {
            prisma.designer.update({
                where: { id: result.session.userId },
                data: { lastLoginAt: new Date(), lastActivityAt: new Date() },
            }).catch(() => console.error("[login] lastLoginAt update failed"));
        }

        // redirect URL based on role — use actual user ID
        let redirectUrl = "/";
        if (result.session.role === "admin")
            redirectUrl = "/admin";
        else if (result.session.role === "supplier")
            redirectUrl = `/supplier/${result.session.userId}`;
        else if (result.session.role === "designer")
            redirectUrl = `/designer/${result.session.userId}`;
        return NextResponse.json({
            success: true,
            user: {
                name: result.session.name,
                email: result.session.email,
            },
            redirectUrl,
        });
    }
    catch (error) {
        console.error("Login error");
        return NextResponse.json({ error: txt("src/app/api/auth/login/route.ts::003", "\u05E9\u05D2\u05D9\u05D0\u05EA \u05DB\u05E0\u05D9\u05E1\u05D4") }, { status: 500 });
    }
}
