export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/designer/crm/projects/[projectId]/tasks — רשימת משימות
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { projectId } = await params;

    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    const tasks = await prisma.crmTask.findMany({
      where: { projectId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("CRM tasks fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת משימות" }, { status: 500 });
  }
}

// POST /api/designer/crm/projects/[projectId]/tasks — יצירת משימה
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { projectId } = await params;

    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    const body = await req.json();
    const { title, description, assignee, dueDate, status } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "כותרת משימה היא שדה חובה" }, { status: 400 });
    }

    // Get max sort order
    const maxTask = await prisma.crmTask.findFirst({
      where: { projectId },
      orderBy: { sortOrder: "desc" },
    });

    const task = await prisma.crmTask.create({
      data: {
        projectId,
        title: title.trim(),
        ...(description !== undefined && { description: description.trim() }),
        ...(assignee !== undefined && { assignee: assignee.trim() }),
        ...(dueDate !== undefined && { dueDate: new Date(dueDate) }),
        ...(status !== undefined && { status }),
        sortOrder: (maxTask?.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("CRM task create error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת משימה" }, { status: 500 });
  }
}
