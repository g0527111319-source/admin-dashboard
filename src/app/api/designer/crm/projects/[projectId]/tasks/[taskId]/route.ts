export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// PATCH /api/designer/crm/projects/[projectId]/tasks/[taskId] — עדכון משימה
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; taskId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { projectId, taskId } = await params;

    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    // SECURITY: verify the task belongs to this designer AND this project.
    const existingTask = await prisma.crmTask.findFirst({
      where: { id: taskId, projectId, designerId },
    });
    if (!existingTask) {
      return NextResponse.json({ error: "משימה לא נמצאה" }, { status: 404 });
    }

    const body = await req.json();
    const { title, description, assignee, dueDate, status } = body;

    const task = await prisma.crmTask.update({
      where: { id: taskId },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() ?? null }),
        ...(assignee !== undefined && { assignee: assignee?.trim() ?? null }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(status !== undefined && {
          status,
          ...(status === "DONE" ? { completedAt: new Date() } : { completedAt: null }),
        }),
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("CRM task update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון משימה" }, { status: 500 });
  }
}

// DELETE /api/designer/crm/projects/[projectId]/tasks/[taskId] — מחיקת משימה
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; taskId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { projectId, taskId } = await params;

    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    // SECURITY: verify the task belongs to this designer AND this project.
    const existingTask = await prisma.crmTask.findFirst({
      where: { id: taskId, projectId, designerId },
    });
    if (!existingTask) {
      return NextResponse.json({ error: "משימה לא נמצאה" }, { status: 404 });
    }

    await prisma.crmTask.delete({ where: { id: taskId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CRM task delete error:", error);
    return NextResponse.json({ error: "שגיאה במחיקת משימה" }, { status: 500 });
  }
}
