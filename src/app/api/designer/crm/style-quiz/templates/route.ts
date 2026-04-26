import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// GET /api/designer/crm/style-quiz/templates — רשימת תבניות שאלון סגנון
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const templates = await prisma.crmStyleQuizTemplate.findMany({
      where: { designerId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("CRM style quiz templates fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת תבניות שאלון" }, { status: 500 });
  }
}

// POST /api/designer/crm/style-quiz/templates — יצירת תבנית שאלון סגנון
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const body = await req.json();
    const { question, questionType, options, sortOrder } = body;

    if (!question?.trim()) {
      return NextResponse.json(
        { error: "שאלה היא שדה חובה" },
        { status: 400 }
      );
    }

    const template = await prisma.crmStyleQuizTemplate.create({
      data: {
        designerId,
        question: question.trim(),
        ...(questionType && { questionType }),
        ...(options !== undefined && { options }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("CRM style quiz template create error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת תבנית שאלון" }, { status: 500 });
  }
}
