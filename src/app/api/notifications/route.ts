/**
 * GET /api/notifications
 * Query: ?userId=&userType=designer|admin&unread=1&limit=30
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { listNotifications } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "חסר מזהה משתמש" }, { status: 400 });
    }
    const userType = (url.searchParams.get("userType") || "designer") as "designer" | "admin";
    const unreadOnly = url.searchParams.get("unread") === "1";
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam, 10) || 30)) : 30;

    const notifications = await listNotifications(userId, { userType, limit, unreadOnly });
    return NextResponse.json({ notifications, count: notifications.length });
  } catch (error) {
    console.error("[notifications GET] error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת ההתראות" }, { status: 500 });
  }
}
