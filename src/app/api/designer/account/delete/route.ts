export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit-logger";
import { sendEmail } from "@/lib/email";

// POST /api/designer/account/delete — authenticated: designer self-deletes
// Requires a confirmation string in the body ("DELETE") to prevent accidental
// clicks. Performs cascading delete of all the designer's owned data, then
// removes the designer record itself. The session cookie is cleared by the
// client after a successful 200 response.
export async function POST(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    const role = req.headers.get("x-user-role");
    if (!designerId || role !== "designer") {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { confirm } = body as { confirm?: string };
    if (confirm !== "DELETE") {
      return NextResponse.json(
        { error: "יש לאשר באמצעות הקלדת DELETE" },
        { status: 400 },
      );
    }

    const clientIp =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // Capture the email for the farewell confirmation before we delete.
    const designer = await prisma.designer.findUnique({
      where: { id: designerId },
      select: { email: true, fullName: true },
    });
    if (!designer) {
      return NextResponse.json({ error: "חשבון לא נמצא" }, { status: 404 });
    }

    // Cascading delete — the schema has onDelete: Cascade on the relevant
    // relations (projects, clients, contracts, calendar events, google-calendar
    // tokens), so a single designer.delete() is enough. If something is missed
    // by the schema we still want the row gone, so we catch & log.
    try {
      await prisma.designer.delete({ where: { id: designerId } });
    } catch (delErr) {
      console.error("Designer self-delete failed:", delErr);
      return NextResponse.json(
        { error: "שגיאה במחיקת החשבון. נסה/י שוב או פנה/י לתמיכה." },
        { status: 500 },
      );
    }

    logAuditEvent(
      "ACCOUNT_SELF_DELETED",
      designerId,
      { email: designer.email, role: "designer" },
      clientIp,
    );

    // Farewell confirmation so the user has a written record that deletion was
    // completed. Non-fatal if it fails.
    if (designer.email) {
      try {
        await sendEmail({
          to: designer.email,
          subject: "חשבונך נמחק — זירת האדריכלות",
          html: `
            <div dir="rtl" style="font-family: Heebo, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; padding: 40px; border-radius: 12px;">
              <h1 style="color: #C9A84C; text-align: center;">חשבונך נמחק</h1>
              <p>שלום ${designer.fullName || ""},</p>
              <p>חשבונך בזירת האדריכלות נמחק בהצלחה. כל הנתונים המשויכים — פרויקטים, לקוחות, חוזים, אסימוני Google Calendar, וכד׳ — הוסרו מבסיס הנתונים שלנו.</p>
              <p style="color: #999; font-size: 13px;">
                הערה: גיבויים של בסיס הנתונים נשמרים עד 30 יום לצרכי שחזור תקלות ולאחר מכן נמחקים לצמיתות. לוגים של אבטחה נשמרים לכל היותר 90 יום.
              </p>
              <p style="color: #999; font-size: 13px;">
                אם חיברת את Google Calendar ועדיין רואה את זירת האדריכלות בהרשאות Google שלך, ניתן להסיר גם משם:
                <a href="https://myaccount.google.com/permissions" style="color: #C9A84C;">myaccount.google.com/permissions</a>.
              </p>
              <p style="color: #666; font-size: 12px; text-align: center; margin-top: 40px;">תודה שהיית איתנו.</p>
            </div>
          `,
        });
      } catch (mailErr) {
        console.error("Farewell email failed:", mailErr);
      }
    }

    // Clear session cookie.
    const response = NextResponse.json({ success: true });
    response.cookies.set("session_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (err) {
    console.error("Account deletion error:", err);
    return NextResponse.json({ error: "שגיאה במחיקת החשבון" }, { status: 500 });
  }
}
