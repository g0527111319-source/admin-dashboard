import { txt } from "@/content/siteText";
import { NextRequest, NextResponse } from "next/server";
import { registerDesigner } from "@/lib/auth";
export const dynamic = "force-dynamic";

// POST /api/auth/register — הרשמת מעצבת חדשה (ממתינה לאישור)
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { fullName, email, phone, password, city, specialization, employmentType, yearsAsIndependent } = body;

        // ולידציה
        if (!fullName || !email || !phone || !password) {
            return NextResponse.json({ error: txt("src/app/api/auth/register/route.ts::001", "נדרשים שם מלא, אימייל, טלפון וסיסמה") }, { status: 400 });
        }
        if (password.length < 6) {
            return NextResponse.json({ error: txt("src/app/api/auth/register/route.ts::002", "הסיסמה חייבת להכיל לפחות 6 תווים") }, { status: 400 });
        }

        // ולידציה של אימייל
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: txt("src/app/api/auth/register/route.ts::003", "כתובת אימייל לא תקינה") }, { status: 400 });
        }

        const result = await registerDesigner({
            fullName,
            email,
            phone,
            password,
            city,
            specialization,
            employmentType: employmentType || undefined,
            yearsAsIndependent: yearsAsIndependent != null ? Number(yearsAsIndependent) : undefined,
        });

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        // לא עושים כניסה אוטומטית — ממתינה לאישור מנהלת
        const messages: Record<string, string> = {
            pending: "הבקשה נשלחה בהצלחה! מנהלת הקהילה תאשר את הבקשה בהקדם.",
            already_pending: "הבקשה שלך כבר בטיפול. מנהלת הקהילה תאשר בהקדם.",
            reapplied: "הבקשה נשלחה מחדש! מנהלת הקהילה תבדוק שוב בהקדם.",
        };

        return NextResponse.json({
            success: true,
            status: result.status || "pending",
            message: messages[result.status || "pending"] || messages.pending,
        }, { status: 201 });
    }
    catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json({ error: txt("src/app/api/auth/register/route.ts::004", "שגיאה בהרשמה") }, { status: 500 });
    }
}
