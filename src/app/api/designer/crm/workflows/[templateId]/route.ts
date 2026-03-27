export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// PATCH /api/designer/crm/workflows/[templateId]
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

    const existing = await prisma.crmWorkflowTemplate.findFirst({
      where: { id: templateId, designerId },
    });
    if (!existing) {
      return NextResponse.json({ error: "תבנית לא נמצאה" }, { status: 404 });
    }

    const {
      name,
      description,
      projectType,
      isDefault,
      phases,
      defaultTasks,
      autoMessages,
      contractTemplateId,
      quoteTemplateData,
      onboardingEnabled,
      budgetCategories,
    } = body;

    // If setting as default, unset other defaults first
    if (isDefault) {
      await prisma.crmWorkflowTemplate.updateMany({
        where: { designerId, isDefault: true, id: { not: templateId } },
        data: { isDefault: false },
      });
    }

    const template = await prisma.crmWorkflowTemplate.update({
      where: { id: templateId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(projectType !== undefined && { projectType }),
        ...(isDefault !== undefined && { isDefault }),
        ...(phases !== undefined && { phases: JSON.parse(JSON.stringify(phases)) }),
        ...(defaultTasks !== undefined && { defaultTasks: JSON.parse(JSON.stringify(defaultTasks)) }),
        ...(autoMessages !== undefined && { autoMessages: JSON.parse(JSON.stringify(autoMessages)) }),
        ...(contractTemplateId !== undefined && { contractTemplateId: contractTemplateId || null }),
        ...(quoteTemplateData !== undefined && { quoteTemplateData: JSON.parse(JSON.stringify(quoteTemplateData)) }),
        ...(onboardingEnabled !== undefined && { onboardingEnabled }),
        ...(budgetCategories !== undefined && { budgetCategories: JSON.parse(JSON.stringify(budgetCategories)) }),
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("CRM workflow template update error:", error);
    return NextResponse.json(
      { error: "שגיאה בעדכון תבנית תהליך עבודה" },
      { status: 500 }
    );
  }
}

// DELETE /api/designer/crm/workflows/[templateId]
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

    const existing = await prisma.crmWorkflowTemplate.findFirst({
      where: { id: templateId, designerId },
    });
    if (!existing) {
      return NextResponse.json({ error: "תבנית לא נמצאה" }, { status: 404 });
    }

    await prisma.crmWorkflowTemplate.delete({
      where: { id: templateId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CRM workflow template delete error:", error);
    return NextResponse.json(
      { error: "שגיאה במחיקת תבנית תהליך עבודה" },
      { status: 500 }
    );
  }
}
