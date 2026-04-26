export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

// POST /api/designer/crm/projects/[projectId]/materials/[categoryId] — הוספת פריט חומר
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; categoryId: string }> }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const { projectId, categoryId } = await params;

    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    // SECURITY: verify that the category belongs to this designer's project.
    const category = await prisma.crmMaterialCategory.findFirst({
      where: { id: categoryId, projectId },
    });
    if (!category) {
      return NextResponse.json({ error: "קטגוריה לא נמצאה" }, { status: 404 });
    }

    const body = await req.json();
    const { productName, supplierName, price, notes, imageUrl, isVisibleToClient } = body;

    if (!productName?.trim()) {
      return NextResponse.json({ error: "שם מוצר הוא שדה חובה" }, { status: 400 });
    }

    const item = await prisma.crmMaterialItem.create({
      data: {
        categoryId,
        productName: productName.trim(),
        ...(supplierName !== undefined && { supplierName: supplierName?.trim() ?? null }),
        ...(price !== undefined && { price }),
        ...(notes !== undefined && { notes: notes?.trim() ?? null }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(isVisibleToClient !== undefined && { isVisibleToClient }),
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("CRM material item create error:", error);
    return NextResponse.json({ error: "שגיאה בהוספת פריט חומר" }, { status: 500 });
  }
}

// PATCH /api/designer/crm/projects/[projectId]/materials/[categoryId] — עדכון פריט חומר
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; categoryId: string }> }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const { projectId, categoryId } = await params;

    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    const body = await req.json();
    const { itemId, productName, supplierName, price, notes, imageUrl, isVisibleToClient } = body;

    if (!itemId) {
      return NextResponse.json({ error: "מזהה פריט הוא שדה חובה" }, { status: 400 });
    }

    // SECURITY: verify that the item belongs to the category within this
    // designer's project. Prevents cross-tenant writes via guessed itemId.
    const existingItem = await prisma.crmMaterialItem.findFirst({
      where: {
        id: itemId,
        categoryId,
        category: { projectId },
      },
    });
    if (!existingItem) {
      return NextResponse.json({ error: "פריט לא נמצא" }, { status: 404 });
    }

    const item = await prisma.crmMaterialItem.update({
      where: { id: itemId },
      data: {
        ...(productName !== undefined && { productName: productName.trim() }),
        ...(supplierName !== undefined && { supplierName: supplierName?.trim() ?? null }),
        ...(price !== undefined && { price }),
        ...(notes !== undefined && { notes: notes?.trim() ?? null }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(isVisibleToClient !== undefined && { isVisibleToClient }),
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("CRM material item update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון פריט חומר" }, { status: 500 });
  }
}

// DELETE /api/designer/crm/projects/[projectId]/materials/[categoryId] — מחיקת קטגוריה עם כל הפריטים
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; categoryId: string }> }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const { projectId, categoryId } = await params;

    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    // SECURITY: verify that the category belongs to this project before deletion.
    const category = await prisma.crmMaterialCategory.findFirst({
      where: { id: categoryId, projectId },
    });
    if (!category) {
      return NextResponse.json({ error: "קטגוריה לא נמצאה" }, { status: 404 });
    }

    // Cascade delete handled by Prisma schema (onDelete: Cascade on items)
    await prisma.crmMaterialCategory.delete({ where: { id: categoryId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CRM material category delete error:", error);
    return NextResponse.json({ error: "שגיאה במחיקת קטגוריה" }, { status: 500 });
  }
}
