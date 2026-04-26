export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = requireRole(request, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const url = new URL(request.url);
    const typeParam = url.searchParams.get("type");
    const statusParam = url.searchParams.get("status");

    const where: { type?: "BUG" | "FEATURE"; status?: "NEW" | "READ" | "RESOLVED" } = {};
    if (typeParam === "BUG" || typeParam === "FEATURE") where.type = typeParam;
    if (statusParam === "NEW" || statusParam === "READ" || statusParam === "RESOLVED") {
      where.status = statusParam;
    }

    const items = await prisma.feedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("[admin/feedback] list error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת הדיווחים" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = requireRole(request, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json().catch(() => null);
    const id = body?.id as string | undefined;
    const status = body?.status as "NEW" | "READ" | "RESOLVED" | undefined;
    if (!id || !status) {
      return NextResponse.json({ error: "חסרים פרטים" }, { status: 400 });
    }
    if (status !== "NEW" && status !== "READ" && status !== "RESOLVED") {
      return NextResponse.json({ error: "סטטוס לא חוקי" }, { status: 400 });
    }
    await prisma.feedback.update({ where: { id }, data: { status } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/feedback] update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = requireRole(request, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
    await prisma.feedback.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/feedback] delete error:", error);
    return NextResponse.json({ error: "שגיאה במחיקה" }, { status: 500 });
  }
}
