export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

// GET /api/designer/crm/projects/[projectId]/settings — הגדרות פרויקט
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const { projectId } = await params;

    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    const settings = await prisma.crmProjectSettings.findUnique({
      where: { projectId },
    });

    // Return defaults if none exist
    if (!settings) {
      return NextResponse.json({
        projectId,
        enableApprovals: true,
        enableClientUploads: true,
        enableCountdown: true,
        enableWeeklySummary: null,
        enableAutoNotify: null,
        officeHoursOverride: null,
        customConfig: {},
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("CRM project settings fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת הגדרות פרויקט" }, { status: 500 });
  }
}

// PATCH /api/designer/crm/projects/[projectId]/settings — עדכון/יצירת הגדרות פרויקט
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const { projectId } = await params;

    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    const body = await req.json();
    const {
      enableApprovals,
      enableClientUploads,
      enableCountdown,
      enableWeeklySummary,
      enableAutoNotify,
      officeHoursOverride,
      customConfig,
    } = body;

    const data = {
      ...(enableApprovals !== undefined && { enableApprovals }),
      ...(enableClientUploads !== undefined && { enableClientUploads }),
      ...(enableCountdown !== undefined && { enableCountdown }),
      ...(enableWeeklySummary !== undefined && { enableWeeklySummary }),
      ...(enableAutoNotify !== undefined && { enableAutoNotify }),
      ...(officeHoursOverride !== undefined && { officeHoursOverride }),
      ...(customConfig !== undefined && { customConfig }),
    };

    const settings = await prisma.crmProjectSettings.upsert({
      where: { projectId },
      update: data,
      create: {
        projectId,
        ...data,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("CRM project settings update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון הגדרות פרויקט" }, { status: 500 });
  }
}
