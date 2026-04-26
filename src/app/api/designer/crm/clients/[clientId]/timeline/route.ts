export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

/**
 * GET /api/designer/crm/clients/:clientId/timeline?limit=50
 *
 * Builds a chronological feed for a single client combining:
 *  - Activity log rows (phase transitions, approvals, uploads, etc.)
 *  - Project messages (both directions)
 *  - Calendar events (past and upcoming, tagged accordingly)
 *  - Quotes / contracts lifecycle events via ActivityLog
 *
 * Scoped to the authenticated designer for ownership. Each entry
 * has a uniform shape so the timeline component renders one list.
 */

interface TimelineItem {
  id: string;
  kind:
    | "activity"
    | "message"
    | "event_past"
    | "event_upcoming"
    | "note";
  at: Date;
  title: string;
  detail: string | null;
  actor: "designer" | "client" | "system" | null;
  meta: Record<string, unknown> | null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { clientId: string } }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;
    const clientId = params.clientId;
    const limit = Math.min(
      Number(new URL(req.url).searchParams.get("limit") ?? 50),
      200
    );

    // Verify ownership
    const client = await prisma.crmClient.findFirst({
      where: { id: clientId, designerId, deletedAt: null },
      select: { id: true, name: true, createdAt: true },
    });
    if (!client) {
      return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });
    }

    const [activity, messages, events] = await Promise.all([
      prisma.crmActivityLog
        .findMany({
          where: { designerId, clientId },
          orderBy: { createdAt: "desc" },
          take: limit,
          select: {
            id: true,
            action: true,
            entityType: true,
            entityId: true,
            metadata: true,
            actorType: true,
            createdAt: true,
          },
        })
        .catch(() => []),
      prisma.crmProjectMessage
        .findMany({
          where: { project: { clientId, designerId } },
          orderBy: { createdAt: "desc" },
          take: limit,
          select: {
            id: true,
            content: true,
            senderType: true,
            createdAt: true,
            projectId: true,
          },
        })
        .catch(() => []),
      prisma.crmCalendarEvent
        .findMany({
          where: { designerId, clientId },
          orderBy: { startAt: "desc" },
          take: limit,
          select: {
            id: true,
            title: true,
            startAt: true,
            endAt: true,
            location: true,
            description: true,
          },
        })
        .catch(() => []),
    ]);

    const items: TimelineItem[] = [];
    const now = new Date();

    // Activity log entries — map action to friendly Hebrew title.
    for (const a of activity) {
      items.push({
        id: `act:${a.id}`,
        kind: "activity",
        at: a.createdAt,
        title: actionTitle(a.action, a.entityType),
        detail: actionDetail(a.action, a.metadata),
        actor:
          (a.actorType as TimelineItem["actor"]) ||
          (a.actorType === "client" ? "client" : "designer"),
        meta: {
          action: a.action,
          entityType: a.entityType,
          entityId: a.entityId,
        },
      });
    }

    for (const m of messages) {
      items.push({
        id: `msg:${m.id}`,
        kind: "message",
        at: m.createdAt,
        title:
          m.senderType === "client"
            ? "הודעה מהלקוח"
            : "הודעה מהמעצבת",
        detail: (m.content ?? "").slice(0, 240),
        actor: m.senderType === "client" ? "client" : "designer",
        meta: { projectId: m.projectId },
      });
    }

    for (const e of events) {
      const upcoming = e.startAt > now;
      items.push({
        id: `ev:${e.id}`,
        kind: upcoming ? "event_upcoming" : "event_past",
        at: e.startAt,
        title: e.title,
        detail:
          [e.location, e.description].filter(Boolean).join(" · ") || null,
        actor: "designer",
        meta: { endAt: e.endAt },
      });
    }

    // Anchor: client onboarding
    items.push({
      id: `meta:created:${client.id}`,
      kind: "activity",
      at: client.createdAt,
      title: "הלקוח נוצר במערכת",
      detail: null,
      actor: "system",
      meta: { action: "client_created" },
    });

    items.sort((a, b) => b.at.getTime() - a.at.getTime());

    return NextResponse.json({
      client: { id: client.id, name: client.name },
      items: items.slice(0, limit),
    });
  } catch (error) {
    console.error("timeline error:", error);
    return NextResponse.json({ error: "שגיאת טעינה" }, { status: 500 });
  }
}

function actionTitle(action: string, entityType?: string | null): string {
  const map: Record<string, string> = {
    phase_completed: "שלב הושלם",
    phase_started: "שלב חדש התחיל",
    approval_sent: "נשלחה בקשה לאישור",
    approval_approved: "הלקוח אישר בקשה",
    approval_rejected: "הלקוח דחה בקשה",
    client_viewed: "הלקוח צפה בתוכן",
    client_approved: "אישור מהלקוח",
    message_sent: "נשלחה הודעה",
    photo_uploaded: "הועלתה תמונה",
    quote_sent: "הצעת מחיר נשלחה",
    quote_signed: "הצעת מחיר נחתמה",
    contract_sent: "חוזה נשלח",
    contract_signed: "חוזה נחתם",
    project_created: "פרויקט חדש נפתח",
    client_uploaded: "הלקוח העלה קובץ",
    task_completed: "משימה הושלמה",
    task_created: "משימה חדשה",
    client_created: "הלקוח נוצר במערכת",
  };
  return map[action] ?? (entityType ? `פעילות: ${entityType}` : action);
}

function actionDetail(
  action: string,
  metadata: unknown
): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const m = metadata as Record<string, unknown>;
  if (typeof m.title === "string") return m.title;
  if (typeof m.name === "string") return m.name;
  if (typeof m.note === "string") return m.note;
  if (typeof m.amount === "number")
    return `₪${(m.amount as number).toLocaleString("he-IL")}`;
  return null;
}
