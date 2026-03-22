import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/designer/crm/projects/[projectId]/client-uploads — רשימת העלאות מלקוח
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
