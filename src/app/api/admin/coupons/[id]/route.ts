import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// PATCH /api/admin/coupons/[id] — update mutable fields
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "חסר מזהה קופון" }, { status: 400 });
    }
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.isActive !== undefined) data.isActive = !!body.isActive;
    if (body.validUntil !== undefined) {
      data.validUntil = body.validUntil ? new Date(body.validUntil) : null;
    }
    if (body.maxRedemptions !== undefined) {
      data.maxRedemptions =
        body.maxRedemptions === null || body.maxRedemptions === ""
          ? null
          : Number(body.maxRedemptions);
    }
    if (body.description !== undefined) {
      data.description = body.description ? String(body.description).trim() : null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "אין שדות לעדכון" }, { status: 400 });
    }

    const updated = await prisma.coupon.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Coupon update error:", error);
    return NextResponse.json(
      { error: "שגיאה בעדכון קופון" },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/coupons/[id] — soft delete (isActive=false)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "חסר מזהה קופון" }, { status: 400 });
    }
    const updated = await prisma.coupon.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Coupon delete error:", error);
    return NextResponse.json(
      { error: "שגיאה במחיקת קופון" },
      { status: 500 },
    );
  }
}
