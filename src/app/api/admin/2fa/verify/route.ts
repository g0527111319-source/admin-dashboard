/**
 * POST /api/admin/2fa/verify
 * Body: { adminEmail, purpose, code, contextId? }
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifyCode } from "@/lib/admin-2fa";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { adminEmail, purpose, code, contextId } = body || {};
    if (!adminEmail || !purpose || !code) {
      return NextResponse.json({ ok: false, error: "חסרים פרטים נדרשים" }, { status: 400 });
    }
    const ok = await verifyCode(adminEmail, purpose, String(code), contextId);
    return NextResponse.json({ ok });
  } catch (error) {
    console.error("[admin 2fa verify] error:", error);
    return NextResponse.json({ ok: false, error: "שגיאה באימות הקוד" }, { status: 500 });
  }
}
