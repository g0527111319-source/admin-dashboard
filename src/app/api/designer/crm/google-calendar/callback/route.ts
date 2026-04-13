import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/designer/crm/google-calendar/callback`
  : "http://localhost:3000/api/designer/crm/google-calendar/callback";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // designerId
    const error = searchParams.get("error");

    if (error || !code || !state) {
      return NextResponse.redirect(new URL("/#calendar?google=error", req.url));
    }

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(new URL("/#calendar?google=error", req.url));
    }

    const tokenData = await tokenRes.json();

    // Save tokens
    await prisma.designerGoogleCalendar.upsert({
      where: { designerId: state },
      create: {
        designerId: state,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        calendarId: "primary",
        syncEnabled: true,
        lastSyncAt: new Date(),
      },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || undefined,
        syncEnabled: true,
        lastSyncAt: new Date(),
      },
    });

    // Redirect back to calendar with success
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.redirect(`${baseUrl}/designer/${state}#calendar?google=connected`);
  } catch (error) {
    console.error("Google Calendar callback error:", error);
    return NextResponse.redirect(new URL("/#calendar?google=error", req.url));
  }
}
