export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

// GET /api/auth/google?role=designer|supplier
// Redirects user to Google OAuth consent screen
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.json(
      { error: "כניסה עם Google לא מוגדרת במערכת" },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role") || "designer";
  const redirect = searchParams.get("redirect") || "";

  // Validate role
  if (role !== "designer" && role !== "supplier") {
    return NextResponse.json({ error: "סוג משתמש לא תקין" }, { status: 400 });
  }

  // Build callback URL (same origin)
  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/auth/google/callback`;

  // State encodes the role + optional redirect path (JSON → base64)
  const statePayload = JSON.stringify({ role, redirect });
  const state = Buffer.from(statePayload).toString("base64url");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account", // always show account picker
    state,
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return NextResponse.redirect(googleAuthUrl);
}
