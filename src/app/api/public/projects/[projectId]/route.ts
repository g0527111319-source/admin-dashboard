export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/public/projects/[projectId] — Get single public project with images and designer info
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    let project;
    try {
      project = await prisma.designerProject.findFirst({
        where: {
          id: projectId,
          status: "public",
        },
        include: {
          designer: {
            select: {
              id: true,
              fullName: true,
              city: true,
              area: true,
              specialization: true,
              instagram: true,
              website: true,
              crmSettings: {
                select: { logoUrl: true, companyName: true, processDurations: true },
              },
            },
          },
          images: {
            orderBy: { sortOrder: "asc" },
          },
        },
      });
    } catch {
      // processDurations column may not exist yet — fall back without it
      project = await prisma.designerProject.findFirst({
        where: {
          id: projectId,
          status: "public",
        },
        include: {
          designer: {
            select: {
              id: true,
              fullName: true,
              city: true,
              area: true,
              specialization: true,
              instagram: true,
              website: true,
              crmSettings: {
                select: { logoUrl: true, companyName: true },
              },
            },
          },
          images: {
            orderBy: { sortOrder: "asc" },
          },
        },
      });
    }

    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("Public project get error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת פרויקט" }, { status: 500 });
  }
}
