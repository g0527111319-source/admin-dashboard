import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// PATCH /api/designer/crm/plans/[planId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { planId } = await params;
    const body = await req.json();
    const { title, description, category, isVisibleToClient } = body;

    // Verify ownership via project
    const existing = await prisma.crmProjectDocument.findFirst({
      where: { id: planId, project: { designerId } },
    });
    if (!existing) {
      return NextResponse.json({ error: "תכנית לא נמצאה" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title?.trim() || null;
    if (description !== undefined) data.description = description?.trim() || null;
    if (category !== undefined) data.category = category;
    if (isVisibleToClient !== undefined) data.isVisibleToClient = isVisibleToClient;

    const updated = await prisma.crmProjectDocument.update({
      where: { id: planId },
      data,
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Plan update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון תכנית" }, { status: 500 });
  }
}

// DELETE /api/designer/crm/plans/[planId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { planId } = await params;

    // Verify ownership
    const existing = await prisma.crmProjectDocument.findFirst({
      where: { id: planId, project: { designerId } },
    });
    if (!existing) {
      return NextResponse.json({ error: "תכנית לא נמצאה" }, { status: 404 });
    }

    await prisma.crmProjectDocument.delete({ where: { id: planId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Plan delete error:", error);
    return NextResponse.json({ error: "שגיאה במחיקת תכנית" }, { status: 500 });
  }
}
