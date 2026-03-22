import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// PATCH /api/designer/crm/projects/[projectId]/client-uploads/[uploadId] — עדכון העלאה
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; uploadId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

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
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { projectId, uploadId } = await params;

    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    await prisma.crmClientUpload.delete({ where: { id: uploadId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CRM client upload delete error:", error);
    return NextResponse.json({ error: "שגיאה במחיקת העלאה" }, { status: 500 });
  }
}
