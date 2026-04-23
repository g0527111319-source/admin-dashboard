import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface WaTemplate {
  id: string;
  name: string;
  body: string;
  variables: string[];
}

// PUT /api/admin/whatsapp/templates — replace full templates list
export async function PUT(req: NextRequest) {
  try {
    const admin = await isAdmin();
    if (!admin) return NextResponse.json({ error: "אין הרשאה" }, { status: 401 });

    const body = await req.json();
    const templates = Array.isArray(body?.templates) ? body.templates : null;
    if (!templates) return NextResponse.json({ error: "חסרים נתונים" }, { status: 400 });

    const cleaned: WaTemplate[] = (templates as unknown[])
      .filter((t): t is Record<string, unknown> => !!t && typeof t === "object")
      .map((t) => ({
        id: String(t.id || `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
        name: String(t.name || ""),
        body: String(t.body || ""),
        variables: Array.isArray(t.variables) ? (t.variables as unknown[]).map(String) : [],
      }));

    await prisma.systemSetting.upsert({
      where: { key: "whatsapp_templates" },
      create: { key: "whatsapp_templates", value: cleaned as unknown as object },
      update: { value: cleaned as unknown as object },
    });

    return NextResponse.json({ success: true, templates: cleaned });
  } catch (error) {
    console.error("WA templates save error:", error);
    return NextResponse.json({ error: "שגיאה בשמירת תבניות" }, { status: 500 });
  }
}
