import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/designer/crm/style-quiz/templates — רשימת תבניות שאלון סגנון
export async function GET(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

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
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

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
