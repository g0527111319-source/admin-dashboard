import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// GET /api/designer/crm/handoff — רשימת צ'קליסטים למסירה
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    const checklists = await prisma.crmHandoffChecklist.findMany({
      where: {
        designerId,
        ...(projectId && { projectId }),
      },
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(checklists);
  } catch (error) {
    console.error("CRM handoff checklists fetch error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת צ'קליסטים" },
      { status: 500 }
    );
  }
}

// POST /api/designer/crm/handoff — יצירת צ'קליסט מסירה
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const body = await req.json();
    const { projectId, title, items } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: "מזהה פרויקט הוא שדה חובה" },
        { status: 400 }
      );
    }

    const checklist = await prisma.crmHandoffChecklist.create({
      data: {
        projectId,
        designerId,
        ...(title !== undefined && { title: title.trim() }),
        ...(items?.length && {
          items: {
            create: items.map(
              (
                item: { label: string; category?: string; assignee?: string },
                index: number
              ) => ({
                label: item.label,
                ...(item.category !== undefined && { category: item.category }),
                ...(item.assignee !== undefined && { assignee: item.assignee }),
                sortOrder: index,
              })
            ),
          },
        }),
      },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });

    return NextResponse.json(checklist, { status: 201 });
  } catch (error) {
    console.error("CRM handoff checklist create error:", error);
    return NextResponse.json(
      { error: "שגיאה ביצירת צ'קליסט" },
      { status: 500 }
    );
  }
}
