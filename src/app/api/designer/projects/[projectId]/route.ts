import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/designer/projects/[projectId] — Get single project with images
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

    const project = await prisma.designerProject.findFirst({
      where: { id: projectId, designerId },
      include: {
        images: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("Project get error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת פרויקט" }, { status: 500 });
  }
}

// PATCH /api/designer/projects/[projectId] — Update project fields
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

    // Verify ownership
    const existing = await prisma.designerProject.findFirst({
      where: { id: projectId, designerId },
    });

    if (!existing) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    const body = await req.json();
    const { title, description, category, styleTags, status, coverImageUrl, suppliers } = body;

    const project = await prisma.designerProject.update({
      where: { id: projectId },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(styleTags !== undefined && { styleTags }),
        ...(status !== undefined && { status }),
        ...(coverImageUrl !== undefined && { coverImageUrl }),
        ...(suppliers !== undefined && { suppliers }),
      },
      include: {
        images: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error("Project update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון פרויקט" }, { status: 500 });
  }
}

// DELETE /api/designer/projects/[projectId] — Delete project and its images
export async function DELETE(
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
    const existing = await prisma.designerProject.findFirst({
      where: { id: projectId, designerId },
    });

    if (!existing) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    // Images are cascade-deleted via the relation
    await prisma.designerProject.delete({
      where: { id: projectId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Project delete error:", error);
    return NextResponse.json({ error: "שגיאה במחיקת פרויקט" }, { status: 500 });
  }
}
