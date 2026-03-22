import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/designer/crm/style-quiz/[clientId] — תשובות שאלון סגנון של לקוח
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { clientId } = await params;

    // Verify designer owns client
    const client = await prisma.crmClient.findFirst({
      where: { id: clientId, designerId, deletedAt: null },
    });
    if (!client) {
      return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });
    }

    const responses = await prisma.crmStyleQuizResponse.findMany({
      where: { clientId },
      include: {
        question: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(responses);
  } catch (error) {
    console.error("CRM style quiz responses fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת תשובות שאלון" }, { status: 500 });
  }
}

// POST /api/designer/crm/style-quiz/[clientId] — שליחת תשובה לשאלון סגנון
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const body = await req.json();
    const { questionId, answer } = body;

    if (!questionId) {
      return NextResponse.json(
        { error: "מזהה שאלה הוא שדה חובה" },
        { status: 400 }
      );
    }

    if (answer === undefined || answer === null) {
      return NextResponse.json(
        { error: "תשובה היא שדה חובה" },
        { status: 400 }
      );
    }

    // Verify question exists
    const question = await prisma.crmStyleQuizTemplate.findUnique({
      where: { id: questionId },
    });
    if (!question) {
      return NextResponse.json({ error: "שאלה לא נמצאה" }, { status: 404 });
    }

    // Upsert by questionId + clientId
    const response = await prisma.crmStyleQuizResponse.upsert({
      where: {
        questionId_clientId: {
          questionId,
          clientId,
        },
      },
      update: {
        answer,
      },
      create: {
        questionId,
        clientId,
        answer,
      },
      include: {
        question: true,
      },
    });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("CRM style quiz response create error:", error);
    return NextResponse.json({ error: "שגיאה בשליחת תשובה" }, { status: 500 });
  }
}
