import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/designer/crm/surveys — list surveys
export async function GET(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    const where: Record<string, unknown> = {};
    if (projectId) {
      where.projectId = projectId;
    }

    // Get surveys through projects owned by this designer
    const surveys = await prisma.crmSatisfactionSurvey.findMany({
      where: {
        ...where,
        project: { designerId, deletedAt: null },
      },
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(surveys);
  } catch (error) {
    console.error("Surveys fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת סקרים" }, { status: 500 });
  }
}

// POST /api/designer/crm/surveys — create & send survey
export async function POST(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, clientId } = body;

    if (!projectId || !clientId) {
      return NextResponse.json({ error: "פרויקט ולקוח הם שדות חובה" }, { status: 400 });
    }

    // Verify project ownership
    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    const survey = await prisma.crmSatisfactionSurvey.create({
      data: {
        projectId,
        clientId,
        sentAt: new Date(),
      },
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(survey, { status: 201 });
  } catch (error) {
    console.error("Survey create error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת סקר" }, { status: 500 });
  }
}
