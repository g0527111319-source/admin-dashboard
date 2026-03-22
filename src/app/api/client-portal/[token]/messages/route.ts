import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/client-portal/[token]/messages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find active portal token
    const portalToken = await prisma.clientPortalToken.findUnique({
      where: { token },
      include: { client: true },
    });

    if (!portalToken || !portalToken.isActive) {
      return NextResponse.json({ error: "קישור לא תקין או לא פעיל" }, { status: 404 });
    }

    if (portalToken.client.deletedAt) {
      return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    // Get projects belonging to this client
    const clientProjects = await prisma.crmProject.findMany({
      where: {
        clientId: portalToken.clientId,
        deletedAt: null,
        ...(projectId ? { id: projectId } : {}),
      },
      select: { id: true },
    });

    const projectIds = clientProjects.map((p) => p.id);

    if (projectIds.length === 0) {
      return NextResponse.json([]);
    }

    const messages = await prisma.crmProjectMessage.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Portal messages fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת הודעות" }, { status: 500 });
  }
}

// POST /api/client-portal/[token]/messages
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find active portal token
    const portalToken = await prisma.clientPortalToken.findUnique({
      where: { token },
      include: { client: true },
    });

    if (!portalToken || !portalToken.isActive) {
      return NextResponse.json({ error: "קישור לא תקין או לא פעיל" }, { status: 404 });
    }

    if (portalToken.client.deletedAt) {
      return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });
    }

    const body = await req.json();
    const { content, projectId } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "תוכן הודעה הוא שדה חובה" }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: "מזהה פרויקט הוא שדה חובה" }, { status: 400 });
    }

    // Verify project belongs to this client
    const project = await prisma.crmProject.findFirst({
      where: {
        id: projectId,
        clientId: portalToken.clientId,
        deletedAt: null,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    const message = await prisma.crmProjectMessage.create({
      data: {
        projectId,
        senderType: "client",
        content: content.trim(),
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("Portal message create error:", error);
    return NextResponse.json({ error: "שגיאה בשליחת הודעה" }, { status: 500 });
  }
}
