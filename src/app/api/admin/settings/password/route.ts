import { NextRequest, NextResponse } from "next/server";
import { isAdmin, changeAdminPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/admin/settings/password — change admin password
export async function POST(req: NextRequest) {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });
    }

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
