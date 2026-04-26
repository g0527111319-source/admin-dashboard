export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

/**
 * GET /api/designer/search?q=...
 *
 * Unified search for the command palette. Returns clients, projects,
 * and upcoming events matching the query. Scoped to the authenticated
 * designer — no cross-tenant leakage.
 *
 * Limits: up to 5 items per category, total ~15 results. Keep the
 * response small so the palette stays snappy.
 */
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    // Empty query → return recent items (last 5 clients, next 3 events).
    // This makes the palette useful for "open my most recent thing quickly".
    if (q.length === 0) {
      const [recentClients, upcomingEvents] = await Promise.all([
        prisma.crmClient.findMany({
          where: { designerId, deletedAt: null },
          orderBy: { updatedAt: "desc" },
          take: 5,
          select: { id: true, name: true, phone: true },
        }),
        prisma.crmCalendarEvent.findMany({
          where: {
            designerId,
            startAt: { gte: new Date() },
          },
          orderBy: { startAt: "asc" },
          take: 3,
          select: { id: true, title: true, startAt: true, clientId: true },
        }).catch(() => []),
      ]);

      return NextResponse.json({
        recent: true,
        clients: recentClients.map((c) => ({
          kind: "client" as const,
          id: c.id,
          title: c.name,
          subtitle: c.phone || undefined,
        })),
        projects: [],
        events: (upcomingEvents as Array<{ id: string; title: string; startAt: Date; clientId: string | null }>).map((e) => ({
          kind: "event" as const,
          id: e.id,
          title: e.title,
          subtitle: new Intl.DateTimeFormat("he-IL", {
            weekday: "short",
            day: "numeric",
            month: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(e.startAt)),
          clientId: e.clientId,
        })),
      });
    }

    // Actual search — use `contains` on the relevant text columns.
    // Prisma doesn't have per-field trigram, but for <10k rows per
    // tenant this is plenty.
    const [clients, projects] = await Promise.all([
      prisma.crmClient.findMany({
        where: {
          designerId,
          deletedAt: null,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true, phone: true },
      }),
      prisma.crmProject.findMany({
        where: {
          designerId,
          deletedAt: null,
          name: { contains: q, mode: "insensitive" },
        },
        take: 5,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          status: true,
          client: { select: { id: true, name: true } },
        },
      }),
    ]);

    return NextResponse.json({
      recent: false,
      clients: clients.map((c) => ({
        kind: "client" as const,
        id: c.id,
        title: c.name,
        subtitle: c.phone || undefined,
      })),
      projects: projects.map((p) => ({
        kind: "project" as const,
        id: p.id,
        title: p.name,
        subtitle: p.client?.name,
        clientId: p.client?.id,
      })),
      events: [],
    });
  } catch (error) {
    console.error("designer/search error:", error);
    return NextResponse.json({ error: "שגיאת חיפוש" }, { status: 500 });
  }
}
