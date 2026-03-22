import { txt } from "@/content/siteText";
import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";
export const dynamic = "force-dynamic";
// POST /api/auth/logout — התנתקות
export async function POST() {
    try {
        await clearSession();
        return NextResponse.json({ success: true });
    }
    catch (error) {
        console.error("Logout error:", error);
        return NextResponse.json({ error: txt("src/app/api/auth/logout/route.ts::001", "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05EA\u05E0\u05EA\u05E7\u05D5\u05EA") }, { status: 500 });
    }
}
