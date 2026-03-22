import { txt } from "@/content/siteText";
import { NextRequest, NextResponse } from "next/server";
import { resetPassword } from "@/lib/auth";
export const dynamic = "force-dynamic";
// POST /api/auth/reset-password — איפוס סיסמה
export async function POST(req: NextRequest) {
    try {
        const { token, password } = await req.json();
        if (!token || !password) {
            return NextResponse.json({ error: txt("src/app/api/auth/reset-password/route.ts::001", "\u05D7\u05E1\u05E8\u05D9\u05DD \u05D8\u05D5\u05E7\u05DF \u05D0\u05D5 \u05E1\u05D9\u05E1\u05DE\u05D4") }, { status: 400 });
        }
        if (password.length < 6) {
            return NextResponse.json({ error: txt("src/app/api/auth/reset-password/route.ts::002", "\u05D4\u05E1\u05D9\u05E1\u05DE\u05D4 \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05DB\u05D9\u05DC \u05DC\u05E4\u05D7\u05D5\u05EA 6 \u05EA\u05D5\u05D5\u05D9\u05DD") }, { status: 400 });
        }
        const result = await resetPassword(token, password);
        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }
        return NextResponse.json({
            success: true,
            message: txt("src/app/api/auth/reset-password/route.ts::003", "\u05D4\u05E1\u05D9\u05E1\u05DE\u05D4 \u05D0\u05D5\u05E4\u05E1\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4"),
        });
    }
    catch (error) {
        console.error("Reset password error:", error);
        return NextResponse.json({ error: txt("src/app/api/auth/reset-password/route.ts::004", "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D0\u05D9\u05E4\u05D5\u05E1 \u05E1\u05D9\u05E1\u05DE\u05D4") }, { status: 500 });
    }
}
