import { txt } from "@/content/siteText";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, setSessionCookie } from "@/lib/auth";
export const dynamic = "force-dynamic";
// POST /api/auth/set-password — הגדרת סיסמה לספק/מעצבת (דרך magic-link ראשוני)
export async function POST(req: NextRequest) {
    try {
        const { loginToken, password, type } = await req.json();
        if (!loginToken || !password) {
            return NextResponse.json({ error: txt("src/app/api/auth/set-password/route.ts::001", "\u05D7\u05E1\u05E8\u05D9\u05DD \u05D8\u05D5\u05E7\u05DF \u05D0\u05D5 \u05E1\u05D9\u05E1\u05DE\u05D4") }, { status: 400 });
        }
        if (password.length < 6) {
            return NextResponse.json({ error: txt("src/app/api/auth/set-password/route.ts::002", "\u05D4\u05E1\u05D9\u05E1\u05DE\u05D4 \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05DB\u05D9\u05DC \u05DC\u05E4\u05D7\u05D5\u05EA 6 \u05EA\u05D5\u05D5\u05D9\u05DD") }, { status: 400 });
        }
        const passwordHash = await hashPassword(password);
        if (type === "supplier") {
            const supplier = await prisma.supplier.findUnique({
                where: { loginToken },
            });
            if (!supplier) {
                return NextResponse.json({ error: txt("src/app/api/auth/set-password/route.ts::003", "\u05D8\u05D5\u05E7\u05DF \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF") }, { status: 404 });
            }
            await prisma.supplier.update({
                where: { id: supplier.id },
                data: { passwordHash },
            });
            await setSessionCookie({
                userId: supplier.id,
                role: "supplier",
                email: supplier.email || "",
                name: supplier.name,
            });
            return NextResponse.json({
                success: true,
                redirectUrl: `/supplier/${supplier.id}`,
            });
        }
        if (type === "designer") {
            const designer = await prisma.designer.findUnique({
                where: { loginToken },
            });
            if (!designer) {
                return NextResponse.json({ error: txt("src/app/api/auth/set-password/route.ts::004", "\u05D8\u05D5\u05E7\u05DF \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF") }, { status: 404 });
            }
            await prisma.designer.update({
                where: { id: designer.id },
                data: { passwordHash },
            });
            await setSessionCookie({
                userId: designer.id,
                role: "designer",
                email: designer.email || "",
                name: designer.fullName,
            });
            return NextResponse.json({
                success: true,
                redirectUrl: `/designer/${designer.id}`,
            });
        }
        return NextResponse.json({ error: txt("src/app/api/auth/set-password/route.ts::005", "\u05E1\u05D5\u05D2 \u05DE\u05E9\u05EA\u05DE\u05E9 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF") }, { status: 400 });
    }
    catch (error) {
        console.error("Set password error");
        return NextResponse.json({ error: txt("src/app/api/auth/set-password/route.ts::006", "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05D2\u05D3\u05E8\u05EA \u05E1\u05D9\u05E1\u05DE\u05D4") }, { status: 500 });
    }
}
