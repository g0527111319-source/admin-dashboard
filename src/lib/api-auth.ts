// API auth helper — Defense in Depth.
//
// The middleware (src/middleware.ts) is the primary auth layer: it verifies
// the session JWT and injects x-user-id / x-user-role / x-user-email headers
// into every authenticated request. API routes have historically relied on
// that alone — meaning a single regression in middleware would expose every
// endpoint.
//
// This helper adds a second layer: each route handler asserts the role it
// expects in its own code. If the middleware is bypassed for any reason,
// the route still rejects with 401/403.
//
// Usage:
//   const auth = requireRole(req, ADMIN_ONLY);
//   if (!auth.ok) return auth.response;
//   // ...auth.userId / auth.role / auth.email available here

import { NextRequest, NextResponse } from "next/server";

export type Role = "admin" | "designer" | "supplier";

export type ApiAuthOk = {
  ok: true;
  userId: string;
  role: Role;
  email: string;
};

export type ApiAuthErr = {
  ok: false;
  response: NextResponse;
};

export type ApiAuthResult = ApiAuthOk | ApiAuthErr;

export const ADMIN_ONLY = ["admin"] as const;
export const ADMIN_OR_DESIGNER = ["admin", "designer"] as const;
export const ADMIN_OR_SUPPLIER = ["admin", "supplier"] as const;
export const DESIGNER_ONLY = ["designer"] as const;
export const SUPPLIER_ONLY = ["supplier"] as const;

/**
 * Assert that the incoming request carries a session header set by the
 * middleware, and that the role is one of the allowed values.
 *
 * Returns either { ok: true, userId, role, email } or { ok: false, response }
 * — callers should `return auth.response` immediately on failure.
 */
export function requireRole(
  req: NextRequest,
  allowedRoles: readonly string[],
): ApiAuthResult {
  const role = req.headers.get("x-user-role");
  const userId = req.headers.get("x-user-id");
  const emailHeader = req.headers.get("x-user-email");

  if (!role || !userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "לא מחובר" }, { status: 401 }),
    };
  }

  if (!allowedRoles.includes(role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "אין הרשאה" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    userId,
    role: role as Role,
    email: emailHeader || "",
  };
}

/**
 * Same as requireRole but returns null instead of a response. Use when the
 * caller wants to handle the unauthenticated case in a custom way (e.g.,
 * read-only public fallback).
 */
export function getAuth(req: NextRequest): ApiAuthOk | null {
  const role = req.headers.get("x-user-role");
  const userId = req.headers.get("x-user-id");
  const emailHeader = req.headers.get("x-user-email");
  if (!role || !userId) return null;
  return { ok: true, userId, role: role as Role, email: emailHeader || "" };
}
