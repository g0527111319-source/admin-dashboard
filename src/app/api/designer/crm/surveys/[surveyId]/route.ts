export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/designer/crm/surveys/[surveyId] — get survey by token (public for client)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    const { surveyId } = await params;

    // Try by token (public access for client) or by ID (designer access)
    const survey = await prisma.crmSatisfactionSurvey.findFirst({
      where: {
        OR: [{ id: surveyId }, { token: surveyId }],
      },
      include: {
        project: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
      },
    });

    if (!survey) {
      return NextResponse.json({ error: "סקר לא נמצא" }, { status: 404 });
    }

    return NextResponse.json(survey);
  } catch (error) {
    console.error("Survey fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת סקר" }, { status: 500 });
  }
}

// PATCH /api/designer/crm/surveys/[surveyId] — submit survey (by client via token)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    const { surveyId } = await params;
    const body = await req.json();
    const { overallScore, communicationScore, qualityScore, timelinessScore, freeTextComment } = body;

    // Find by token or ID
    const survey = await prisma.crmSatisfactionSurvey.findFirst({
      where: {
        OR: [{ id: surveyId }, { token: surveyId }],
      },
    });

    if (!survey) {
      return NextResponse.json({ error: "סקר לא נמצא" }, { status: 404 });
    }

    if (survey.completedAt) {
      return NextResponse.json({ error: "הסקר כבר מולא" }, { status: 400 });
    }

    const updated = await prisma.crmSatisfactionSurvey.update({
      where: { id: survey.id },
      data: {
        overallScore: overallScore || null,
        communicationScore: communicationScore || null,
        qualityScore: qualityScore || null,
        timelinessScore: timelinessScore || null,
        freeTextComment: freeTextComment?.trim() || null,
        completedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Survey update error:", error);
    return NextResponse.json({ error: "שגיאה בשמירת סקר" }, { status: 500 });
  }
}
