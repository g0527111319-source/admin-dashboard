import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/public/projects — List all PUBLIC projects with designer info
// Supports ?category= and ?style= query filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const style = searchParams.get("style");
    const designerId = searchParams.get("designer");

    const projects = await prisma.designerProject.findMany({
      where: {
        status: "public",
        ...(category && { category }),
        ...(style && { styleTags: { has: style } }),
        ...(designerId && { designerId }),
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Public projects list error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת פרויקטים" }, { status: 500 });
  }
}
