import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/designer/crm/handoff/[checklistId]/items — הוספת פריט לצ'קליסט
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ checklistId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { checklistId } = await params;

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
    const { label, category, assignee, sortOrder } = body;

    if (!label?.trim()) {
      return NextResponse.json(
        { error: "תווית הפריט היא שדה חובה" },
        { status: 400 }
      );
    }

    // Get max sort order if not provided
    let finalSortOrder = sortOrder;
    if (finalSortOrder === undefined) {
      const maxItem = await prisma.crmHandoffItem.findFirst({
        where: { checklistId },
        orderBy: { sortOrder: "desc" },
      });
      finalSortOrder = (maxItem?.sortOrder ?? -1) + 1;
    }

    const item = await prisma.crmHandoffItem.create({
      data: {
        checklistId,
        label: label.trim(),
        ...(category !== undefined && { category }),
        ...(assignee !== undefined && { assignee }),
        sortOrder: finalSortOrder,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("CRM handoff item create error:", error);
    return NextResponse.json(
      { error: "שגיאה בהוספת פריט" },
      { status: 500 }
    );
  }
}
