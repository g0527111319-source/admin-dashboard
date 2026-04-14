import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || "").trim();
const GOOGLE_CLIENT_SECRET = (process.env.GOOGLE_CLIENT_SECRET || "").trim();

// GET — check sync status
export async function GET(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const config = await prisma.designerGoogleCalendar.findUnique({
      where: { designerId },
      select: { syncEnabled: true, lastSyncAt: true, calendarId: true },
    });

    if (!GOOGLE_CLIENT_ID) {
      return NextResponse.json({ configured: false, connected: false, syncEnabled: false });
    }

    return NextResponse.json({
      configured: true,
      connected: !!config?.calendarId,
      syncEnabled: config?.syncEnabled || false,
      lastSyncAt: config?.lastSyncAt || null,
    });
  } catch (error) {
    console.error("Google Calendar status error:", error);
    return NextResponse.json({ error: "שגיאה" }, { status: 500 });
  }
}

// POST — initiate OAuth or trigger sync
export async function POST(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    if (action === "auth") {
      // Generate OAuth URL
      if (!GOOGLE_CLIENT_ID) {
        return NextResponse.json({ error: "Google Calendar לא מוגדר במערכת" }, { status: 400 });
      }

      const origin = new URL(req.url).origin;
      const redirectUri = `${origin}/api/designer/crm/google-calendar/callback`;
      const scopes = encodeURIComponent("https://www.googleapis.com/auth/calendar");
      const state = encodeURIComponent(designerId);
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scopes}&access_type=offline&prompt=consent&state=${state}`;

      return NextResponse.json({ authUrl });
    }

    if (action === "sync") {
      // Manual sync trigger
      const config = await prisma.designerGoogleCalendar.findUnique({
        where: { designerId },
      });

      if (!config?.accessToken) {
        return NextResponse.json({ error: "לא מחובר ל-Google Calendar" }, { status: 400 });
      }

      // Refresh token if needed
      let accessToken = config.accessToken;
      if (config.refreshToken) {
        try {
          const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: GOOGLE_CLIENT_ID,
              client_secret: GOOGLE_CLIENT_SECRET,
              refresh_token: config.refreshToken,
              grant_type: "refresh_token",
            }),
          });
          if (tokenRes.ok) {
            const tokenData = await tokenRes.json();
            accessToken = tokenData.access_token;
            await prisma.designerGoogleCalendar.update({
              where: { designerId },
              data: { accessToken },
            });
          }
        } catch { /* use existing token */ }
      }

      // Get events from our DB
      const events = await prisma.crmCalendarEvent.findMany({
        where: { designerId, googleEventId: null },
        orderBy: { startAt: "asc" },
      });

      // Push to Google Calendar
      let synced = 0;
      const calendarId = config.calendarId || "primary";
      for (const event of events) {
        try {
          const gcalEvent: Record<string, unknown> = {
            summary: event.title,
            description: event.description || "",
            location: event.location || "",
            start: event.isAllDay
              ? { date: event.startAt.toISOString().split("T")[0] }
              : { dateTime: event.startAt.toISOString(), timeZone: "Asia/Jerusalem" },
            end: event.isAllDay
              ? { date: event.endAt.toISOString().split("T")[0] }
              : { dateTime: event.endAt.toISOString(), timeZone: "Asia/Jerusalem" },
            reminders: event.reminderMin
              ? {
                  useDefault: false,
                  overrides: [{ method: "popup", minutes: event.reminderMin }],
                }
              : { useDefault: true },
          };

          const gcalRes = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(gcalEvent),
            }
          );

          if (gcalRes.ok) {
            const gcalData = await gcalRes.json();
            await prisma.crmCalendarEvent.update({
              where: { id: event.id },
              data: { googleEventId: gcalData.id },
            });
            synced++;
          }
        } catch { /* skip failed event */ }
      }

      await prisma.designerGoogleCalendar.update({
        where: { designerId },
        data: { lastSyncAt: new Date(), syncEnabled: true },
      });

      return NextResponse.json({ synced, total: events.length });
    }

    if (action === "disconnect") {
      await prisma.designerGoogleCalendar.update({
        where: { designerId },
        data: { accessToken: null, refreshToken: null, calendarId: null, syncEnabled: false },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "פעולה לא מוכרת" }, { status: 400 });
  } catch (error) {
    console.error("Google Calendar action error:", error);
    return NextResponse.json({ error: "שגיאה" }, { status: 500 });
  }
}
