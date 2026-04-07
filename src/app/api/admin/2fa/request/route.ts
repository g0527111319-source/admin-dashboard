/**
 * POST /api/admin/2fa/request
 * Body: { adminEmail, purpose, contextId? }
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requestCode } from "@/lib/admin-2fa";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { adminEmail, purpose, contextId } = body || {};
    if (!adminEmail || !purpose) {
      return NextResponse.json({ error: "חסרים פרטים נדרשים" }, { status: 400 });
    }
    const result = await requestCode(adminEmail, purpose, contextId);
    return NextResponse.json({ ok: true, expiresAt: result.expiresAt });
  } catch (error) {
    console.error("[admin 2fa request] error:", error);
    return NextResponse.json({ error: "שגיאה בשליחת קוד אימות" }, { status: 500 });
  }
}
