export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { logAuditEvent } from "@/lib/audit-logger";

// POST /api/data-deletion — public: anyone can request deletion
// Logs the request, emails the admin, and emails a confirmation to the user.
// Actual deletion is performed manually within 30 days (per privacy policy).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, reason } = body as { email?: string; reason?: string };

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "נא לציין כתובת אימייל תקינה" }, { status: 400 });
    }

    const clientIp =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";
    const timestamp = new Date().toISOString();

    // Best-effort: find matching designer/supplier so the admin email includes
    // context. We don't fail if the email isn't on file — the user might be
    // requesting deletion after already being removed, or the form might be
    // filed on behalf of someone else who forgot their exact registration email.
    let accountType: "designer" | "supplier" | "unknown" = "unknown";
    let accountId: string | null = null;
    try {
      const designer = await prisma.designer.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true },
      });
      if (designer) {
        accountType = "designer";
        accountId = designer.id;
      } else {
        const supplier = await prisma.supplier.findUnique({
          where: { email: email.toLowerCase() },
          select: { id: true },
        });
        if (supplier) {
          accountType = "supplier";
          accountId = supplier.id;
        }
      }
    } catch (lookupErr) {
      // Non-fatal — just proceed without account context.
      console.error("Data deletion account lookup failed:", lookupErr);
    }

    // Audit log (retained 90 days per policy).
    logAuditEvent("DATA_DELETION_REQUESTED", email, {
      reason: reason || null,
      accountType,
      accountId,
      userAgent,
    }, clientIp);

    // Notify the operator.
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "tamar@zirat.co.il";
    try {
      await sendEmail({
        to: ADMIN_EMAIL,
        subject: `[Zirat] בקשת מחיקת נתונים — ${email}`,
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #C9A84C;">בקשת מחיקת נתונים</h1>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>אימייל:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;" dir="ltr">${email}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>סוג חשבון:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${accountType}${accountId ? ` (${accountId})` : ""}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>תאריך בקשה:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${timestamp}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>IP:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;" dir="ltr">${clientIp}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>User Agent:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 11px;" dir="ltr">${userAgent}</td></tr>
              ${reason ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; vertical-align: top;"><strong>סיבה:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${reason.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td></tr>` : ""}
            </table>
            <p style="color: #666; font-size: 13px; margin-top: 20px;">
              על פי מדיניות הפרטיות, יש להשלים את המחיקה בתוך 30 יום.
            </p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Failed to send admin notification for data deletion:", emailErr);
      // still return success so the user knows we received the request
    }

    // Confirmation to the user.
    try {
      await sendEmail({
        to: email,
        subject: "אישור קבלת בקשת מחיקה — זירת האדריכלות",
        html: `
          <div dir="rtl" style="font-family: Heebo, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e5e5; padding: 40px; border-radius: 12px;">
            <h1 style="color: #C9A84C; text-align: center;">בקשת המחיקה שלך התקבלה</h1>
            <p>שלום,</p>
            <p>קיבלנו את בקשתך למחיקת הנתונים האישיים שלך מפלטפורמת זירת האדריכלות.</p>
            <ul style="line-height: 1.8;">
              <li>הבקשה נרשמה ב-${new Date(timestamp).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}</li>
              <li>המחיקה תבוצע בתוך 30 יום.</li>
              <li>אם חיברת את Google Calendar, הטוקנים המאוחסנים ימחקו במהלך המחיקה. ניתן לנתק מיידית מ-
                <a href="https://myaccount.google.com/permissions" style="color: #C9A84C;">myaccount.google.com/permissions</a>.
              </li>
              <li>בכל שאלה: <a href="mailto:${ADMIN_EMAIL}" style="color: #C9A84C;">${ADMIN_EMAIL}</a></li>
            </ul>
            <p>אם הבקשה נשלחה בטעות, השב/י למייל זה תוך 7 ימים.</p>
            <p style="color: #666; font-size: 12px; text-align: center; margin-top: 40px;">זירת האדריכלות</p>
          </div>
        `,
      });
    } catch (confirmErr) {
      console.error("Failed to send user confirmation for data deletion:", confirmErr);
      // non-fatal
    }

    return NextResponse.json({
      success: true,
      message: "בקשה התקבלה. אישור נשלח לכתובת האימייל שציינת.",
    });
  } catch (err) {
    console.error("Data deletion request error:", err);
    return NextResponse.json({ error: "שגיאה בעיבוד הבקשה" }, { status: 500 });
  }
}
