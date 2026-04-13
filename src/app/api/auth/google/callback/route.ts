export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie, type UserRole } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit-logger";
import prisma from "@/lib/prisma";

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

// GET /api/auth/google/callback?code=...&state=...
// Google redirects here after user consents
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const errorParam = searchParams.get("error");
  const origin = new URL(req.url).origin;

  // User cancelled or error from Google
  if (errorParam || !code) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", "google_cancelled");
    return NextResponse.redirect(loginUrl.toString());
  }

  // Decode state
  let role: UserRole = "designer";
  let redirectPath = "";
  if (stateParam) {
    try {
      const decoded = JSON.parse(Buffer.from(stateParam, "base64url").toString());
      role = decoded.role === "supplier" ? "supplier" : "designer";
      redirectPath = decoded.redirect || "";
    } catch {
      // Invalid state — use defaults
    }
  }

  try {
    // 1. Exchange code for tokens
    const redirectUri = `${origin}/api/auth/google/callback`;
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: (process.env.GOOGLE_CLIENT_ID || "").trim(),
        client_secret: (process.env.GOOGLE_CLIENT_SECRET || "").trim(),
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("Google token exchange failed:", await tokenRes.text());
      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set("error", "google_token_failed");
      return NextResponse.redirect(loginUrl.toString());
    }

    const tokens: GoogleTokenResponse = await tokenRes.json();

    // 2. Get user info from Google
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoRes.ok) {
      console.error("Google userinfo failed:", await userInfoRes.text());
      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set("error", "google_profile_failed");
      return NextResponse.redirect(loginUrl.toString());
    }

    const googleUser: GoogleUserInfo = await userInfoRes.json();
    const email = googleUser.email?.toLowerCase();
    const googleId = googleUser.id;
    const name = googleUser.name || googleUser.given_name || email;

    if (!email) {
      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set("error", "google_no_email");
      return NextResponse.redirect(loginUrl.toString());
    }

    // 3. Find user by googleId OR email
    let session: { userId: string; role: UserRole; email: string; name: string } | null = null;

    if (role === "designer") {
      // Try googleId first, then email
      let designer = await prisma.designer.findFirst({
        where: { googleId },
        select: { id: true, fullName: true, email: true, isActive: true, approvalStatus: true },
      });

      if (!designer) {
        designer = await prisma.designer.findFirst({
          where: { email },
          select: { id: true, fullName: true, email: true, isActive: true, approvalStatus: true },
        });
      }

      if (!designer) {
        // No account — redirect to login with error
        const loginUrl = new URL("/login", origin);
        loginUrl.searchParams.set("error", "google_no_account");
        return NextResponse.redirect(loginUrl.toString());
      }

      if (!designer.isActive) {
        const loginUrl = new URL("/login", origin);
        loginUrl.searchParams.set("error", "account_inactive");
        return NextResponse.redirect(loginUrl.toString());
      }

      if (designer.approvalStatus === "PENDING") {
        const loginUrl = new URL("/login", origin);
        loginUrl.searchParams.set("error", "account_pending");
        return NextResponse.redirect(loginUrl.toString());
      }

      if (designer.approvalStatus === "REJECTED") {
        const loginUrl = new URL("/login", origin);
        loginUrl.searchParams.set("error", "account_rejected");
        return NextResponse.redirect(loginUrl.toString());
      }

      // Link Google ID if not already linked
      if (!designer.email) {
        // Edge case — shouldn't happen, but just in case
      }

      // Update googleId on the account for future logins
      await prisma.designer.update({
        where: { id: designer.id },
        data: {
          googleId,
          lastLoginAt: new Date(),
          lastActivityAt: new Date(),
        },
      }).catch(() => {});

      session = {
        userId: designer.id,
        role: "designer",
        email: designer.email || email,
        name: designer.fullName || name,
      };
    } else {
      // Supplier
      let supplier = await prisma.supplier.findFirst({
        where: { googleId },
        select: { id: true, name: true, contactName: true, email: true, isActive: true, approvalStatus: true },
      });

      if (!supplier) {
        supplier = await prisma.supplier.findFirst({
          where: { email },
          select: { id: true, name: true, contactName: true, email: true, isActive: true, approvalStatus: true },
        });
      }

      if (!supplier) {
        const loginUrl = new URL("/login", origin);
        loginUrl.searchParams.set("error", "google_no_account");
        return NextResponse.redirect(loginUrl.toString());
      }

      if (!supplier.isActive) {
        const loginUrl = new URL("/login", origin);
        loginUrl.searchParams.set("error", "account_inactive");
        return NextResponse.redirect(loginUrl.toString());
      }

      if (supplier.approvalStatus === "PENDING") {
        const loginUrl = new URL("/login", origin);
        loginUrl.searchParams.set("error", "account_pending");
        return NextResponse.redirect(loginUrl.toString());
      }

      if (supplier.approvalStatus === "REJECTED") {
        const loginUrl = new URL("/login", origin);
        loginUrl.searchParams.set("error", "account_rejected");
        return NextResponse.redirect(loginUrl.toString());
      }

      // Update googleId on the account
      await prisma.supplier.update({
        where: { id: supplier.id },
        data: { googleId },
      }).catch(() => {});

      session = {
        userId: supplier.id,
        role: "supplier",
        email: supplier.email || email,
        name: supplier.name || supplier.contactName || name,
      };
    }

    if (!session) {
      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set("error", "google_auth_failed");
      return NextResponse.redirect(loginUrl.toString());
    }

    // 4. Set session cookie (same as email login)
    await setSessionCookie(session);

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    logAuditEvent("LOGIN_SUCCESS", session.userId, {
      email: session.email,
      role: session.role,
      method: "google",
    }, ip);

    // 5. Redirect to personal area
    let targetUrl = redirectPath || "/";
    if (!redirectPath) {
      if (session.role === "designer") targetUrl = `/designer/${session.userId}`;
      else if (session.role === "supplier") targetUrl = `/supplier/${session.userId}`;
    }

    return NextResponse.redirect(new URL(targetUrl, origin).toString());
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", "google_server_error");
    return NextResponse.redirect(loginUrl.toString());
  }
}
