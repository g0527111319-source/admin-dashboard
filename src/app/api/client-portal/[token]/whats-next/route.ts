export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/client-portal/[token]/whats-next
 *
 * Returns a single, friendly "what's next" summary for the client:
 *  - current phase + sort position
 *  - nearest upcoming calendar event (meeting / site visit)
 *  - next pending approval request (if any)
 *  - next client-visible document they haven't opened
 *  - a short encouragement string based on phase progress
 *
 * This drives the hero widget on the client portal home page —
 * the goal is to answer "what is happening now?" at a glance.
 */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const portalToken = await prisma.clientPortalToken.findUnique({
      where: { token },
      include: { client: true },
    });
    if (!portalToken || !portalToken.isActive) {
      return NextResponse.json({ error: "קישור לא תקין" }, { status: 404 });
    }
    if (portalToken.client.deletedAt) {
      return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
    }
    const clientId = portalToken.clientId;

    const now = new Date();
    const in14d = new Date(now.getTime() + 14 * 86400_000);

    const activeProject = await prisma.crmProject.findFirst({
      where: { clientId, deletedAt: null, status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        designerId: true,
        phases: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            sortOrder: true,
            isCurrent: true,
            isCompleted: true,
            deadline: true,
          },
        },
      },
    });

    if (!activeProject) {
      return NextResponse.json({
        hasActive: false,
        message: "אין כרגע פרויקט פעיל. תודה שאת/ה איתנו!",
      });
    }

    const totalPhases = activeProject.phases.length;
    const completedPhases = activeProject.phases.filter((p) => p.isCompleted).length;
    const currentPhase =
      activeProject.phases.find((p) => p.isCurrent) ||
      activeProject.phases.find((p) => !p.isCompleted) ||
      null;

    const progress =
      totalPhases === 0
        ? 0
        : Math.round((completedPhases / totalPhases) * 100);

    const [nextEvent, pendingApproval, freshDoc] = await Promise.all([
      prisma.crmCalendarEvent
        .findFirst({
          where: {
            clientId,
            startAt: { gte: now, lte: in14d },
          },
          orderBy: { startAt: "asc" },
          select: {
            id: true,
            title: true,
            startAt: true,
            location: true,
          },
        })
        .catch(() => null),
      prisma.crmApprovalRequest
        .findFirst({
          where: {
            projectId: activeProject.id,
            status: "PENDING_CLIENT",
          },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            description: true,
            createdAt: true,
          },
        })
        .catch(() => null),
      prisma.crmProjectDocument
        .findFirst({
          where: {
            projectId: activeProject.id,
            isVisibleToClient: true,
          },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            createdAt: true,
          },
        })
        .catch(() => null),
    ]);

    // Light encouragement string based on progress
    let headline = "אנחנו ממשיכים קדימה בקצב טוב.";
    if (progress >= 80) {
      headline = "אנחנו בקו הסיום — עוד מעט הדירה שלך מוכנה ✨";
    } else if (progress >= 50) {
      headline = "יותר מחצי הדרך כבר מאחורינו!";
    } else if (progress > 0) {
      headline = "התקדמות יפה — ממשיכים לעבוד לך על הבית.";
    } else if (totalPhases > 0) {
      headline = "התחלנו את העבודה. הנה מה שצפוי קדימה:";
    }

    return NextResponse.json({
      hasActive: true,
      project: { id: activeProject.id, name: activeProject.name },
      headline,
      progress,
      phases: {
        total: totalPhases,
        completed: completedPhases,
        current: currentPhase
          ? {
              id: currentPhase.id,
              name: currentPhase.name,
              deadline: currentPhase.deadline,
            }
          : null,
      },
      nextEvent,
      pendingApproval,
      freshDoc,
    });
  } catch (error) {
    console.error("whats-next error:", error);
    return NextResponse.json({ error: "שגיאת טעינה" }, { status: 500 });
  }
}
