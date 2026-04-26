export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { deleteR2WithVariants } from "@/lib/r2-cleanup";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

// PATCH /api/designer/crm/projects/[projectId]/client-uploads/[uploadId] — עדכון העלאה
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; uploadId: string }> }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const { projectId, uploadId } = await params;

    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    const body = await req.json();
    const { isReviewed, caption } = body;

    const upload = await prisma.crmClientUpload.update({
      where: { id: uploadId },
      data: {
        ...(isReviewed !== undefined && { isReviewed }),
        ...(caption !== undefined && { caption }),
      },
    });

    return NextResponse.json(upload);
  } catch (error) {
    console.error("CRM client upload update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון העלאה" }, { status: 500 });
  }
}

// DELETE /api/designer/crm/projects/[projectId]/client-uploads/[uploadId] — מחיקת העלאה
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; uploadId: string }> }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const { projectId, uploadId } = await params;

    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    // Delete from R2 before removing the DB record
    const upload = await prisma.crmClientUpload.findUnique({
      where: { id: uploadId },
      select: { r2Key: true },
    });

    if (upload?.r2Key) {
      try {
        await deleteR2WithVariants(upload.r2Key);
      } catch (err) {
        console.warn("[r2-cleanup] שגיאה במחיקת קובץ R2 של העלאת לקוח:", err);
      }
    }

    await prisma.crmClientUpload.delete({ where: { id: uploadId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CRM client upload delete error:", error);
    return NextResponse.json({ error: "שגיאה במחיקת העלאה" }, { status: 500 });
  }
}
