import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || "").trim();
const GOOGLE_CLIENT_SECRET = (process.env.GOOGLE_CLIENT_SECRET || "").trim();

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // designerId
  const error = searchParams.get("error");

  // Build redirect helper
  const designerCalendarUrl = (designerId: string, status: string) =>
    `${origin}/designer/${designerId}?google=${status}#calendar`;
  const fallbackErrorUrl = `${origin}/login`;

  try {
    if (error || !code || !state) {
      console.error("Google Calendar callback: missing params", { error, hasCode: !!code, hasState: !!state });
      return NextResponse.redirect(state ? designerCalendarUrl(state, "error") : fallbackErrorUrl);
    }

    // Exchange code for tokens
    const redirectUri = `${origin}/api/designer/crm/google-calendar/callback`;
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error("Google Calendar token exchange failed:", tokenRes.status, errorText);
      return NextResponse.redirect(designerCalendarUrl(state, "error"));
    }

    const tokenData = await tokenRes.json();

    // Fetch primary calendar to get the connected Google account email.
    // The `id` of the primary calendar is the user's Google email — this
    // avoids adding the `email`/`profile` scope (which would trigger
    // re-verification). Uses the existing `calendar` scope only.
    let googleEmail: string | null = null;
    try {
      const calRes = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary",
        { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
      );
      if (calRes.ok) {
        const calData = await calRes.json();
        if (typeof calData.id === "string") googleEmail = calData.id;
      }
    } catch { /* non-fatal — connection still works without the email */ }

    // Save tokens
    await prisma.designerGoogleCalendar.upsert({
      where: { designerId: state },
      create: {
        designerId: state,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        calendarId: "primary",
        googleEmail,
        syncEnabled: true,
        lastSyncAt: new Date(),
      },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || undefined,
        calendarId: "primary",
        googleEmail: googleEmail || undefined,
        syncEnabled: true,
        lastSyncAt: new Date(),
      },
    });

    // Redirect back to calendar with success
    return NextResponse.redirect(designerCalendarUrl(state, "connected"));
  } catch (err) {
    console.error("Google Calendar callback error:", err);
    return NextResponse.redirect(state ? designerCalendarUrl(state, "error") : fallbackErrorUrl);
  }
}
