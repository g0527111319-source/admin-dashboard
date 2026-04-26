export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth";

// GET /api/admin/waitlist — Fetch designers by approval status
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "PENDING";
    const search = searchParams.get("search") || "";

    const where: Record<string, unknown> = {};

    // Filter by approval status
    if (status !== "ALL") {
      where.approvalStatus = status;
    }

    // Search by name, email, or city
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
      ];
    }

    const designers = await prisma.designer.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        city: true,
        specialization: true,
        employmentType: true,
        yearsAsIndependent: true,
        approvalStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ designers });
  } catch (error) {
    console.error("Waitlist GET error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת רשימת המתנה" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/waitlist — Approve or reject a designer
export async function PATCH(req: NextRequest) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    const { designerId, action } = body as {
      designerId?: string;
      action?: "approve" | "reject";
    };

    if (!designerId || !action) {
      return NextResponse.json(
        { error: "חסרים פרטים: מזהה מעצבת ופעולה" },
        { status: 400 }
      );
    }

    const designer = await prisma.designer.findUnique({
      where: { id: designerId },
      select: { id: true, fullName: true, approvalStatus: true },
    });

    if (!designer) {
      return NextResponse.json(
        { error: "מעצבת לא נמצאה" },
        { status: 404 }
      );
    }

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

    const updated = await prisma.designer.update({
      where: { id: designerId },
      data: { approvalStatus: newStatus },
      select: {
        id: true,
        fullName: true,
        email: true,
        approvalStatus: true,
      },
    });

    return NextResponse.json({
      success: true,
      designer: updated,
      message:
        action === "approve"
          ? `${updated.fullName} אושרה בהצלחה`
          : `${updated.fullName} נדחתה`,
    });
  } catch (error) {
    console.error("Waitlist PATCH error:", error);
    return NextResponse.json(
      { error: "שגיאה בעדכון סטטוס" },
      { status: 500 }
    );
  }
}
