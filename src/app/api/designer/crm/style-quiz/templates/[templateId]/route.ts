export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

// PATCH /api/designer/crm/style-quiz/templates/[templateId]
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

    const existing = await prisma.crmStyleQuizTemplate.findFirst({
      where: { id: templateId, designerId },
    });
    if (!existing) {
      return NextResponse.json({ error: "תבנית לא נמצאה" }, { status: 404 });
    }

    const { question, questionType, options, sortOrder, isActive } = body;

    const template = await prisma.crmStyleQuizTemplate.update({
      where: { id: templateId },
      data: {
        ...(question !== undefined && { question: question.trim() }),
        ...(questionType !== undefined && { questionType }),
        ...(options !== undefined && { options }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("CRM style quiz template update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון תבנית שאלון" }, { status: 500 });
  }
}

// DELETE /api/designer/crm/style-quiz/templates/[templateId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const { templateId } = await params;

    const existing = await prisma.crmStyleQuizTemplate.findFirst({
      where: { id: templateId, designerId },
    });
    if (!existing) {
      return NextResponse.json({ error: "תבנית לא נמצאה" }, { status: 404 });
    }

    await prisma.crmStyleQuizTemplate.delete({
      where: { id: templateId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CRM style quiz template delete error:", error);
    return NextResponse.json({ error: "שגיאה במחיקת תבנית שאלון" }, { status: 500 });
  }
}
