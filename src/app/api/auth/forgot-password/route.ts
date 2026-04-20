import { txt } from "@/content/siteText";
import { NextRequest, NextResponse } from "next/server";
import { createResetToken, type UserRole } from "@/lib/auth";
import { Resend } from "resend";
export const dynamic = "force-dynamic";
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
// POST /api/auth/forgot-password — שליחת קישור איפוס סיסמה
export async function POST(req: NextRequest) {
    try {
        const { email, role } = await req.json();
        if (!email) {
            return NextResponse.json({ error: txt("src/app/api/auth/forgot-password/route.ts::001", "\u05E0\u05D3\u05E8\u05E9 \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC") }, { status: 400 });
        }
        const userRole: UserRole = role === "supplier" ? "supplier" : "designer";
        const result = await createResetToken(email, userRole);
        if (!result.success) {
            // Don't reveal if email exists - just say we sent it
            return NextResponse.json({
                success: true,
                message: txt("src/app/api/auth/forgot-password/route.ts::002", "\u05D0\u05DD \u05D4\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05E7\u05D9\u05D9\u05DD \u05D1\u05DE\u05E2\u05E8\u05DB\u05EA, \u05E7\u05D9\u05E9\u05D5\u05E8 \u05DC\u05D0\u05D9\u05E4\u05D5\u05E1 \u05E1\u05D9\u05E1\u05DE\u05D4 \u05E0\u05E9\u05DC\u05D7 \u05D0\u05DC\u05D9\u05D5"),
            });
        }
        // שליחת אימייל עם קישור איפוס
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const resetUrl = `${appUrl}/reset-password?token=${result.resetToken}`;
        if (resend) {
            try {
                await resend.emails.send({
                    from: txt("src/app/api/auth/forgot-password/route.ts::003", "\u05D6\u05D9\u05E8\u05EA \u05D4\u05D0\u05D3\u05E8\u05D9\u05DB\u05DC\u05D5\u05EA <noreply@ziratadrichalut.co.il>"),
                    to: email,
                    subject: txt("src/app/api/auth/forgot-password/route.ts::004", "\u05D0\u05D9\u05E4\u05D5\u05E1 \u05E1\u05D9\u05E1\u05DE\u05D4 \u2014 \u05D6\u05D9\u05E8\u05EA \u05D4\u05D0\u05D3\u05E8\u05D9\u05DB\u05DC\u05D5\u05EA"),
                    html: `
            <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; padding: 30px 0;">
                <h1 style="color: #1A1A1A; margin: 0;">זירת האדריכלות</h1>
                <p style="color: #C9A84C; margin: 5px 0 0;">קהילה שהיא בית</p>
              </div>
              <div style="background: #FAF9F6; border-radius: 12px; padding: 30px; border: 1px solid #E8E4DC;">
                <h2 style="color: #1A1A1A; margin-top: 0;">שלום ${result.name},</h2>
                <p style="color: #4B5563;">קיבלנו בקשה לאיפוס הסיסמה שלך.</p>
                <p style="color: #4B5563;">לחצ/י על הכפתור למטה לאיפוס הסיסמה:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}"
                     style="background: #C9A84C; color: #1A1A1A; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                    איפוס סיסמה
                  </a>
                </div>
                <p style="color: #9CA3AF; font-size: 14px;">הקישור תקף לשעה אחת בלבד.</p>
                <p style="color: #9CA3AF; font-size: 14px;">אם לא ביקשת לאפס את הסיסמה, אפשר להתעלם מהודעה זו.</p>
              </div>
            </div>
          `,
                });
            }
            catch (emailError) {
                console.error("Email send error");
            }
        }
        else {
            // Dev-only: reset link generated (not logged for security)
        }
        return NextResponse.json({
            success: true,
            message: txt("src/app/api/auth/forgot-password/route.ts::005", "\u05D0\u05DD \u05D4\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05E7\u05D9\u05D9\u05DD \u05D1\u05DE\u05E2\u05E8\u05DB\u05EA, \u05E7\u05D9\u05E9\u05D5\u05E8 \u05DC\u05D0\u05D9\u05E4\u05D5\u05E1 \u05E1\u05D9\u05E1\u05DE\u05D4 \u05E0\u05E9\u05DC\u05D7 \u05D0\u05DC\u05D9\u05D5"),
        });
    }
    catch (error) {
        console.error("Forgot password error");
        return NextResponse.json({ error: txt("src/app/api/auth/forgot-password/route.ts::006", "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DC\u05D9\u05D7\u05EA \u05E7\u05D9\u05E9\u05D5\u05E8 \u05D0\u05D9\u05E4\u05D5\u05E1") }, { status: 500 });
    }
}
