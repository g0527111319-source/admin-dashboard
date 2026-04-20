export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/designer/crm/surveys/[surveyId]/publish
//   body: { publish: boolean }
//
// Toggles whether the review appears on the designer's public profile.
// The designer owns this decision — but she can only publish if the client
// gave one of the consent flavors (ANONYMOUS or FULL). DECLINED stays private.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { surveyId } = await params;
    const body = await req.json().catch(() => ({}));
    const publish = body.publish !== false; // default to true

    // Verify the survey belongs to a project owned by this designer
    const survey = await prisma.crmSatisfactionSurvey.findFirst({
      where: {
        id: surveyId,
        project: { designerId, deletedAt: null },
      },
    });
    if (!survey) {
      return NextResponse.json({ error: "סקר לא נמצא" }, { status: 404 });
    }

    if (publish) {
      if (!survey.completedAt) {
        return NextResponse.json({ error: "אי אפשר לפרסם סקר שלא מולא" }, { status: 400 });
      }
      if (!survey.freeTextComment?.trim()) {
        return NextResponse.json({ error: "אין טקסט ביקורת לפרסם" }, { status: 400 });
      }
      if (survey.publishConsent !== "ANONYMOUS" && survey.publishConsent !== "FULL") {
        return NextResponse.json(
          { error: "הלקוח/ה לא אישר/ה פרסום של הביקורת" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.crmSatisfactionSurvey.update({
      where: { id: survey.id },
      data: { publishedAt: publish ? new Date() : null },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Survey publish toggle error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון פרסום" }, { status: 500 });
  }
}
