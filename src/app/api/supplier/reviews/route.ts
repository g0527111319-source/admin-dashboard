import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { requireRole, ADMIN_OR_SUPPLIER } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// GET /api/supplier/reviews — list reviews this supplier sent
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_SUPPLIER);
  if (!auth.ok) return auth.response;
  try {
    const supplierId = auth.userId;

    const reviews = await prisma.supplierDesignerReview.findMany({
      where: { supplierId },
      orderBy: { createdAt: "desc" },
      include: {
        designer: { select: { id: true, fullName: true, city: true, email: true } },
      },
    });

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error("Supplier reviews list error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת ביקורות" }, { status: 500 });
  }
}

// POST /api/supplier/reviews — create a new review request and email the designer
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_SUPPLIER);
  if (!auth.ok) return auth.response;
  try {
    const supplierId = auth.userId;

    const body = await req.json();
    const { designerId } = body;
    if (!designerId) {
      return NextResponse.json({ error: "חסר מזהה מעצבת" }, { status: 400 });
    }

    const [designer, supplier] = await Promise.all([
      prisma.designer.findUnique({
        where: { id: designerId },
        select: { id: true, fullName: true, firstName: true, email: true },
      }),
      prisma.supplier.findUnique({
        where: { id: supplierId },
        select: { name: true, contactName: true },
      }),
    ]);

    if (!designer) {
      return NextResponse.json({ error: "מעצבת לא נמצאה" }, { status: 404 });
    }

    const review = await prisma.supplierDesignerReview.create({
      data: {
        supplierId,
        designerId,
        sentAt: new Date(),
      },
      include: {
        designer: { select: { id: true, fullName: true, city: true, email: true } },
      },
    });

    // Email the designer with the review link
    let emailWarning: { message: string; sandbox?: boolean; to?: string } | null = null;
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.ziratadrichalut.co.il";
    const reviewUrl = `${APP_URL}/supplier-review/${review.token}`;
    const recipient = designer.email || "";
    const greetName = designer.firstName || designer.fullName || "";
    const supplierName = supplier?.name || supplier?.contactName || "הספק";

    if (recipient) {
      try {
        const result = await sendEmail({
          to: recipient,
          subject: `בקשת ביקורת מ-${supplierName}`,
          html: `
            <div dir="rtl" style="font-family: Heebo, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #faf5e8; color: #1a1a1a; padding: 40px; border-radius: 12px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #B8860B; font-size: 28px; margin: 0;">זירת האדריכלות</h1>
              </div>
              <h2 style="color: #1a1a1a;">${greetName ? `${greetName}, ` : ""}נשמח לשמוע את דעתך</h2>
              <p><strong>${supplierName}</strong> מזמין אותך להשאיר ביקורת קצרה על העבודה המשותפת.</p>
              <p>הביקורת היא אופציונלית לחלוטין — תוכלי לבחור האם לאשר שתופיע בכרטיס הביקור של ${supplierName}, באופן אנונימי או עם שם מלא ופלאפון.</p>
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
              ? "המייל לא נשלח: שרת המייל פועל במצב sandbox. ניתן להעתיק את קישור הביקורת ולשלוח למעצבת ב-WhatsApp/SMS."
              : `שליחת המייל נכשלה: ${result.message || "שגיאה לא ידועה"}. ניתן להעתיק את הקישור ולשלוח ידנית.`,
            sandbox: result.sandbox,
            to: recipient,
          };
        }
      } catch (emailError) {
        console.error("Failed to send supplier-review email:", emailError);
        emailWarning = {
          message: `שליחת המייל נכשלה: ${emailError instanceof Error ? emailError.message : "שגיאה לא ידועה"}. ניתן להעתיק את הקישור ולשלוח ידנית.`,
          to: recipient,
        };
      }
    } else {
      emailWarning = {
        message: "למעצבת אין מייל שמור במערכת — העתיקי את קישור הביקורת ושלחי ידנית.",
      };
    }

    return NextResponse.json({ ...review, emailWarning }, { status: 201 });
  } catch (error) {
    console.error("Supplier review create error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת ביקורת" }, { status: 500 });
  }
}
