import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/admin/coupons — list all coupons with redemption counts
export async function GET() {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { redemptions: true },
        },
      },
    });
    return NextResponse.json(coupons);
  } catch (error) {
    console.error("Coupons fetch error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת קופונים" },
      { status: 500 },
    );
  }
}

// POST /api/admin/coupons — create a new coupon
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      code,
      description,
      discountType,
      discountValue,
      durationMonths,
      maxRedemptions,
      validFrom,
      validUntil,
      applicablePlanIds,
    } = body || {};

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "חסר קוד קופון" },
        { status: 400 },
      );
    }
    if (!discountType || !["percent", "fixed", "free_months"].includes(discountType)) {
      return NextResponse.json(
        { error: "סוג הנחה לא תקין" },
        { status: 400 },
      );
    }
    if (discountValue === undefined || discountValue === null || isNaN(Number(discountValue))) {
      return NextResponse.json(
        { error: "ערך הנחה לא תקין" },
        { status: 400 },
      );
    }
    if (Number(discountValue) <= 0) {
      return NextResponse.json(
        { error: "ערך הנחה חייב להיות גדול מאפס" },
        { status: 400 },
      );
    }
    if (discountType === "percent" && Number(discountValue) > 100) {
      return NextResponse.json(
        { error: "הנחה באחוזים לא יכולה לעלות על 100%" },
        { status: 400 },
      );
    }

    const normalizedCode = String(code).trim().toUpperCase();

    const existing = await prisma.coupon.findUnique({
      where: { code: normalizedCode },
    });
    if (existing) {
      return NextResponse.json(
        { error: "קוד קופון זה כבר קיים" },
        { status: 400 },
      );
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: normalizedCode,
        description: description ? String(description).trim() : null,
        discountType,
        discountValue: Number(discountValue),
        durationMonths: Number(durationMonths) || 1,
        maxRedemptions:
          maxRedemptions !== undefined && maxRedemptions !== null && maxRedemptions !== ""
            ? Number(maxRedemptions)
            : null,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : null,
        applicablePlanIds: Array.isArray(applicablePlanIds) ? applicablePlanIds : [],
        isActive: true,
      },
    });

    return NextResponse.json(coupon);
  } catch (error) {
    console.error("Coupon create error:", error);
    return NextResponse.json(
      { error: "שגיאה ביצירת קופון" },
      { status: 500 },
    );
  }
}
