export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/designer/crm/clients/[clientId]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { clientId } = await params;

    const client = await prisma.crmClient.findFirst({
      where: { id: clientId, designerId, deletedAt: null },
      include: {
        projects: {
          where: { deletedAt: null },
          include: {
            phases: { orderBy: { sortOrder: "asc" } },
            _count: { select: { messages: true, documents: true, photos: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error("CRM client get error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת לקוח" }, { status: 500 });
  }
}

// PATCH /api/designer/crm/clients/[clientId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { clientId } = await params;
    const body = await req.json();

    // Verify ownership
    const existing = await prisma.crmClient.findFirst({
      where: { id: clientId, designerId, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });
    }

    const { name, phone, email, address, notes } = body;

    const client = await prisma.crmClient.update({
      where: { id: clientId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(address !== undefined && { address: address?.trim() || null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
      },
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error("CRM client update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון לקוח" }, { status: 500 });
  }
}

// DELETE /api/designer/crm/clients/[clientId] — soft delete
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { clientId } = await params;

    const existing = await prisma.crmClient.findFirst({
      where: { id: clientId, designerId, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });
    }

    await prisma.crmClient.update({
      where: { id: clientId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CRM client delete error:", error);
    return NextResponse.json({ error: "שגיאה במחיקת לקוח" }, { status: 500 });
  }
}
