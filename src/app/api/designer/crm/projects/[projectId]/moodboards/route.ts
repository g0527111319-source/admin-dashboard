export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/designer/crm/projects/[projectId]/moodboards — רשימת מודבורדים
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

    const moodboards = await prisma.crmMoodboard.findMany({
      where: { projectId },
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(moodboards);
  } catch (error) {
    console.error("CRM moodboards fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת מודבורדים" }, { status: 500 });
  }
}

// POST /api/designer/crm/projects/[projectId]/moodboards — יצירת מודבורד
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
    const { title, description, isSharedWithClient } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "כותרת מודבורד היא שדה חובה" }, { status: 400 });
    }

    const moodboard = await prisma.crmMoodboard.create({
      data: {
        projectId,
        title: title.trim(),
        ...(description !== undefined && { description: description.trim() }),
        ...(isSharedWithClient !== undefined && { isSharedWithClient }),
      },
      include: { items: true },
    });

    return NextResponse.json(moodboard, { status: 201 });
  } catch (error) {
    console.error("CRM moodboard create error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת מודבורד" }, { status: 500 });
  }
}
