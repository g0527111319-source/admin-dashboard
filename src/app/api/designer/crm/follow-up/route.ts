export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

/**
 * GET  /api/designer/crm/follow-up?eventId=... → returns a draft follow-up
 *                                                message for the meeting
 * POST /api/designer/crm/follow-up              → { eventId, message, method:
 *                                                   "chat" | "email" | "whatsapp" }
 *                                                   sends / records the
 *                                                   follow-up.
 *
 * The draft is deterministic (no LLM) — we assemble the message from the
 * event fields, client name, and a small library of Hebrew templates. The
 * designer can edit it freely before sending.
 */

interface DraftResponse {
  draft: string;
  variables: Record<string, string>;
  suggestions: Array<{ key: string; label: string; body: string }>;
  event: {
    id: string;
    title: string;
    startAt: string;
    clientName: string | null;
    clientId: string | null;
    projectId: string | null;
  };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;
    const eventId = new URL(req.url).searchParams.get("eventId");
    if (!eventId) {
      return NextResponse.json({ error: "חסר מזהה אירוע" }, { status: 400 });
    }

    const event = await prisma.crmCalendarEvent.findFirst({
      where: { id: eventId, designerId },
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        location: true,
        description: true,
        clientId: true,
        projectId: true,
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "פגישה לא נמצאה" }, { status: 404 });
    }

    const designer = await prisma.designer
      .findUnique({
        where: { id: designerId },
        select: { fullName: true, firstName: true },
      })
      .catch(() => null);

    const firstName = (event.client?.name || "").split(" ")[0] || "";
    const designerFirst =
      designer?.firstName || (designer?.fullName || "").split(" ")[0] || "";
    const dateStr = new Intl.DateTimeFormat("he-IL", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(event.startAt);

    const vars = {
      clientFirst: firstName,
      designerName: designer?.fullName || "",
      designerFirst,
      meetingTitle: event.title,
      meetingDate: dateStr,
      projectName: event.project?.name || "",
    };

    const draft = defaultTemplate(vars);

    const suggestions = buildSuggestions(vars);

    const response: DraftResponse = {
      draft,
      variables: vars,
      suggestions,
      event: {
        id: event.id,
        title: event.title,
        startAt: event.startAt.toISOString(),
        clientName: event.client?.name ?? null,
        clientId: event.clientId,
        projectId: event.projectId,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("follow-up GET error:", error);
    return NextResponse.json({ error: "שגיאת טעינה" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;
    const body = await req.json();
    const eventId: string | undefined = body?.eventId;
    const message: string = (body?.message || "").trim();
    const method: "chat" | "email" | "whatsapp" =
      body?.method === "email"
        ? "email"
        : body?.method === "whatsapp"
          ? "whatsapp"
          : "chat";

    if (!eventId || !message) {
      return NextResponse.json({ error: "חסרים שדות" }, { status: 400 });
    }

    const event = await prisma.crmCalendarEvent.findFirst({
      where: { id: eventId, designerId },
      select: { id: true, projectId: true, clientId: true, client: { select: { phone: true } } },
    });
    if (!event) {
      return NextResponse.json({ error: "פגישה לא נמצאה" }, { status: 404 });
    }

    // Persist as a project message when there's an attached project so it
    // shows up in the client chat. Always log activity regardless.
    let savedMessageId: string | null = null;
    if (method === "chat" && event.projectId) {
      const saved = await prisma.crmProjectMessage
        .create({
          data: {
            projectId: event.projectId,
            content: message,
            senderType: "designer",
            isRead: true,
          },
          select: { id: true },
        })
        .catch(() => null);
      savedMessageId = saved?.id ?? null;
    }

    await prisma.crmActivityLog
      .create({
        data: {
          designerId,
          clientId: event.clientId,
          projectId: event.projectId,
          action: "follow_up_sent",
          entityType: "calendar_event",
          entityId: event.id,
          actorType: "designer",
          metadata: { method, length: message.length } as never,
        },
      })
      .catch(() => null);

    return NextResponse.json({
      ok: true,
      method,
      savedMessageId,
      hint:
        method === "email"
          ? "המייל מוכן להעתקה/הדבקה — העתיקי ללקוח."
          : method === "whatsapp"
            ? "פתחי את ה-WhatsApp עם ההודעה המוכנה."
            : "ההודעה נשמרה בצ'אט של הפרויקט.",
    });
  } catch (error) {
    console.error("follow-up POST error:", error);
    return NextResponse.json({ error: "שגיאת שליחה" }, { status: 500 });
  }
}

function defaultTemplate(v: Record<string, string>): string {
  const { clientFirst, designerFirst, meetingTitle, meetingDate, projectName } = v;
  const hello = clientFirst ? `היי ${clientFirst}, ` : "היי, ";
  const sign = designerFirst ? `\n\nתודה,\n${designerFirst}` : "";
  const project = projectName ? ` בפרויקט "${projectName}"` : "";
  return (
    `${hello}תודה על הפגישה${project} ב${meetingDate} (${meetingTitle}).\n\n` +
    `סיכום קצר של הנקודות העיקריות שעלו:\n• \n• \n\n` +
    `הצעדים הבאים שלי:\n1. \n2. \n\n` +
    `מוזמנת/מוזמן להגיב אם צריך להוסיף משהו.${sign}`
  );
}

function buildSuggestions(
  v: Record<string, string>
): Array<{ key: string; label: string; body: string }> {
  const { clientFirst, designerFirst, projectName } = v;
  const hello = clientFirst ? `היי ${clientFirst}, ` : "היי, ";
  const sign = designerFirst ? `\n\nתודה,\n${designerFirst}` : "";
  const project = projectName ? ` ${projectName}` : "";
  return [
    {
      key: "short-thanks",
      label: "תודה קצרה",
      body: `${hello}תודה רבה על הפגישה. היה לי חשוב לפגוש אותך ולשמוע את החזון. אחזור אלייך בימים הקרובים עם ההצעה המעודכנת.${sign}`,
    },
    {
      key: "with-action",
      label: "סיכום + משימות",
      body: `${hello}סיכום הפגישה של${project}:\n• \n• \n\nהצעדים שלי:\n1. \n2. \n\nהצעדים שלך:\n1. \n2. ${sign}`,
    },
    {
      key: "design-review",
      label: "סקירת תכנון",
      body: `${hello}בעקבות הפגישה, אני עובדת על התיקונים שעלו ואשלח עדכון בתוך 3-4 ימי עסקים. אם עולה משהו נוסף — כתבי לי כאן.${sign}`,
    },
  ];
}
