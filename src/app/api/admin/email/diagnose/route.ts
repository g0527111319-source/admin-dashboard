export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { sendEmail, isSandboxFrom, getFromEmail } from "@/lib/email";
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth";

/**
 * GET /api/admin/email/diagnose
 *
 * Admin-only diagnostic. Returns the current email configuration so the
 * admin can verify what's really set on the server (env vars are invisible
 * from the UI) without grep-ing Vercel logs.
 */
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;

  const fromEmail = getFromEmail();
  const sandbox = isSandboxFrom();
  const hasApiKey = !!process.env.RESEND_API_KEY;

  const issues: string[] = [];
  if (!hasApiKey) {
    issues.push("RESEND_API_KEY לא מוגדר — אף מייל לא יוצא בכלל.");
  }
  if (sandbox) {
    issues.push(
      "ה-FROM_EMAIL משתמש בדומיין ה-sandbox של Resend (@resend.dev). Resend חוסם שליחה מדומיין זה לכל כתובת שהיא למעט בעל חשבון ה-Resend עצמו — ולכן לקוחות לא מקבלים מיילים. יש לאמת דומיין משלך ב-https://resend.com/domains ולהגדיר FROM_EMAIL ב-Vercel.",
    );
  }

  return NextResponse.json({
    config: {
      fromEmail,
      isSandbox: sandbox,
      hasApiKey,
      adminEmail: process.env.ADMIN_EMAIL || null,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || null,
    },
    issues,
  });
}

/**
 * POST /api/admin/email/diagnose
 * Body: { to: string }
 *
 * Sends a minimal test email to the requested address and returns the
 * real Resend response (or error). Useful for verifying that a custom
 * FROM_EMAIL / domain is actually delivering.
 */
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null) as { to?: string } | null;
  const to = body?.to?.trim();
  if (!to) {
    return NextResponse.json({ error: "חסרה כתובת נמען" }, { status: 400 });
  }

  const result = await sendEmail({
    to,
    subject: "בדיקת שליחת מייל — זירת האדריכלות",
    html: `
      <div dir="rtl" style="font-family:Heebo,Arial,sans-serif;max-width:560px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;padding:32px;border-radius:12px;border:1px solid #C9A84C33;">
        <h2 style="color:#C9A84C;margin-top:0;">בדיקה</h2>
        <p>אם קיבלת את המייל הזה — הגדרת ה-FROM_EMAIL ו-Resend פועלות כשורה.</p>
        <p style="color:#666;font-size:11px;margin-top:24px;">נשלח אוטומטית מאבחון המערכת.</p>
      </div>
    `,
  });

  return NextResponse.json({
    to,
    fromEmail: getFromEmail(),
    sandbox: isSandboxFrom(),
    result,
  });
}
