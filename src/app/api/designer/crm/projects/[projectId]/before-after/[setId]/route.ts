export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// PATCH /api/designer/crm/projects/[projectId]/before-after/[setId] — עדכון סט לפני/אחרי
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; setId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { projectId, setId } = await params;

    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    // SECURITY: verify the set belongs to this project before updating.
    const existingSet = await prisma.crmBeforeAfter.findFirst({
      where: { id: setId, projectId },
    });
    if (!existingSet) {
      return NextResponse.json({ error: "סט לא נמצא" }, { status: 404 });
    }

    const body = await req.json();
    const { title, beforeImageUrl, afterImageUrl, beforeCaption, afterCaption, isVisibleInPortal, isPublic } = body;

    const set = await prisma.crmBeforeAfter.update({
      where: { id: setId },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(beforeImageUrl !== undefined && { beforeImageUrl }),
        ...(afterImageUrl !== undefined && { afterImageUrl }),
        ...(beforeCaption !== undefined && { beforeCaption }),
        ...(afterCaption !== undefined && { afterCaption }),
        ...(isVisibleInPortal !== undefined && { isVisibleInPortal }),
        ...(isPublic !== undefined && { isPublic }),
      },
    });

    return NextResponse.json(set);
  } catch (error) {
    console.error("CRM before-after update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון סט לפני/אחרי" }, { status: 500 });
  }
}

// DELETE /api/designer/crm/projects/[projectId]/before-after/[setId] — מחיקת סט לפני/אחרי
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; setId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { projectId, setId } = await params;

    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    // SECURITY: verify the set belongs to this project before deletion.
    const existingSet = await prisma.crmBeforeAfter.findFirst({
      where: { id: setId, projectId },
    });
    if (!existingSet) {
      return NextResponse.json({ error: "סט לא נמצא" }, { status: 404 });
    }

    await prisma.crmBeforeAfter.delete({ where: { id: setId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CRM before-after delete error:", error);
    return NextResponse.json({ error: "שגיאה במחיקת סט לפני/אחרי" }, { status: 500 });
  }
}
