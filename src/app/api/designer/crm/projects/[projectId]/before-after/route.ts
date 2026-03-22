import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/designer/crm/projects/[projectId]/before-after — רשימת סטים לפני/אחרי
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

    const sets = await prisma.crmBeforeAfter.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(sets);
  } catch (error) {
    console.error("CRM before-after fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת לפני/אחרי" }, { status: 500 });
  }
}

// POST /api/designer/crm/projects/[projectId]/before-after — יצירת סט לפני/אחרי
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
    const { title, beforeImageUrl, afterImageUrl, beforeCaption, afterCaption, isVisibleInPortal, isPublic } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "כותרת היא שדה חובה" }, { status: 400 });
    }

    const set = await prisma.crmBeforeAfter.create({
      data: {
        projectId,
        clientId: project.clientId,
        title: title.trim(),
        ...(beforeImageUrl !== undefined && { beforeImageUrl }),
        ...(afterImageUrl !== undefined && { afterImageUrl }),
        ...(beforeCaption !== undefined && { beforeCaption }),
        ...(afterCaption !== undefined && { afterCaption }),
        ...(isVisibleInPortal !== undefined && { isVisibleInPortal }),
        ...(isPublic !== undefined && { isPublic }),
      },
    });

    return NextResponse.json(set, { status: 201 });
  } catch (error) {
    console.error("CRM before-after create error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת סט לפני/אחרי" }, { status: 500 });
  }
}
