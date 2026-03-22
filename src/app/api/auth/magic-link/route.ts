import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";
export const dynamic = "force-dynamic";
// GET /api/auth/magic-link?token=xxx&type=supplier|designer
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get("token");
        const type = searchParams.get("type");
        if (!token || !type) {
            return NextResponse.json({ error: "\u05D7\u05E1\u05E8 \u05D8\u05D5\u05E7\u05DF \u05D0\u05D5 \u05E1\u05D5\u05D2 \u05DE\u05E9\u05EA\u05DE\u05E9" }, { status: 400 });
        }
        if (type === "supplier") {
            const supplier = await prisma.supplier.findUnique({
                where: { loginToken: token },
            });
            if (!supplier) {
                return NextResponse.json({ error: "\u05E7\u05D9\u05E9\u05D5\u05E8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF" }, { status: 404 });
            }
            // Set JWT session cookie
            await setSessionCookie({
                userId: supplier.id,
                role: "supplier",
                email: supplier.email || "",
                name: supplier.name,
            });
            return NextResponse.redirect(new URL(`/supplier/${supplier.id}`, req.url));
        }
        if (type === "designer") {
            const designer = await prisma.designer.findUnique({
                where: { loginToken: token },
            });
            if (!designer) {
                return NextResponse.json({ error: "\u05E7\u05D9\u05E9\u05D5\u05E8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF" }, { status: 404 });
            }
            // Set JWT session cookie
            await setSessionCookie({
                userId: designer.id,
                role: "designer",
                email: designer.email || "",
                name: designer.fullName,
            });
            return NextResponse.redirect(new URL(`/designer/${designer.id}`, req.url));
        }
        return NextResponse.json({ error: "\u05E1\u05D5\u05D2 \u05DE\u05E9\u05EA\u05DE\u05E9 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF" }, { status: 400 });
    }
    catch (error) {
        console.error("Magic link error:", error);
        return NextResponse.json({ error: "\u05E9\u05D2\u05D9\u05D0\u05EA \u05D0\u05D9\u05DE\u05D5\u05EA" }, { status: 500 });
    }
}
