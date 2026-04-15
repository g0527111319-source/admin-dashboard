export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/designer/today
 *
 * One-shot payload for the "Today" home dashboard:
 *  - meetings / events scheduled for today
 *  - tasks due today or overdue
 *  - recent activity that the designer hasn't seen
 *  - this-week snapshot (meetings count, tasks done, messages, revenue)
 *
 * Consolidated endpoint so the home screen loads in a single round-trip.
 * Every query is scoped to the authenticated designer.
 */
export async function GET(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 6); // last 7 days window
    startOfWeek.setHours(0, 0, 0, 0);

    // Events for today (wrapped in try/catch — new schema fields may not exist yet)
    let todayEvents: Array<{
      id: string;
      title: string;
      startAt: Date;
      endAt: Date | null;
      location: string | null;
      clientId: string | null;
      client: { id: string; name: string } | null;
    }> = [];
    try {
      const events = await prisma.crmCalendarEvent.findMany({
        where: {
          designerId,
          startAt: { gte: startOfToday, lte: endOfToday },
        },
        orderBy: { startAt: "asc" },
        select: {
          id: true,
          title: true,
          startAt: true,
          endAt: true,
          location: true,
          clientId: true,
          client: { select: { id: true, name: true } },
        },
      });
      todayEvents = events as typeof todayEvents;
    } catch {
      todayEvents = [];
    }

    // Tasks — open (TODO or IN_PROGRESS), due today or overdue
    const tasks = await prisma.crmTask
      .findMany({
        where: {
          designerId,
          status: { in: ["TODO", "IN_PROGRESS"] },
          OR: [
            { dueDate: { lte: endOfToday } },
            { dueDate: null, createdAt: { lte: endOfToday } },
          ],
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        take: 20,
        select: {
          id: true,
          title: true,
          dueDate: true,
          status: true,
          client: { select: { id: true, name: true } },
        },
      })
      .catch(() => []);

    // Weekly snapshot
    const [
      weekEventsCount,
      weekTasksDone,
      weekMessagesFromClients,
      weekClientsNew,
      prevWeekEventsCount,
    ] = await Promise.all([
      prisma.crmCalendarEvent
        .count({
          where: { designerId, startAt: { gte: startOfWeek, lte: now } },
        })
        .catch(() => 0),
      prisma.crmTask
        .count({
          where: { designerId, status: "DONE", completedAt: { gte: startOfWeek } },
        })
        .catch(() => 0),
      prisma.crmProjectMessage
        .count({
          where: {
            project: { designerId },
            createdAt: { gte: startOfWeek },
            senderType: "client",
          },
        })
        .catch(() => 0),
      prisma.crmClient
        .count({
          where: { designerId, deletedAt: null, createdAt: { gte: startOfWeek } },
        })
        .catch(() => 0),
      prisma.crmCalendarEvent
        .count({
          where: {
            designerId,
            startAt: {
              gte: new Date(startOfWeek.getTime() - 7 * 24 * 60 * 60 * 1000),
              lt: startOfWeek,
            },
          },
        })
        .catch(() => 0),
    ]);

    // Unread message preview — top 3 most recent client messages
    const unreadPreviews = await prisma.crmProjectMessage
      .findMany({
        where: {
          project: { designerId },
          senderType: "client",
          isRead: false,
        },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          content: true,
          createdAt: true,
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

    return NextResponse.json({
      today: {
        events: todayEvents.map((e) => ({
          id: e.id,
          title: e.title,
          startAt: e.startAt,
          endAt: e.endAt,
          location: e.location,
          clientName: e.client?.name ?? null,
          clientId: e.client?.id ?? null,
        })),
        tasks: (tasks as Array<{
          id: string;
          title: string;
          dueDate: Date | null;
          status: string;
          client: { id: string; name: string } | null;
        }>).map((t) => ({
          id: t.id,
          title: t.title,
          dueDate: t.dueDate,
          status: t.status,
          clientName: t.client?.name ?? null,
          clientId: t.client?.id ?? null,
          overdue: t.dueDate ? new Date(t.dueDate) < startOfToday : false,
        })),
      },
      week: {
        events: weekEventsCount,
        eventsPrev: prevWeekEventsCount,
        tasksDone: weekTasksDone,
        messagesFromClients: weekMessagesFromClients,
        clientsNew: weekClientsNew,
      },
      inbox: {
        preview: unreadPreviews.map((m) => ({
          id: m.id,
          content: m.content?.slice(0, 140) ?? "",
          createdAt: m.createdAt,
          clientName: m.project?.client?.name ?? null,
          clientId: m.project?.client?.id ?? null,
          projectName: m.project?.name ?? null,
        })),
      },
    });
  } catch (error) {
    console.error("designer/today error:", error);
    return NextResponse.json({ error: "שגיאת טעינה" }, { status: 500 });
  }
}
