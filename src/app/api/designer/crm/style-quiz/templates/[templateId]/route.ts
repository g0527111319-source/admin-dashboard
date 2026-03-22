import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// PATCH /api/designer/crm/style-quiz/templates/[templateId]
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
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

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
