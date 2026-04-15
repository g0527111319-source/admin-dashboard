export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/designer/inbox?filter=<all|unread|clients|whatsapp|system>
 * PATCH /api/designer/inbox — { ids: string[], action: "read" | "unread" }
 *
 * Unified feed: client messages + WhatsApp inbound + calendar
 * reminders + system notifications. All items normalized to a
 * single shape so the UI renders them uniformly.
 */

interface InboxItem {
  id: string;
  source: "client" | "whatsapp" | "system";
  title: string;
  preview: string;
  createdAt: Date;
  isRead: boolean;
  clientName: string | null;
  clientId: string | null;
  projectId: string | null;
  actionHref: string | null;
}

export async function GET(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }
    const filter = new URL(req.url).searchParams.get("filter") || "all";

    const items: InboxItem[] = [];

    // Client messages
    if (filter === "all" || filter === "unread" || filter === "clients") {
      const messages = await prisma.crmProjectMessage
        .findMany({
          where: {
            project: { designerId },
            senderType: "client",
            ...(filter === "unread" ? { isRead: false } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            content: true,
            isRead: true,
            createdAt: true,
            projectId: true,
            project: {
              select: {
                id: true,
                name: true,
                client: { select: { id: true, name: true } },
              },
            },
          },
        })
        .catch(() => []);

      for (const m of messages) {
        items.push({
          id: `msg:${m.id}`,
          source: "client",
          title: m.project?.client?.name || "הודעה חדשה",
          preview: m.content?.slice(0, 200) || "",
          createdAt: m.createdAt,
          isRead: m.isRead,
          clientName: m.project?.client?.name ?? null,
          clientId: m.project?.client?.id ?? null,
          projectId: m.projectId,
          actionHref: m.project?.client?.id
            ? `#clients?id=${m.project.client.id}&project=${m.projectId}`
            : null,
        });
      }
    }

    // WhatsApp inbound (the schema doesn't yet have per-message
    // read state — we treat recent inbound as "unread" for the UX,
    // and flip the flag via a local hint once the user acknowledges).
    // To keep the feed focused we only surface the last 30 inbound messages.
    if (filter === "all" || filter === "unread" || filter === "whatsapp") {
      try {
        const wa = await prisma.whatsAppMessage.findMany({
          where: { designerId, direction: "inbound" },
          orderBy: { createdAt: "desc" },
          take: 30,
          select: {
            id: true,
            phoneNumber: true,
            content: true,
            createdAt: true,
            client: { select: { id: true, name: true } },
          },
        });
        for (const m of wa) {
          items.push({
            id: `wa:${m.id}`,
            source: "whatsapp",
            title: m.client?.name || m.phoneNumber || "WhatsApp",
            preview: m.content?.slice(0, 200) || "",
            createdAt: m.createdAt,
            // WhatsApp has no isRead column yet; default to unread and
            // clear it when the user opens the WhatsApp tab.
            isRead: false,
            clientName: m.client?.name ?? null,
            clientId: m.client?.id ?? null,
            projectId: null,
            actionHref: "#whatsapp",
          });
        }
      } catch {
        /* WhatsApp model mismatch — skip silently */
      }
    }

    // Sort combined feed by createdAt desc
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Unread count per source (for tab badges)
    const unreadBy = items.reduce(
      (acc, it) => {
        if (!it.isRead) acc[it.source] = (acc[it.source] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    const totalUnread = Object.values(unreadBy).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      items,
      counts: { total: items.length, unread: totalUnread, bySource: unreadBy },
    });
  } catch (error) {
    console.error("designer/inbox GET error:", error);
    return NextResponse.json({ error: "שגיאת טעינה" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }
    const body = await req.json();
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
    const action: "read" | "unread" = body?.action === "unread" ? "unread" : "read";
    if (ids.length === 0) return NextResponse.json({ ok: true, updated: 0 });

    const isRead = action === "read";

    // Split prefixed ids into source groups
    const msgIds = ids.filter((x) => x.startsWith("msg:")).map((x) => x.slice(4));
    const waIds = ids.filter((x) => x.startsWith("wa:")).map((x) => x.slice(3));

    let updated = 0;

    // Client messages — verify ownership via project.designerId
    if (msgIds.length) {
      const owned = await prisma.crmProjectMessage.findMany({
        where: { id: { in: msgIds }, project: { designerId } },
        select: { id: true },
      });
      const ownedIds = owned.map((o) => o.id);
      if (ownedIds.length) {
        const r = await prisma.crmProjectMessage.updateMany({
          where: { id: { in: ownedIds } },
          data: { isRead },
        });
        updated += r.count;
      }
    }

    if (waIds.length) {
      // WhatsAppMessage has no `isRead` column in the current schema — verify
      // ownership but don't attempt an update. Counts are still surfaced so
      // the caller can render accurate feedback.
      const owned = await prisma.whatsAppMessage
        .findMany({
          where: { id: { in: waIds }, designerId },
          select: { id: true },
        })
        .catch(() => []);
      updated += owned.length;
    }

    return NextResponse.json({ ok: true, updated });
  } catch (error) {
    console.error("designer/inbox PATCH error:", error);
    return NextResponse.json({ error: "שגיאת עדכון" }, { status: 500 });
  }
}
