export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/designer/crm/projects/[projectId]/time-entries
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

    const timeEntries = await prisma.crmTimeEntry.findMany({
      where: { projectId, designerId },
      orderBy: { startTime: "desc" },
    });

    return NextResponse.json(timeEntries);
  } catch (error) {
    console.error("CRM time entries fetch error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת רישומי זמן" },
      { status: 500 }
    );
  }
}

// POST /api/designer/crm/projects/[projectId]/time-entries
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
    const { description, startTime, endTime, durationMin, billable, hourlyRate } = body;

    if (!startTime) {
      return NextResponse.json(
        { error: "זמן התחלה הוא שדה חובה" },
        { status: 400 }
      );
    }

    const timeEntry = await prisma.crmTimeEntry.create({
      data: {
        projectId,
        designerId,
        description: description?.trim() || null,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        durationMin: durationMin ?? null,
        billable: billable ?? true,
        hourlyRate: hourlyRate ?? null,
      },
    });

    return NextResponse.json(timeEntry, { status: 201 });
  } catch (error) {
    console.error("CRM time entry create error:", error);
    return NextResponse.json(
      { error: "שגיאה ביצירת רישום זמן" },
      { status: 500 }
    );
  }
}
