import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// PATCH /api/admin/events/[id] — update event
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "חסר מזהה אירוע" }, { status: 400 });

    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.title !== undefined) data.title = String(body.title);
    if (body.description !== undefined) data.description = body.description === null ? null : String(body.description);
    if (body.location !== undefined) data.location = body.location === null ? null : String(body.location);
    if (body.date !== undefined) data.date = new Date(body.date);
    if (body.isPaid !== undefined) data.isPaid = !!body.isPaid;
    if (body.price !== undefined) data.price = body.price === null || body.price === "" ? null : Number(body.price);
    if (body.maxAttendees !== undefined) data.maxAttendees = body.maxAttendees === null || body.maxAttendees === "" ? null : Number(body.maxAttendees);
    if (body.status !== undefined) data.status = body.status;
    if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl === null ? null : String(body.imageUrl);

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "אין שדות לעדכון" }, { status: 400 });
    }

    const updated = await prisma.event.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Admin event update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון אירוע" }, { status: 500 });
  }
}

// DELETE /api/admin/events/[id] — mark event as CANCELLED (soft delete)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "חסר מזהה אירוע" }, { status: 400 });

    const updated = await prisma.event.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Admin event delete error:", error);
    return NextResponse.json({ error: "שגיאה במחיקת אירוע" }, { status: 500 });
  }
}
