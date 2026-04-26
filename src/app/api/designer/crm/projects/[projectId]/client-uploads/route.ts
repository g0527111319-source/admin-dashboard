export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

// GET /api/designer/crm/projects/[projectId]/client-uploads — רשימת העלאות מלקוח
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

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    const uploads = await prisma.crmClientUpload.findMany({
      where: {
        projectId,
        ...(category ? { category } : {}),
      },
      include: {
        client: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(uploads);
  } catch (error) {
    console.error("CRM client uploads fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת העלאות לקוח" }, { status: 500 });
  }
}
