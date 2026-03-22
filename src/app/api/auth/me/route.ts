import { txt } from "@/content/siteText";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
export const dynamic = "force-dynamic";
// GET /api/auth/me — מידע על המשתמש המחובר
export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: txt("src/app/api/auth/me/route.ts::001", "\u05DC\u05D0 \u05DE\u05D7\u05D5\u05D1\u05E8") }, { status: 401 });
        }
        return NextResponse.json({
            user: {
                id: session.userId,
                role: session.role,
                email: session.email,
                name: session.name,
            },
        });
    }
    catch (error) {
        console.error("Get user error:", error);
        return NextResponse.json({ error: txt("src/app/api/auth/me/route.ts::002", "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05E4\u05E8\u05D8\u05D9 \u05DE\u05E9\u05EA\u05DE\u05E9") }, { status: 500 });
    }
}
