import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/designer/crm/plans — list plans (documents with category)
export async function GET(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    const where: Record<string, unknown> = {
      category: { not: null },
      project: { designerId, deletedAt: null },
    };
    if (projectId) where.projectId = projectId;

    const plans = await prisma.crmProjectDocument.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            client: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error("Plans fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת תכניות" }, { status: 500 });
  }
}

// POST /api/designer/crm/plans — upload a new plan
export async function POST(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, title, description, category, fileUrl, fileName, fileSize, isVisibleToClient } = body;

    if (!projectId || !fileUrl || !fileName || !category) {
      return NextResponse.json({ error: "פרויקט, קובץ וקטגוריה הם שדות חובה" }, { status: 400 });
    }

    // Verify project ownership
    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    const plan = await prisma.crmProjectDocument.create({
      data: {
        projectId,
        fileName,
        fileUrl,
        fileSize: fileSize || null,
        title: title?.trim() || null,
        description: description?.trim() || null,
        category,
        isVisibleToClient: isVisibleToClient ?? false,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            client: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error("Plan create error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת תכנית" }, { status: 500 });
  }
}
