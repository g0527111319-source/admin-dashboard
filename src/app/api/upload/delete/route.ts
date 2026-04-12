export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { deleteFromR2 } from "@/lib/r2";
import { logAuditEvent } from "@/lib/audit-logger";

export async function POST(request: NextRequest) {
  try {
    const { key } = await request.json();

    if (!key || typeof key !== "string") {
      return NextResponse.json({ error: "מפתח קובץ חסר" }, { status: 400 });
    }

    // Security: prevent path traversal
    if (key.includes("..") || key.startsWith("/")) {
      return NextResponse.json({ error: "מפתח קובץ לא תקין" }, { status: 400 });
    }

    await deleteFromR2(key);

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";
    const userId = request.headers.get("x-user-id") || "unknown";
    logAuditEvent("FILE_DELETE", userId, { key }, ip);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete file error:", error);
    return NextResponse.json(
      { error: "שגיאה במחיקת הקובץ" },
      { status: 500 }
    );
  }
}
