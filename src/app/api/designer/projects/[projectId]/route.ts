export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { deleteR2WithVariants } from "@/lib/r2-cleanup";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

// GET /api/designer/projects/[projectId] — Get single project with images
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

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
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

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
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const { projectId } = await params;

    // Verify ownership
    const existing = await prisma.designerProject.findFirst({
      where: { id: projectId, designerId },
    });

    if (!existing) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    // Delete R2 files before DB deletion (cascade will remove image records)
    try {
      const images = await prisma.designerProjectImage.findMany({
        where: { projectId },
        select: { r2Key: true },
      });

      const r2Deletions = images
        .filter((img) => img.r2Key)
        .map((img) => deleteR2WithVariants(img.r2Key!));

      if (existing.coverImageR2Key) {
        r2Deletions.push(deleteR2WithVariants(existing.coverImageR2Key));
      }

      await Promise.allSettled(r2Deletions);
    } catch (err) {
      console.warn("[r2-cleanup] שגיאה במחיקת קבצי R2 של פרויקט:", err);
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
