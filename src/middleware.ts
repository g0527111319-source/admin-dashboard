import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// ==========================================
// Middleware — הגנה על נתיבים
// ==========================================

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "fallback-secret-change-in-production"
);

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/suppliers-directory",
  "/events",
  "/terms",
  "/projects",
];

const API_PUBLIC_PATHS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/magic-link",
  "/api/auth/google",
  "/api/auth/google/callback",
  "/api/suppliers", // GET only — public directory
];

// Prefix-based public paths (starts with)
const API_PUBLIC_PREFIXES = [
  "/api/client-portal/", // Client portal — own auth mechanism
  "/client-portal/",     // Client portal pages — own OTP auth
  "/api/public/",        // Public API endpoints (projects gallery, etc.)
  "/api/image-proxy",    // Image proxy — public, fetches images server-side
];

async function verifyTokenMiddleware(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { userId: string; role: string; email: string; name: string };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // נתיבים סטטיים - דלג
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/cron") ||
    pathname.includes(".") // static files
  ) {
    return NextResponse.next();
  }

  // נתיבים ציבוריים
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // API ציבוריים (prefix)
  if (API_PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // API ציבוריים
  if (API_PUBLIC_PATHS.some((p) => pathname === p)) {
    // /api/suppliers GET is public, POST requires admin
    if (pathname === "/api/suppliers" && request.method !== "GET") {
      // continue to auth check below
    } else {
      return NextResponse.next();
    }
  }

  // בדיקת session token
  const token = request.cookies.get("session_token")?.value;
  const adminToken = request.cookies.get("admin_token")?.value;

  let session = token ? await verifyTokenMiddleware(token) : null;

  // backward compat: old admin cookie
  if (!session && adminToken === (process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET)) {
    session = {
      userId: "admin",
      role: "admin",
      email: process.env.ADMIN_EMAIL || "",
      name: "תמר",
    };
  }

  // אם אין session — הפנה ל-login
  if (!session) {
    // API routes return 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "לא מחובר" },
        { status: 401 }
      );
    }

    // Page routes redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // בדיקת הרשאות לנתיבים ספציפיים
  const role = session.role;

  // /admin/* — רק אדמין
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (role !== "admin") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // /supplier/* — רק ספק (או אדמין)
  if (pathname.startsWith("/supplier")) {
    if (role !== "supplier" && role !== "admin") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // /designer/* or /api/designer/* — רק מעצבת (או אדמין)
  if (pathname.startsWith("/designer") || pathname.startsWith("/api/designer")) {
    if (role !== "designer" && role !== "admin") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // הוסף מידע על המשתמש ל-headers
  const response = NextResponse.next();
  response.headers.set("x-user-id", session.userId);
  response.headers.set("x-user-role", session.role);
  response.headers.set("x-user-email", session.email);
  response.headers.set("x-user-name", encodeURIComponent(session.name));

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public files
     */
    "/((?!_next/static|_next/image|favicon.ico|logo.png|logo-sticker\\.webp|logo\\.webp|manifest\\.json|.*\\.svg).*)",
  ],
};
