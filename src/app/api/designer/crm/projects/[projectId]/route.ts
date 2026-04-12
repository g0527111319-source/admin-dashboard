export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { deleteR2WithVariants } from "@/lib/r2-cleanup";

// GET /api/designer/crm/projects/[projectId]
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
      include: {
        client: true,
        phases: { orderBy: { sortOrder: "asc" } },
        messages: { orderBy: { createdAt: "asc" } },
        documents: { orderBy: { createdAt: "desc" } },
        photos: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("CRM project get error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת פרויקט" }, { status: 500 });
  }
}

// PATCH /api/designer/crm/projects/[projectId]
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
    const body = await req.json();

    const existing = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    const { name, projectType, status, estimatedBudget, address, notes, startDate, endDate } = body;

    const project = await prisma.crmProject.update({
      where: { id: projectId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(projectType !== undefined && { projectType }),
        ...(status !== undefined && { status }),
        ...(estimatedBudget !== undefined && { estimatedBudget: estimatedBudget ? Number(estimatedBudget) : null }),
        ...(address !== undefined && { address: address?.trim() || null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      },
      include: {
        client: { select: { id: true, name: true } },
        phases: { orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error("CRM project update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון פרויקט" }, { status: 500 });
  }
}

// DELETE /api/designer/crm/projects/[projectId] — soft delete
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

    const existing = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    // Delete R2 files before soft-deleting the project
    try {
      const photos = await prisma.crmProjectPhoto.findMany({
        where: { projectId },
        select: { r2Key: true },
      });

      const r2Deletions = photos
        .filter((photo) => photo.r2Key)
        .map((photo) => deleteR2WithVariants(photo.r2Key!));

      await Promise.allSettled(r2Deletions);
    } catch (err) {
      console.warn("[r2-cleanup] שגיאה במחיקת קבצי R2 של פרויקט CRM:", err);
    }

    await prisma.crmProject.update({
      where: { id: projectId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CRM project delete error:", error);
    return NextResponse.json({ error: "שגיאה במחיקת פרויקט" }, { status: 500 });
  }
}
