export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth";

// GET /api/admin/suppliers-waitlist — Fetch suppliers by approval status
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

    // Search by name, email, contact name, or city
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { contactName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
      ];
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      select: {
        id: true,
        name: true,
        contactName: true,
        email: true,
        phone: true,
        category: true,
        city: true,
        website: true,
        description: true,
        approvalStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ suppliers });
  } catch (error) {
    console.error("Suppliers waitlist GET error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת רשימת המתנה של ספקים" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/suppliers-waitlist — Approve or reject a supplier
export async function PATCH(req: NextRequest) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    const { supplierId, action } = body as {
      supplierId?: string;
      action?: "approve" | "reject";
    };

    if (!supplierId || !action) {
      return NextResponse.json(
        { error: "חסרים פרטים: מזהה ספק ופעולה" },
        { status: 400 }
      );
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true, name: true, approvalStatus: true },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: "ספק לא נמצא" },
        { status: 404 }
      );
    }

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

    const updated = await prisma.supplier.update({
      where: { id: supplierId },
      data: { approvalStatus: newStatus },
      select: {
        id: true,
        name: true,
        contactName: true,
        email: true,
        approvalStatus: true,
      },
    });

    return NextResponse.json({
      success: true,
      supplier: updated,
      message:
        action === "approve"
          ? `${updated.name} אושר בהצלחה`
          : `${updated.name} נדחה`,
    });
  } catch (error) {
    console.error("Suppliers waitlist PATCH error:", error);
    return NextResponse.json(
      { error: "שגיאה בעדכון סטטוס" },
      { status: 500 }
    );
  }
}
