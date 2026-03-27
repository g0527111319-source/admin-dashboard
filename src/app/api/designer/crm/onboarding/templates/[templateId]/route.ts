export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// PATCH /api/designer/crm/onboarding/templates/[templateId]
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

    const existing = await prisma.crmOnboardingTemplate.findFirst({
      where: { id: templateId, designerId },
    });
    if (!existing) {
      return NextResponse.json({ error: "תבנית לא נמצאה" }, { status: 404 });
    }

    const { title, sortOrder, isDefault } = body;

    const template = await prisma.crmOnboardingTemplate.update({
      where: { id: templateId },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("CRM onboarding template update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון תבנית" }, { status: 500 });
  }
}

// DELETE /api/designer/crm/onboarding/templates/[templateId]
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

    const existing = await prisma.crmOnboardingTemplate.findFirst({
      where: { id: templateId, designerId },
    });
    if (!existing) {
      return NextResponse.json({ error: "תבנית לא נמצאה" }, { status: 404 });
    }

    await prisma.crmOnboardingTemplate.delete({
      where: { id: templateId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CRM onboarding template delete error:", error);
    return NextResponse.json({ error: "שגיאה במחיקת תבנית" }, { status: 500 });
  }
}
