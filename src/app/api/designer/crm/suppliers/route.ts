import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// GET /api/designer/crm/suppliers
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");

    const where: Record<string, unknown> = {
      designerId,
      deletedAt: null,
    };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { contactName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const suppliers = await prisma.crmSupplier.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(suppliers);
  } catch (error) {
    console.error("CRM suppliers fetch error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת ספקים" },
      { status: 500 }
    );
  }
}

// POST /api/designer/crm/suppliers
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const body = await req.json();
    const { name, category, contactName, phone, email, website, notes } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "שם ספק הוא שדה חובה" },
        { status: 400 }
      );
    }

    if (!category?.trim()) {
      return NextResponse.json(
        { error: "קטגוריה היא שדה חובה" },
        { status: 400 }
      );
    }

    const supplier = await prisma.crmSupplier.create({
      data: {
        designerId,
        name: name.trim(),
        category: category.trim(),
        contactName: contactName?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        website: website?.trim() || null,
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    console.error("CRM supplier create error:", error);
    return NextResponse.json(
      { error: "שגיאה ביצירת ספק" },
      { status: 500 }
    );
  }
}
