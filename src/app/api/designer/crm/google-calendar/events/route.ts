import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || "").trim();
const GOOGLE_CLIENT_SECRET = (process.env.GOOGLE_CLIENT_SECRET || "").trim();

// GET — fetch Google Calendar events for display
export async function GET(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!start || !end) {
      return NextResponse.json({ error: "חסרים תאריכי התחלה וסיום" }, { status: 400 });
    }

    const config = await prisma.designerGoogleCalendar.findUnique({
      where: { designerId },
    });

    if (!config?.accessToken) {
      return NextResponse.json([]);
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

    // Fetch events from Google Calendar
    const calendarId = config.calendarId || "primary";
    const params = new URLSearchParams({
      timeMin: new Date(start).toISOString(),
      timeMax: new Date(end).toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "100",
    });

    const gcalRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!gcalRes.ok) {
      console.error("Google Calendar events fetch failed:", gcalRes.status);
      return NextResponse.json([]);
    }

    const gcalData = await gcalRes.json();
    const items = gcalData.items || [];

    // Get local events that are already synced (to avoid duplicates)
    const localSyncedIds = new Set(
      (await prisma.crmCalendarEvent.findMany({
        where: { designerId, googleEventId: { not: null } },
        select: { googleEventId: true },
      })).map(e => e.googleEventId)
    );

    // Map to our event format, excluding already-synced events
    const events = items
      .filter((item: { id: string }) => !localSyncedIds.has(item.id))
      .map((item: {
        id: string;
        summary?: string;
        description?: string;
        location?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
      }) => ({
        id: `gcal_${item.id}`,
        title: item.summary || "(ללא כותרת)",
        description: item.description || null,
        startAt: item.start?.dateTime || (item.start?.date ? `${item.start.date}T00:00:00Z` : new Date().toISOString()),
        endAt: item.end?.dateTime || (item.end?.date ? `${item.end.date}T23:59:59Z` : new Date().toISOString()),
        location: item.location || null,
        isAllDay: !item.start?.dateTime,
        color: null,
        projectId: null,
        clientId: null,
        createdAt: new Date().toISOString(),
        source: "google",
      }));

    return NextResponse.json(events);
  } catch (error) {
    console.error("Google Calendar events error:", error);
    return NextResponse.json([]);
  }
}
