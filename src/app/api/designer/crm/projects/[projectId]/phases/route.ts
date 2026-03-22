import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/designer/crm/projects/[projectId]/phases — הוספת שלב
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

    // Verify ownership
    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    const body = await req.json();
    const { name } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "שם שלב הוא שדה חובה" }, { status: 400 });
    }

    // Get max sort order
    const maxPhase = await prisma.crmProjectPhase.findFirst({
      where: { projectId },
      orderBy: { sortOrder: "desc" },
    });

    const phase = await prisma.crmProjectPhase.create({
      data: {
        projectId,
        name: name.trim(),
        sortOrder: (maxPhase?.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json(phase, { status: 201 });
  } catch (error) {
    console.error("CRM phase create error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת שלב" }, { status: 500 });
  }
}

// PATCH /api/designer/crm/projects/[projectId]/phases — reorder
export async function PATCH(
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
    const { phaseIds } = body; // ordered array of phase IDs

    if (!Array.isArray(phaseIds)) {
      return NextResponse.json({ error: "נדרש מערך של מזהי שלבים" }, { status: 400 });
    }

    await prisma.$transaction(
      phaseIds.map((id: string, index: number) =>
        prisma.crmProjectPhase.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    const phases = await prisma.crmProjectPhase.findMany({
      where: { projectId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(phases);
  } catch (error) {
    console.error("CRM phases reorder error:", error);
    return NextResponse.json({ error: "שגיאה בסידור שלבים" }, { status: 500 });
  }
}
