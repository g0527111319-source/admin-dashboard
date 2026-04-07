/**
 * DB-backed rate limiter. Uses RateLimitEntry with a unique key.
 * Returns { allowed, remaining, resetAt }.
 */
import prisma from "./prisma";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
};

/**
 * Consume a token from the given key bucket.
 * @param key  unique key (e.g. `webhook:icount:${ip}`)
 * @param limit max requests per window
 * @param windowSeconds window size in seconds
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = new Date();
  const windowMs = windowSeconds * 1000;
  try {
    // Try to fetch existing entry
    const existing = await prisma.rateLimitEntry.findUnique({ where: { key } });

    if (!existing || existing.expiresAt < now) {
      // New window
      const expiresAt = new Date(now.getTime() + windowMs);
      await prisma.rateLimitEntry.upsert({
        where: { key },
        update: { count: 1, windowStart: now, expiresAt },
        create: { key, count: 1, windowStart: now, expiresAt },
      });
      return { allowed: true, remaining: limit - 1, resetAt: expiresAt };
    }

    if (existing.count >= limit) {
      return { allowed: false, remaining: 0, resetAt: existing.expiresAt };
    }

    await prisma.rateLimitEntry.update({
      where: { key },
      data: { count: { increment: 1 } },
    });
    return {
      allowed: true,
      remaining: limit - existing.count - 1,
      resetAt: existing.expiresAt,
    };
  } catch (err) {
    console.error("[RateLimit] Error, failing open:", err);
    return { allowed: true, remaining: limit, resetAt: new Date(now.getTime() + windowMs) };
  }
}

export function getClientIp(req: Request | { headers: Headers }): string {
  const h = req.headers;
  return (
    h.get("x-forwarded-for")?.split(",")[0].trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}
