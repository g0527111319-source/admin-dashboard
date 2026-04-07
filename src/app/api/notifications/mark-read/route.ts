/**
 * POST /api/notifications/mark-read
 * Body: { id?, userId, userType?, all?: boolean }
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { markRead, markAllRead } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, userId, userType, all } = body || {};
    if (!userId) {
      return NextResponse.json({ error: "חסר מזהה משתמש" }, { status: 400 });
    }

    if (all) {
      const result = await markAllRead(userId, (userType || "designer") as "designer" | "admin");
      return NextResponse.json({ ok: true, updated: result.count });
    }

    if (!id) {
      return NextResponse.json({ error: "חסר מזהה התראה" }, { status: 400 });
    }
    const result = await markRead(id, userId);
    return NextResponse.json({ ok: true, updated: result.count });
  } catch (error) {
    console.error("[notifications mark-read] error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון התראה" }, { status: 500 });
  }
}
