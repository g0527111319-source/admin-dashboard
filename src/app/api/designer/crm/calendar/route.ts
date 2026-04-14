import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/designer/crm/calendar
export async function GET(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const clientId = searchParams.get("clientId");
    const projectId = searchParams.get("projectId");

    const where: Record<string, unknown> = { designerId };

    if (start || end) {
      where.startAt = {};
      if (start) {
        (where.startAt as Record<string, unknown>).gte = new Date(start);
      }
      if (end) {
        (where.startAt as Record<string, unknown>).lte = new Date(end);
      }
    }

    if (clientId) where.clientId = clientId;
    if (projectId) where.projectId = projectId;

    const events = await prisma.crmCalendarEvent.findMany({
      where,
      orderBy: { startAt: "asc" },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("CRM calendar events fetch error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת אירועי יומן" },
      { status: 500 }
    );
  }
}

// POST /api/designer/crm/calendar
export async function POST(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      description,
      startAt,
      endAt,
      location,
      isAllDay,
      color,
      projectId,
      clientId,
      reminderMin,
    } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { error: "כותרת היא שדה חובה" },
        { status: 400 }
      );
    }

    if (!startAt || !endAt) {
      return NextResponse.json(
        { error: "זמן התחלה וסיום הם שדות חובה" },
        { status: 400 }
      );
    }

    const event = await prisma.crmCalendarEvent.create({
      data: {
        designerId,
        title: title.trim(),
        description: description?.trim() || null,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        location: location?.trim() || null,
        isAllDay: isAllDay ?? false,
        color: color || null,
        projectId: projectId || null,
        clientId: clientId || null,
        reminderMin: reminderMin ?? null,
      },
    });

    // Auto-sync to Google Calendar if connected
    try {
      const gcalConfig = await prisma.designerGoogleCalendar.findUnique({
        where: { designerId },
      });

      if (gcalConfig?.accessToken && gcalConfig.syncEnabled) {
        let accessToken = gcalConfig.accessToken;

        // Refresh token if available
        if (gcalConfig.refreshToken) {
          try {
            const clientId_g = process.env.GOOGLE_CLIENT_ID;
            const clientSecret_g = process.env.GOOGLE_CLIENT_SECRET;
            if (clientId_g && clientSecret_g) {
              const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                  client_id: clientId_g,
                  client_secret: clientSecret_g,
                  refresh_token: gcalConfig.refreshToken,
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
            }
          } catch { /* use existing token */ }
        }

        // Push event to Google Calendar
        const calendarId = gcalConfig.calendarId || "primary";
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
            ? { useDefault: false, overrides: [{ method: "popup", minutes: event.reminderMin }] }
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
          // Return the updated event with googleEventId
          return NextResponse.json({ ...event, googleEventId: gcalData.id, googleSynced: true }, { status: 201 });
        }
      }
    } catch (syncErr) {
      console.error("Auto-sync to Google Calendar failed:", syncErr);
      // Event was created successfully, just sync failed — still return success
    }

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("CRM calendar event create error:", error);
    return NextResponse.json(
      { error: "שגיאה ביצירת אירוע יומן" },
      { status: 500 }
    );
  }
}

// DELETE /api/designer/crm/calendar?eventId=xxx
export async function DELETE(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json({ error: "חסר מזהה אירוע" }, { status: 400 });
    }

    const event = await prisma.crmCalendarEvent.findUnique({
      where: { id: eventId },
    });

    if (!event || event.designerId !== designerId) {
      return NextResponse.json({ error: "אירוע לא נמצא" }, { status: 404 });
    }

    await prisma.crmCalendarEvent.delete({ where: { id: eventId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CRM calendar event delete error:", error);
    return NextResponse.json(
      { error: "שגיאה במחיקת אירוע" },
      { status: 500 }
    );
  }
}
