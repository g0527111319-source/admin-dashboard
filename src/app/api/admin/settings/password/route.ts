import { NextRequest, NextResponse } from "next/server";
import { changeAdminPassword } from "@/lib/auth";
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// POST /api/admin/settings/password — change admin password
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    const currentPassword = String(body?.currentPassword || "");
    const newPassword = String(body?.newPassword || "");

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
    }

    const result = await changeAdminPassword(currentPassword, newPassword);
    if (!result.success) {
      return NextResponse.json({ error: result.error || "שגיאה בשינוי סיסמה" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin password change error:", error);
    return NextResponse.json({ error: "שגיאה בשינוי סיסמה" }, { status: 500 });
  }
}
