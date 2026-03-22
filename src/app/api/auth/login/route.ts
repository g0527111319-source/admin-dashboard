import { txt } from "@/content/siteText";
import { NextRequest, NextResponse } from "next/server";
import { loginWithEmail, setSessionCookie, type UserRole } from "@/lib/auth";
export const dynamic = "force-dynamic";
// POST /api/auth/login ג€” ׳›׳ ׳™׳¡׳” ׳¢׳ ׳׳™׳׳™׳™׳ ׳•׳¡׳™׳¡׳׳”
export async function POST(req: NextRequest) {
    try {
        const { email, password, role } = await req.json();
        if (!email || !password) {
            return NextResponse.json({ error: txt("src/app/api/auth/login/route.ts::001", "\u05E0\u05D3\u05E8\u05E9 \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05D5\u05E1\u05D9\u05E1\u05DE\u05D4") }, { status: 400 });
        }
        const validRoles: UserRole[] = ["admin", "supplier", "designer"];
        const userRole: UserRole = validRoles.includes(role) ? role : "designer";
        const result = await loginWithEmail(email, password, userRole);
        if (!result.success || !result.session) {
            return NextResponse.json({ error: result.error || txt("src/app/api/auth/login/route.ts::002", "\u05E4\u05E8\u05D8\u05D9 \u05DB\u05E0\u05D9\u05E1\u05D4 \u05E9\u05D2\u05D5\u05D9\u05D9\u05DD") }, { status: 401 });
        }
        // ׳©׳׳™׳¨׳× session
        await setSessionCookie(result.session);
        // redirect URL based on role
        let redirectUrl = "/";
        if (result.session.role === "admin")
            redirectUrl = "/admin";
        else if (result.session.role === "supplier")
            redirectUrl = "/supplier/demo";
        else if (result.session.role === "designer")
            redirectUrl = "/designer/demo";
        return NextResponse.json({
            success: true,
            user: {
                id: result.session.userId,
                role: result.session.role,
                name: result.session.name,
                email: result.session.email,
            },
            redirectUrl,
        });
    }
    catch (error) {
        console.error("Login error:", error);
        return NextResponse.json({ error: txt("src/app/api/auth/login/route.ts::003", "\u05E9\u05D2\u05D9\u05D0\u05EA \u05DB\u05E0\u05D9\u05E1\u05D4") }, { status: 500 });
    }
}

