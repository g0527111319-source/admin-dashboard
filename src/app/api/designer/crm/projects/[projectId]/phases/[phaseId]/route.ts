import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// PATCH /api/designer/crm/projects/[projectId]/phases/[phaseId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; phaseId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { projectId, phaseId } = await params;

    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    const body = await req.json();
    const { name, isCurrent, isCompleted } = body;

    // If marking as current, unset all others
    if (isCurrent) {
      await prisma.crmProjectPhase.updateMany({
        where: { projectId },
        data: { isCurrent: false },
      });
    }

    const phase = await prisma.crmProjectPhase.update({
      where: { id: phaseId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(isCurrent !== undefined && { isCurrent }),
        ...(isCompleted !== undefined && {
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
          ...(isCompleted && !isCurrent ? {} : {}),
        }),
        ...(isCurrent && { startedAt: new Date() }),
      },
    });

    return NextResponse.json(phase);
  } catch (error) {
    console.error("CRM phase update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון שלב" }, { status: 500 });
  }
}

// DELETE /api/designer/crm/projects/[projectId]/phases/[phaseId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; phaseId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { projectId, phaseId } = await params;

    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    await prisma.crmProjectPhase.delete({ where: { id: phaseId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CRM phase delete error:", error);
    return NextResponse.json({ error: "שגיאה במחיקת שלב" }, { status: 500 });
  }
}
