import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// PATCH /api/designer/crm/handoff/[checklistId]/items/[itemId] — עדכון פריט בצ'קליסט
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ checklistId: string; itemId: string }> }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const { checklistId, itemId } = await params;

    const checklist = await prisma.crmHandoffChecklist.findFirst({
      where: { id: checklistId, designerId },
    });
    if (!checklist) {
      return NextResponse.json(
        { error: "צ'קליסט לא נמצא" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { isChecked, note, photoUrl, category, assignee, label } = body;

    const item = await prisma.crmHandoffItem.update({
      where: { id: itemId },
      data: {
        ...(label !== undefined && { label: label.trim() }),
        ...(category !== undefined && { category }),
        ...(assignee !== undefined && { assignee }),
        ...(note !== undefined && { note }),
        ...(photoUrl !== undefined && { photoUrl }),
        ...(isChecked !== undefined && {
          isChecked,
          ...(isChecked
            ? { checkedAt: new Date(), checkedBy: designerId }
            : { checkedAt: null, checkedBy: null }),
        }),
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("CRM handoff item update error:", error);
    return NextResponse.json(
      { error: "שגיאה בעדכון פריט" },
      { status: 500 }
    );
  }
}
