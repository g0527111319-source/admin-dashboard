export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/designer/crm/projects/[projectId]/moodboards/[moodboardId] — מודבורד עם פריטים
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; moodboardId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { projectId, moodboardId } = await params;

    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    const moodboard = await prisma.crmMoodboard.findFirst({
      where: { id: moodboardId, projectId },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    if (!moodboard) {
      return NextResponse.json({ error: "מודבורד לא נמצא" }, { status: 404 });
    }

    return NextResponse.json(moodboard);
  } catch (error) {
    console.error("CRM moodboard fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת מודבורד" }, { status: 500 });
  }
}

// POST /api/designer/crm/projects/[projectId]/moodboards/[moodboardId] — הוספת פריט למודבורד
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; moodboardId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { projectId, moodboardId } = await params;

    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    const moodboard = await prisma.crmMoodboard.findFirst({
      where: { id: moodboardId, projectId },
    });
    if (!moodboard) {
      return NextResponse.json({ error: "מודבורד לא נמצא" }, { status: 404 });
    }

    const body = await req.json();
    const { type, title, content, imageUrl, sortOrder } = body;

    const item = await prisma.crmMoodboardItem.create({
      data: {
        moodboardId,
        ...(type !== undefined && { type }),
        ...(title !== undefined && { title: title.trim() }),
        ...(content !== undefined && { content: content.trim() }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("CRM moodboard item create error:", error);
    return NextResponse.json({ error: "שגיאה בהוספת פריט למודבורד" }, { status: 500 });
  }
}

// PATCH /api/designer/crm/projects/[projectId]/moodboards/[moodboardId] — עדכון מודבורד
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; moodboardId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { projectId, moodboardId } = await params;

    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    const body = await req.json();
    const { title, description, isSharedWithClient } = body;

    const moodboard = await prisma.crmMoodboard.update({
      where: { id: moodboardId },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() ?? null }),
        ...(isSharedWithClient !== undefined && { isSharedWithClient }),
      },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });

    return NextResponse.json(moodboard);
  } catch (error) {
    console.error("CRM moodboard update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון מודבורד" }, { status: 500 });
  }
}

// DELETE /api/designer/crm/projects/[projectId]/moodboards/[moodboardId] — מחיקת מודבורד (כולל פריטים)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; moodboardId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { projectId, moodboardId } = await params;

    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    // CrmMoodboardItem has onDelete: Cascade in schema, so items are deleted automatically
    await prisma.crmMoodboard.delete({ where: { id: moodboardId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CRM moodboard delete error:", error);
    return NextResponse.json({ error: "שגיאה במחיקת מודבורד" }, { status: 500 });
  }
}
