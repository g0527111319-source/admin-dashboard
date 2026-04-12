/**
 * GET /api/notifications/unread-count
 * Query: ?userId=&userType=designer|admin
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { unreadCount } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    // Security: only allow fetching own notification count
    const authenticatedUserId = req.headers.get("x-user-id");
    const userId = url.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "חסר מזהה משתמש" }, { status: 400 });
    }
    if (authenticatedUserId && userId !== authenticatedUserId) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }
    const userType = (url.searchParams.get("userType") || "designer") as "designer" | "admin";
    const count = await unreadCount(userId, userType);
    return NextResponse.json({ count });
  } catch (error) {
    console.error("[notifications unread-count] error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת מונה ההתראות" }, { status: 500 });
  }
}
