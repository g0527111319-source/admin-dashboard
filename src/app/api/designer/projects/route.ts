export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/designer/projects — List all projects for the authenticated designer
export async function GET(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const projects = await prisma.designerProject.findMany({
      where: { designerId },
      include: {
        images: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Projects list error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת פרויקטים" }, { status: 500 });
  }
}

// POST /api/designer/projects — Create a new project
export async function POST(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, category, styleTags, status, coverImageUrl, suppliers } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ error: "שם הפרויקט חובה" }, { status: 400 });
    }

    const project = await prisma.designerProject.create({
      data: {
        designerId,
        title: title.trim(),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(styleTags !== undefined && { styleTags }),
        ...(status !== undefined && { status }),
        ...(coverImageUrl !== undefined && { coverImageUrl }),
        ...(suppliers !== undefined && { suppliers }),
      },
      include: {
        images: true,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Project create error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת פרויקט" }, { status: 500 });
  }
}
