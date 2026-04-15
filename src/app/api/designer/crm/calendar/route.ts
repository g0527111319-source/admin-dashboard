import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { clientMeetingInviteEmail, sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// ──────────────────────────────────────────────────────────────────────────────
// Defaults & constants
// ──────────────────────────────────────────────────────────────────────────────

/** Designer-facing reminder default: 1h before event. The designer can
 *  override in the UI, or explicitly pass `reminderMin: null` for no
 *  reminder at all. */
const DEFAULT_REMINDER_MIN = 60;

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/designer/crm/calendar — list events for the authenticated designer
// ──────────────────────────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Fetch the client scoped to this designer. Returns null if the client
 *  doesn't exist OR doesn't belong to this designer — critical for
 *  cross-tenant isolation when sending emails. */
async function loadOwnedClient(clientId: string, designerId: string) {
  return prisma.crmClient.findFirst({
    where: { id: clientId, designerId, deletedAt: null },
  });
}

/** Fetch the designer (for use in email "from name"). */
async function loadDesignerName(designerId: string) {
  const d = await prisma.designer.findUnique({
    where: { id: designerId },
    select: { fullName: true, firstName: true },
  });
  return d?.fullName || d?.firstName || "Designer";
}

/** Type for the minimum fields we need off a calendar event to send
 *  the client-facing invite. */
type InviteCapableEvent = {
  id: string;
  title: string;
  description: string | null;
  startAt: Date;
  endAt: Date;
  location: string | null;
  clientId: string | null;
};

/** Send the "meeting invite" email to the client, if they have an email on
 *  file, and return whether the email was sent. Swallows email errors — a
 *  failed email shouldn't block event creation. */
async function sendClientInvite(
  event: InviteCapableEvent,
  designerId: string
): Promise<boolean> {
  if (!event.clientId) return false;
  const client = await loadOwnedClient(event.clientId, designerId);
  if (!client) return false;
  const toEmail = client.email || client.partner1Email;
  if (!toEmail) return false;

  const designerName = await loadDesignerName(designerId);
  const language = (client as unknown as { language?: string | null }).language || "he";

  const template = clientMeetingInviteEmail({
    clientName: client.name,
    designerName,
    language,
    title: event.title,
    startAt: event.startAt,
    endAt: event.endAt,
    location: event.location,
    description: event.description,
  });

  try {
    await sendEmail({ to: toEmail, subject: template.subject, html: template.html });
    return true;
  } catch (err) {
    console.error("Client meeting invite send failed:", err);
    return false;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/designer/crm/calendar — create a new event / task / meeting
// ──────────────────────────────────────────────────────────────────────────────
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
      // New fields:
      eventType,          // "event" | "task" | "meeting" | "reminder"
      notifyClient,       // boolean — email the client a meeting invite on create
      clientReminderHours, // number | null — hours before to email the client a reminder
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

    // Reminder defaulting: undefined → 60 (default); explicit null → no reminder.
    // The client-side form sends null when "ללא תזכורת" is chosen.
    const resolvedReminderMin: number | null =
      reminderMin === null
        ? null
        : typeof reminderMin === "number"
          ? reminderMin
          : DEFAULT_REMINDER_MIN;

    // Client-reminder resolution: only valid when a client is attached. Null = off.
    const resolvedClientReminderHours: number | null =
      clientId && typeof clientReminderHours === "number" && clientReminderHours > 0
        ? clientReminderHours
        : null;

    // Validate new event type. Falls back to "event" for anything unexpected.
    const resolvedEventType =
      eventType === "task" || eventType === "meeting" || eventType === "reminder"
        ? eventType
        : "event";

    // If the client actually belongs to a different designer, drop the link
    // rather than blindly trusting the request body (cross-tenant defense).
    let safeClientId: string | null = null;
    if (clientId) {
      const ownedClient = await loadOwnedClient(clientId, designerId);
      if (ownedClient) safeClientId = clientId;
    }
    // Same check for project.
    let safeProjectId: string | null = null;
    if (projectId) {
      const ownedProject = await prisma.crmProject.findFirst({
        where: { id: projectId, designerId, deletedAt: null },
        select: { id: true },
      });
      if (ownedProject) safeProjectId = projectId;
    }

    // Base fields that are guaranteed to exist even on unmigrated DBs.
    const baseData = {
      designerId,
      title: title.trim(),
      description: description?.trim() || null,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      location: location?.trim() || null,
      isAllDay: isAllDay ?? false,
      color: color || null,
      projectId: safeProjectId,
      clientId: safeClientId,
      reminderMin: resolvedReminderMin,
    };

    // Extended fields — new columns added in this release.
    const extendedData = {
      ...baseData,
      eventType: resolvedEventType,
      notifyClient: Boolean(notifyClient) && Boolean(safeClientId),
      clientReminderHours: resolvedClientReminderHours,
    };

    // Try full insert; fall back to core fields if the DB isn't migrated yet.
    let event: InviteCapableEvent & Record<string, unknown>;
    try {
      event = (await prisma.crmCalendarEvent.create({ data: extendedData })) as typeof event;
    } catch (err) {
      console.warn("calendar create with extended fields failed, falling back:", err);
      event = (await prisma.crmCalendarEvent.create({ data: baseData })) as typeof event;
    }

    // Log activity for client/project history
    if (safeClientId || safeProjectId) {
      try {
        const eventDate = new Date(startAt);
        const dateStr = eventDate.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
        const timeStr = (isAllDay ?? false) ? "כל היום" : eventDate.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
        await prisma.crmActivityLog.create({
          data: {
            designerId,
            action: "meeting_scheduled",
            projectId: safeProjectId,
            clientId: safeClientId,
            entityType: "calendar_event",
            entityId: event.id,
            metadata: {
              title: title.trim(),
              date: dateStr,
              time: timeStr,
              ...(location?.trim() ? { location: location.trim() } : {}),
            },
          },
        });
      } catch (logErr) {
        console.error("Activity log creation failed:", logErr);
      }
    }

    // Send the client invite immediately if the designer asked for it.
    // notifyClient is only honoured when there's an owned client attached.
    if (Boolean(notifyClient) && safeClientId) {
      const sent = await sendClientInvite(event, designerId);
      if (sent) {
        try {
          await prisma.crmCalendarEvent.update({
            where: { id: event.id },
            data: { clientNotifiedAt: new Date() },
          });
        } catch {
          // Column may not exist on unmigrated DB — not fatal, email was sent.
        }
      }
    }

    // Auto-sync to Google Calendar if connected
    try {
      const gcalConfig = await prisma.designerGoogleCalendar.findUnique({
        where: { designerId },
      });

      if (gcalConfig?.accessToken) {
        let accessToken = gcalConfig.accessToken;
        const clientId_g = process.env.GOOGLE_CLIENT_ID || "";
        const clientSecret_g = process.env.GOOGLE_CLIENT_SECRET || "";

        // Always refresh token to ensure it's valid
        if (gcalConfig.refreshToken && clientId_g && clientSecret_g) {
          try {
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
          } catch { /* use existing token */ }
        }

        // Push event to Google Calendar
        const calendarId = gcalConfig.calendarId || "primary";
        const eventIsAllDay = (event as unknown as { isAllDay: boolean }).isAllDay;
        const eventStartAt = (event as unknown as { startAt: Date }).startAt;
        const eventEndAt = (event as unknown as { endAt: Date }).endAt;
        const eventReminderMin = (event as unknown as { reminderMin: number | null }).reminderMin;

        const gcalEvent: Record<string, unknown> = {
          summary: event.title,
          description: event.description || "",
          location: event.location || "",
          start: eventIsAllDay
            ? { date: eventStartAt.toISOString().split("T")[0] }
            : { dateTime: eventStartAt.toISOString(), timeZone: "Asia/Jerusalem" },
          end: eventIsAllDay
            ? { date: eventEndAt.toISOString().split("T")[0] }
            : { dateTime: eventEndAt.toISOString(), timeZone: "Asia/Jerusalem" },
          reminders: eventReminderMin
            ? { useDefault: false, overrides: [{ method: "popup", minutes: eventReminderMin }] }
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
          return NextResponse.json({ ...event, googleEventId: gcalData.id, googleSynced: true }, { status: 201 });
        } else {
          const errText = await gcalRes.text().catch(() => "");
          console.error("Google Calendar auto-sync failed:", gcalRes.status, errText);
        }
      }
    } catch (syncErr) {
      console.error("Auto-sync to Google Calendar failed:", syncErr);
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

// ──────────────────────────────────────────────────────────────────────────────
// PATCH /api/designer/crm/calendar?eventId=xxx — update an event
// ──────────────────────────────────────────────────────────────────────────────
// Allows the designer to change reminder time (or cancel it with `null`),
// toggle the client-notify flag (a newly-turned-on notifyClient sends an
// invite once), tweak the client reminder hours, or edit content fields.
//
// Ownership: verifies `event.designerId === designerId` before any mutation.
// If the caller changes `clientId`/`projectId`, we re-verify that the new
// owner is still the same designer.
// ──────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
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

    const existing = await prisma.crmCalendarEvent.findUnique({ where: { id: eventId } });
    if (!existing || existing.designerId !== designerId) {
      return NextResponse.json({ error: "אירוע לא נמצא" }, { status: 404 });
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
      eventType,
      notifyClient,
      clientReminderHours,
    } = body;

    const updateData: Record<string, unknown> = {};

    if (title !== undefined) updateData.title = title?.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (startAt !== undefined) updateData.startAt = new Date(startAt);
    if (endAt !== undefined) updateData.endAt = new Date(endAt);
    if (location !== undefined) updateData.location = location?.trim() || null;
    if (isAllDay !== undefined) updateData.isAllDay = Boolean(isAllDay);
    if (color !== undefined) updateData.color = color || null;
    if (reminderMin !== undefined) {
      // null means "no reminder"; number kept as-is; anything else dropped.
      updateData.reminderMin = reminderMin === null ? null : typeof reminderMin === "number" ? reminderMin : undefined;
    }

    // Cross-tenant guard on new clientId / projectId.
    if (clientId !== undefined) {
      if (clientId === null) {
        updateData.clientId = null;
      } else {
        const owned = await loadOwnedClient(clientId, designerId);
        if (owned) updateData.clientId = clientId;
      }
    }
    if (projectId !== undefined) {
      if (projectId === null) {
        updateData.projectId = null;
      } else {
        const ownedProject = await prisma.crmProject.findFirst({
          where: { id: projectId, designerId, deletedAt: null },
          select: { id: true },
        });
        if (ownedProject) updateData.projectId = projectId;
      }
    }

    // Extended fields
    const extendedUpdate: Record<string, unknown> = { ...updateData };
    if (eventType !== undefined) {
      extendedUpdate.eventType =
        eventType === "task" || eventType === "meeting" || eventType === "reminder"
          ? eventType
          : "event";
    }
    if (notifyClient !== undefined) extendedUpdate.notifyClient = Boolean(notifyClient);
    if (clientReminderHours !== undefined) {
      extendedUpdate.clientReminderHours =
        clientReminderHours === null ? null : typeof clientReminderHours === "number" && clientReminderHours > 0 ? clientReminderHours : null;
      // If the hours change, we re-enable the reminder by clearing the sent-at timestamp.
      extendedUpdate.clientReminderSentAt = null;
    }

    let updated;
    try {
      updated = await prisma.crmCalendarEvent.update({
        where: { id: eventId },
        data: extendedUpdate,
      });
    } catch (err) {
      console.warn("calendar PATCH with extended fields failed, falling back:", err);
      updated = await prisma.crmCalendarEvent.update({
        where: { id: eventId },
        data: updateData,
      });
    }

    // If notifyClient was newly set to true (and wasn't before), send an invite.
    // We guard against double-send by checking clientNotifiedAt wasn't already set.
    const existingNotifyClient = (existing as unknown as { notifyClient?: boolean }).notifyClient;
    const existingClientNotifiedAt = (existing as unknown as { clientNotifiedAt?: Date | null }).clientNotifiedAt;
    if (
      notifyClient === true &&
      !existingNotifyClient &&
      !existingClientNotifiedAt &&
      updated.clientId
    ) {
      const sent = await sendClientInvite(
        {
          id: updated.id,
          title: updated.title,
          description: updated.description,
          startAt: updated.startAt,
          endAt: updated.endAt,
          location: updated.location,
          clientId: updated.clientId,
        },
        designerId
      );
      if (sent) {
        try {
          await prisma.crmCalendarEvent.update({
            where: { id: updated.id },
            data: { clientNotifiedAt: new Date() },
          });
        } catch {
          // Unmigrated DB — invite was still sent successfully.
        }
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("CRM calendar event update error:", error);
    return NextResponse.json(
      { error: "שגיאה בעדכון אירוע" },
      { status: 500 }
    );
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// DELETE /api/designer/crm/calendar?eventId=xxx
// ──────────────────────────────────────────────────────────────────────────────
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
