import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// GET /api/designer/crm/budget — list budget items
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    const where: Record<string, unknown> = { designerId };
    if (projectId) where.projectId = projectId;

    const items = await prisma.crmBudgetItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Budget items fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת פריטי תקציב" }, { status: 500 });
  }
}

// POST /api/designer/crm/budget — create budget item
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const body = await req.json();
    const { projectId, category, description, plannedAmount, actualAmount, supplierName, status } = body;

    if (!projectId || !category?.trim()) {
      return NextResponse.json({ error: "פרויקט וקטגוריה הם שדות חובה" }, { status: 400 });
    }

    // Verify project ownership
    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    const item = await prisma.crmBudgetItem.create({
      data: {
        projectId,
        designerId,
        category: category.trim(),
        description: description?.trim() || null,
        plannedAmount: plannedAmount ?? 0,
        actualAmount: actualAmount ?? 0,
        supplierName: supplierName?.trim() || null,
        status: status || "planned",
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Budget item create error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת פריט תקציב" }, { status: 500 });
  }
}
