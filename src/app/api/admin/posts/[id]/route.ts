import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// PATCH /api/admin/posts/[id] — update schedule / metadata (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "חסר מזהה פרסום" }, { status: 400 });

    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.scheduledDate !== undefined) {
      data.scheduledDate = body.scheduledDate ? new Date(body.scheduledDate) : null;
    }
    if (body.scheduledTime !== undefined) {
      data.scheduledTime = body.scheduledTime === null ? null : String(body.scheduledTime);
    }
    if (body.caption !== undefined) {
      data.caption = body.caption === null ? null : String(body.caption);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "אין שדות לעדכון" }, { status: 400 });
    }

    const updated = await prisma.post.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Admin post update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון פרסום" }, { status: 500 });
  }
}
