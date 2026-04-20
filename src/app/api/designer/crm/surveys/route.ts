import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// GET /api/designer/crm/surveys — list surveys
export async function GET(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    const where: Record<string, unknown> = {};
    if (projectId) {
      where.projectId = projectId;
    }

    // Get surveys through projects owned by this designer
    const surveys = await prisma.crmSatisfactionSurvey.findMany({
      where: {
        ...where,
        project: { designerId, deletedAt: null },
      },
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(surveys);
  } catch (error) {
    console.error("Surveys fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת סקרים" }, { status: 500 });
  }
}

// POST /api/designer/crm/surveys — create & send survey (includes email to client)
export async function POST(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, clientId } = body;

    if (!projectId || !clientId) {
      return NextResponse.json({ error: "פרויקט ולקוח הם שדות חובה" }, { status: 400 });
    }

    // Verify project ownership
    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    // Load the client + designer so we can build the email
    const [client, designer] = await Promise.all([
      prisma.crmClient.findUnique({
        where: { id: clientId },
        select: { name: true, firstName: true, email: true, partner1Email: true },
      }),
      prisma.designer.findUnique({
        where: { id: designerId },
        select: { fullName: true },
      }),
    ]);

    const survey = await prisma.crmSatisfactionSurvey.create({
      data: {
        projectId,
        clientId,
        sentAt: new Date(),
      },
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    // Mirror the contract flow: try to email, surface a warning if the send
    // fails so the UI can show a copyable fallback link.
    let emailWarning: { message: string; sandbox?: boolean; to?: string } | null = null;
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.ziratadrichalut.co.il";
    const reviewUrl = `${APP_URL}/survey/${survey.token}`;
    const recipient = client?.email || client?.partner1Email || "";
    const greetName = client?.firstName || client?.name || "";
    const designerName = designer?.fullName || "המעצבת";

    if (recipient) {
      try {
        const result = await sendEmail({
          to: recipient,
          subject: `ביקורת על העבודה עם ${designerName}`,
          html: `
            <div dir="rtl" style="font-family: Heebo, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #faf5e8; color: #1a1a1a; padding: 40px; border-radius: 12px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #B8860B; font-size: 28px; margin: 0;">זירת האדריכלות</h1>
              </div>
              <h2 style="color: #1a1a1a;">${greetName ? `${greetName}, ` : ""}נשמח לשמוע את דעתך</h2>
              <p>${designerName} מזמינה אותך להשאיר ביקורת קצרה על העבודה שלנו בפרויקט <strong>${project.name}</strong>.</p>
              <p>זה לוקח פחות מדקה. תוכל/י לבחור האם לאשר לפרסם את הביקורת, ואם כן — האם בצורה אנונימית או עם שם ופלאפון.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${reviewUrl}" style="background: #faf5e8; color: #1a1a1a; padding: 14px 36px; border: 1.4px solid #1a1a1a; border-radius: 9999px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">להשאיר ביקורת</a>
              </div>
              <p style="color: #555; font-size: 13px;">או הדבק את הלינק בדפדפן:<br/><span style="color:#8b6508">${reviewUrl}</span></p>
              <p style="color: #888; font-size: 12px; text-align: center; margin-top: 40px;">זירת האדריכלות</p>
            </div>
          `,
        });

        if (!result.success) {
          emailWarning = {
            message: result.sandbox
              ? "המייל לא נשלח: שרת המייל פועל במצב sandbox. ניתן להעתיק את קישור הביקורת ולשלוח ללקוח/ה ב-WhatsApp/SMS."
              : `שליחת המייל ללקוח/ה נכשלה: ${result.message || "שגיאה לא ידועה"}. ניתן להעתיק את הקישור ולשלוח ידנית.`,
            sandbox: result.sandbox,
            to: recipient,
          };
        }
      } catch (emailError) {
        console.error("Failed to send survey email to client:", emailError);
        emailWarning = {
          message: `שליחת המייל ללקוח/ה נכשלה: ${emailError instanceof Error ? emailError.message : "שגיאה לא ידועה"}. ניתן להעתיק את הקישור ולשלוח ידנית.`,
          to: recipient,
        };
      }
    } else {
      emailWarning = {
        message: "אין ללקוח/ה כתובת אימייל שמורה — עדכני במסך הלקוח, או העתיקי את קישור הביקורת ושלחי ידנית.",
      };
    }

    return NextResponse.json({ ...survey, emailWarning }, { status: 201 });
  } catch (error) {
    console.error("Survey create error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת סקר" }, { status: 500 });
  }
}
