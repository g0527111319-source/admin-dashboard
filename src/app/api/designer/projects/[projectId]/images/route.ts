export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { deleteR2WithVariants } from "@/lib/r2-cleanup";

// GET /api/designer/projects/[projectId]/images — List images for a project
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

    // Verify ownership
    const project = await prisma.designerProject.findFirst({
      where: { id: projectId, designerId },
    });

    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    const images = await prisma.designerProjectImage.findMany({
      where: { projectId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(images);
  } catch (error) {
    console.error("Project images list error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת תמונות" }, { status: 500 });
  }
}

// POST /api/designer/projects/[projectId]/images — Add image
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { projectId } = await params;

    // Verify ownership
    const project = await prisma.designerProject.findFirst({
      where: { id: projectId, designerId },
    });

    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    const body = await req.json();
    const { imageUrl, caption, sortOrder } = body;

    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json({ error: "כתובת תמונה חובה" }, { status: 400 });
    }

    const image = await prisma.designerProjectImage.create({
      data: {
        projectId,
        imageUrl,
        ...(caption !== undefined && { caption }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return NextResponse.json(image, { status: 201 });
  } catch (error) {
    console.error("Project image create error:", error);
    return NextResponse.json({ error: "שגיאה בהוספת תמונה" }, { status: 500 });
  }
}

// PATCH /api/designer/projects/[projectId]/images — Update image order
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { projectId } = await params;

    // Verify ownership
    const project = await prisma.designerProject.findFirst({
      where: { id: projectId, designerId },
    });

    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    const body = await req.json();
    const { images } = body; // array of { id, sortOrder }

    if (!Array.isArray(images)) {
      return NextResponse.json({ error: "נדרש מערך תמונות" }, { status: 400 });
    }

    // Update each image's sortOrder
    await Promise.all(
      images.map((img: { id: string; sortOrder: number }) =>
        prisma.designerProjectImage.updateMany({
          where: { id: img.id, projectId },
          data: { sortOrder: img.sortOrder },
        })
      )
    );

    const updatedImages = await prisma.designerProjectImage.findMany({
      where: { projectId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(updatedImages);
  } catch (error) {
    console.error("Project images reorder error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון סדר תמונות" }, { status: 500 });
  }
}

// DELETE /api/designer/projects/[projectId]/images — Delete an image by id
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { projectId } = await params;

    // Verify ownership
    const project = await prisma.designerProject.findFirst({
      where: { id: projectId, designerId },
    });

    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    const body = await req.json();
    const { id: imageId } = body;

    if (!imageId) {
      return NextResponse.json({ error: "מזהה תמונה חובה" }, { status: 400 });
    }

    // Ensure the image belongs to this project
    const image = await prisma.designerProjectImage.findFirst({
      where: { id: imageId, projectId },
    });

    if (!image) {
      return NextResponse.json({ error: "תמונה לא נמצאה" }, { status: 404 });
    }

    // Delete from R2 if r2Key exists
    if (image.r2Key) {
      try {
        await deleteR2WithVariants(image.r2Key);
      } catch (err) {
        console.warn("[r2-cleanup] שגיאה במחיקת קובץ R2 של תמונה:", err);
      }
    }

    await prisma.designerProjectImage.delete({
      where: { id: imageId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Project image delete error:", error);
    return NextResponse.json({ error: "שגיאה במחיקת תמונה" }, { status: 500 });
  }
}
