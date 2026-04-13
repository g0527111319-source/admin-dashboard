import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/designer/crm/tasks — all tasks for designer
export async function GET(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = { designerId };
    if (clientId) where.clientId = clientId;
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;

    const tasks = await prisma.crmTask.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { sortOrder: "asc" }],
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Tasks fetch error:", error);
    return NextResponse.json({ error: "שגיאה" }, { status: 500 });
  }
}

// POST /api/designer/crm/tasks — create task
export async function POST(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const body = await req.json();
    const { title, description, dueDate, clientId, projectId, assignee } = body;

    if (!title?.trim()) return NextResponse.json({ error: "חסר כותרת" }, { status: 400 });

    const task = await prisma.crmTask.create({
      data: {
        designerId,
        title: title.trim(),
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        clientId: clientId || null,
        projectId: projectId || null,
        assignee: assignee || null,
      },
      include: {
        project: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Task create error:", error);
    return NextResponse.json({ error: "שגיאה" }, { status: 500 });
  }
}

// PATCH /api/designer/crm/tasks — update task
export async function PATCH(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });

    // Status change logic
    if (updates.status === "DONE") updates.completedAt = new Date();
    if (updates.status && updates.status !== "DONE") updates.completedAt = null;
    if (updates.dueDate) updates.dueDate = new Date(updates.dueDate);

    const task = await prisma.crmTask.update({
      where: { id },
      data: updates,
      include: {
        project: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("Task update error:", error);
    return NextResponse.json({ error: "שגיאה" }, { status: 500 });
  }
}

// DELETE /api/designer/crm/tasks — delete task
export async function DELETE(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) return NextResponse.json({ error: "לא מחובר" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("id");
    if (!taskId) return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });

    await prisma.crmTask.delete({ where: { id: taskId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Task delete error:", error);
    return NextResponse.json({ error: "שגיאה" }, { status: 500 });
  }
}
