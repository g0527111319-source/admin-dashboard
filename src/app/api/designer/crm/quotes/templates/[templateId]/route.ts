export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// PATCH /api/designer/crm/quotes/templates/[templateId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { templateId } = await params;
    const body = await req.json();

    const existing = await prisma.crmQuoteTemplate.findFirst({
      where: { id: templateId, designerId },
    });
    if (!existing) {
      return NextResponse.json({ error: "תבנית לא נמצאה" }, { status: 404 });
    }

    // If setting as default, unset others
    if (body.isDefault) {
      await prisma.crmQuoteTemplate.updateMany({
        where: { designerId, isDefault: true, id: { not: templateId } },
        data: { isDefault: false },
      });
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;
    if (body.contentBlocks !== undefined) updateData.contentBlocks = body.contentBlocks;
    if (body.fields !== undefined) updateData.fields = body.fields;
    if (body.isDefault !== undefined) updateData.isDefault = body.isDefault;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.styling !== undefined) updateData.styling = body.styling;
    if (body.headerHtml !== undefined) updateData.headerHtml = body.headerHtml;
    if (body.footerHtml !== undefined) updateData.footerHtml = body.footerHtml;

    const template = await prisma.crmQuoteTemplate.update({
      where: { id: templateId },
      data: updateData,
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Quote template update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון תבנית" }, { status: 500 });
  }
}

// DELETE /api/designer/crm/quotes/templates/[templateId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { templateId } = await params;

    const existing = await prisma.crmQuoteTemplate.findFirst({
      where: { id: templateId, designerId },
    });
    if (!existing) {
      return NextResponse.json({ error: "תבנית לא נמצאה" }, { status: 404 });
    }

    await prisma.crmQuoteTemplate.delete({ where: { id: templateId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Quote template delete error:", error);
    return NextResponse.json({ error: "שגיאה במחיקת תבנית" }, { status: 500 });
  }
}
