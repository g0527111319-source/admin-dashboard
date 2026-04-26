export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

// GET /api/designer/crm/projects/[projectId]/materials — רשימת קטגוריות וחומרים
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const { projectId } = await params;

    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    const categories = await prisma.crmMaterialCategory.findMany({
      where: { projectId },
      orderBy: { sortOrder: "asc" },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("CRM materials fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת חומרים" }, { status: 500 });
  }
}

// POST /api/designer/crm/projects/[projectId]/materials — יצירת קטגוריית חומרים
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const { projectId } = await params;

    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    const body = await req.json();
    const { name } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "שם קטגוריה הוא שדה חובה" }, { status: 400 });
    }

    // Get max sort order
    const maxCategory = await prisma.crmMaterialCategory.findFirst({
      where: { projectId },
      orderBy: { sortOrder: "desc" },
    });

    const category = await prisma.crmMaterialCategory.create({
      data: {
        projectId,
        name: name.trim(),
        sortOrder: (maxCategory?.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("CRM material category create error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת קטגוריה" }, { status: 500 });
  }
}
