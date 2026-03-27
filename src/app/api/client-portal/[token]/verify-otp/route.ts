export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ==========================================
// Rate Limiting — Prevent token/OTP enumeration
// ==========================================

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
}

const otpAttempts = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_ATTEMPTS = 10;

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
}

function isRateLimited(ip: string): boolean {
  const entry = otpAttempts.get(ip);
  if (!entry) return false;

  if (Date.now() - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    otpAttempts.delete(ip);
    return false;
  }

  return entry.attempts >= MAX_ATTEMPTS;
}

function recordAttempt(ip: string): void {
  const entry = otpAttempts.get(ip);
  const now = Date.now();

  if (!entry || now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    otpAttempts.set(ip, { attempts: 1, firstAttempt: now });
  } else {
    entry.attempts++;
  }
}

// Periodic cleanup
setInterval(() => {
  const now = Date.now();
  otpAttempts.forEach((entry, ip) => {
    if (now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
      otpAttempts.delete(ip);
    }
  });
}, 10 * 60 * 1000);

// POST /api/client-portal/[token]/verify-otp
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const ip = getClientIp(req);

  // Check rate limit
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "יותר מדי ניסיונות. נסה שוב בעוד שעה" },
      { status: 429 }
    );
  }

  try {
    const { token } = await params;
    const body = await req.json();
    const { code } = body;

    if (!code?.trim()) {
      return NextResponse.json({ error: "קוד אימות הוא שדה חובה" }, { status: 400 });
    }

    // Record every verification attempt for rate limiting
    recordAttempt(ip);

    // Find active portal token
    const portalToken = await prisma.clientPortalToken.findUnique({
      where: { token },
      include: { client: true },
    });

    if (!portalToken || !portalToken.isActive) {
      return NextResponse.json({ error: "קישור לא תקין או לא פעיל" }, { status: 404 });
    }

    // Find valid OTP (not expired, not used)
    const otp = await prisma.clientPortalOtp.findFirst({
      where: {
        tokenId: portalToken.id,
        code: code.trim(),
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otp) {
      return NextResponse.json({ error: "קוד אימות שגוי או שפג תוקפו" }, { status: 400 });
    }

    // Mark OTP as used
    await prisma.clientPortalOtp.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    });

    // Update last used timestamp
    await prisma.clientPortalToken.update({
      where: { id: portalToken.id },
      data: { lastUsedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      client: {
        id: portalToken.client.id,
        name: portalToken.client.name,
        email: portalToken.client.email,
        phone: portalToken.client.phone,
      },
    });
  } catch (error) {
    console.error("Portal verify OTP error:", error);
    return NextResponse.json({ error: "שגיאה באימות קוד" }, { status: 500 });
  }
}
