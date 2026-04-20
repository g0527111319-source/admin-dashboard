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
// Accepts:
//   - freeTextComment (the review text)
//   - publishConsent: "ANONYMOUS" | "FULL" | "DECLINED"
//   - overallScore/communicationScore/qualityScore/timelinessScore (backward-compat; not collected from the new client form)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    const { surveyId } = await params;
    const body = await req.json();
    const {
      overallScore,
      communicationScore,
      qualityScore,
      timelinessScore,
      freeTextComment,
      publishConsent,
    } = body;

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

    // Normalize publishConsent to one of the allowed values
    const allowedConsent = ["ANONYMOUS", "FULL", "DECLINED"] as const;
    const normalizedConsent = allowedConsent.includes(publishConsent)
      ? publishConsent
      : null;

    const updated = await prisma.crmSatisfactionSurvey.update({
      where: { id: survey.id },
      data: {
        overallScore: overallScore ?? null,
        communicationScore: communicationScore ?? null,
        qualityScore: qualityScore ?? null,
        timelinessScore: timelinessScore ?? null,
        freeTextComment: freeTextComment?.trim() || null,
        publishConsent: normalizedConsent,
        completedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Survey update error:", error);
    return NextResponse.json({ error: "שגיאה בשמירת סקר" }, { status: 500 });
  }
}

// DELETE /api/designer/crm/surveys/[surveyId] — designer removes a sent/filled
// survey from her CRM. Requires ownership via the project.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { surveyId } = await params;

    const survey = await prisma.crmSatisfactionSurvey.findUnique({
      where: { id: surveyId },
      include: { project: { select: { designerId: true } } },
    });

    if (!survey) {
      return NextResponse.json({ error: "סקר לא נמצא" }, { status: 404 });
    }
    if (survey.project?.designerId !== designerId) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    await prisma.crmSatisfactionSurvey.delete({ where: { id: surveyId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Survey delete error:", error);
    return NextResponse.json({ error: "שגיאה במחיקת סקר" }, { status: 500 });
  }
}
