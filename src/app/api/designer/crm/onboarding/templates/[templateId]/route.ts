export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

// PATCH /api/designer/crm/onboarding/templates/[templateId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

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
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

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
