import { txt } from "@/content/siteText";
import { NextRequest, NextResponse } from "next/server";
import { registerDesigner, setSessionCookie } from "@/lib/auth";
export const dynamic = "force-dynamic";
// POST /api/auth/register — הרשמת מעצבת חדשה
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { fullName, email, phone, password, city, specialization } = body;
        // ולידציה
        if (!fullName || !email || !phone || !password) {
            return NextResponse.json({ error: txt("src/app/api/auth/register/route.ts::001", "\u05E0\u05D3\u05E8\u05E9\u05D9\u05DD \u05E9\u05DD \u05DE\u05DC\u05D0, \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC, \u05D8\u05DC\u05E4\u05D5\u05DF \u05D5\u05E1\u05D9\u05E1\u05DE\u05D4") }, { status: 400 });
        }
        if (password.length < 6) {
            return NextResponse.json({ error: txt("src/app/api/auth/register/route.ts::002", "\u05D4\u05E1\u05D9\u05E1\u05DE\u05D4 \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05DB\u05D9\u05DC \u05DC\u05E4\u05D7\u05D5\u05EA 6 \u05EA\u05D5\u05D5\u05D9\u05DD") }, { status: 400 });
        }
        // ולידציה של אימייל
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: txt("src/app/api/auth/register/route.ts::003", "\u05DB\u05EA\u05D5\u05D1\u05EA \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4") }, { status: 400 });
        }
        const result = await registerDesigner({
            fullName,
            email,
            phone,
            password,
            city,
            specialization,
        });
        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }
        // כניסה אוטומטית אחרי הרשמה
        await setSessionCookie({
            userId: result.designerId!,
            role: "designer",
            email,
            name: fullName,
        });
        return NextResponse.json({
            success: true,
            redirectUrl: `/designer/${result.designerId}`,
        }, { status: 201 });
    }
    catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json({ error: txt("src/app/api/auth/register/route.ts::004", "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05E8\u05E9\u05DE\u05D4") }, { status: 500 });
    }
}
