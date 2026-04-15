export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * POST /api/designer/crm/workflows/:templateId/apply
 *   body: { projectId: string, startDate?: string (ISO), replaceExisting?: boolean }
 *
 * Materializes a workflow template's phases + default tasks into an existing
 * project:
 *  - Creates CrmProjectPhase rows with relative deadlines computed from
 *    startDate + phase.daysFromStart + phase.duration.
 *  - Creates CrmTask rows for each default task, linking to project + client.
 *  - If `replaceExisting` is true, deletes open tasks and phases first.
 *
 * Designed to be idempotent-ish: we never delete completed work unless
 * explicitly requested.
 */

interface PhaseDef {
  name: string;
  daysFromStart?: number;
  duration?: number;
  sortOrder?: number;
  tasks?: TaskDef[];
}
interface TaskDef {
  title: string;
  description?: string;
  daysFromStart?: number;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const projectId: string | undefined = body?.projectId;
    const startDate = body?.startDate ? new Date(body.startDate) : new Date();
    const replaceExisting = !!body?.replaceExisting;

    if (!projectId) {
      return NextResponse.json({ error: "חסר מזהה פרויקט" }, { status: 400 });
    }

    const [template, project] = await Promise.all([
      prisma.crmWorkflowTemplate.findFirst({
        where: { id: params.templateId, designerId },
      }),
      prisma.crmProject.findFirst({
        where: { id: projectId, designerId },
        select: { id: true, clientId: true },
      }),
    ]);

    if (!template) {
      return NextResponse.json({ error: "תבנית לא נמצאה" }, { status: 404 });
    }
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    // Parse template JSON safely
    const phases: PhaseDef[] = Array.isArray(template.phases)
      ? (template.phases as unknown as PhaseDef[])
      : [];
    const extraTasks: TaskDef[] = Array.isArray(template.defaultTasks)
      ? (template.defaultTasks as unknown as TaskDef[])
      : [];

    if (phases.length === 0 && extraTasks.length === 0) {
      return NextResponse.json(
        { error: "התבנית ריקה — אין שלבים או משימות להוסיף" },
        { status: 400 }
      );
    }

    const createdPhases: string[] = [];
    const createdTasks: string[] = [];

    await prisma.$transaction(async (tx) => {
      if (replaceExisting) {
        await tx.crmProjectPhase.deleteMany({
          where: { projectId, isCompleted: false },
        });
        await tx.crmTask.deleteMany({
          where: {
            projectId,
            status: { in: ["TODO", "IN_PROGRESS"] },
          },
        });
      }

      // Phases
      for (let i = 0; i < phases.length; i++) {
        const p = phases[i];
        const offsetStart = Number(p.daysFromStart ?? 0);
        const duration = Number(p.duration ?? 7);
        const deadline = new Date(startDate);
        deadline.setDate(deadline.getDate() + offsetStart + duration);

        const ph = await tx.crmProjectPhase.create({
          data: {
            projectId,
            name: p.name || `שלב ${i + 1}`,
            sortOrder: Number(p.sortOrder ?? i),
            isCurrent: i === 0,
            deadline,
          },
          select: { id: true },
        });
        createdPhases.push(ph.id);

        // Phase-level tasks
        if (Array.isArray(p.tasks)) {
          for (const t of p.tasks) {
            const tDue = new Date(startDate);
            tDue.setDate(
              tDue.getDate() + Number(t.daysFromStart ?? offsetStart)
            );
            const task = await tx.crmTask.create({
              data: {
                designerId,
                projectId,
                clientId: project.clientId,
                title: t.title || "משימה",
                description: t.description ?? null,
                dueDate: tDue,
              },
              select: { id: true },
            });
            createdTasks.push(task.id);
          }
        }
      }

      // Additional top-level tasks
      for (const t of extraTasks) {
        const tDue = new Date(startDate);
        tDue.setDate(tDue.getDate() + Number(t.daysFromStart ?? 0));
        const task = await tx.crmTask.create({
          data: {
            designerId,
            projectId,
            clientId: project.clientId,
            title: t.title || "משימה",
            description: t.description ?? null,
            dueDate: tDue,
          },
          select: { id: true },
        });
        createdTasks.push(task.id);
      }
    });

    await prisma.crmActivityLog
      .create({
        data: {
          designerId,
          projectId,
          clientId: project.clientId,
          action: "workflow_applied",
          entityType: "workflow_template",
          entityId: template.id,
          actorType: "designer",
          metadata: {
            templateName: template.name,
            phases: createdPhases.length,
            tasks: createdTasks.length,
          } as never,
        },
      })
      .catch(() => null);

    return NextResponse.json({
      ok: true,
      phasesCreated: createdPhases.length,
      tasksCreated: createdTasks.length,
    });
  } catch (error) {
    console.error("workflow apply error:", error);
    return NextResponse.json(
      { error: "שגיאה בהחלת תבנית" },
      { status: 500 }
    );
  }
}
