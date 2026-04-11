import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/designer/crm/clients — רשימת לקוחות של המעצבת
export async function GET(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    // Verify the user is actually a designer in the database
    const designer = await prisma.designer.findUnique({
      where: { id: designerId },
      select: { id: true },
    });
    if (!designer) {
      return NextResponse.json({ error: "אין הרשאה — משתמש אינו מעצב/ת" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    const where: Record<string, unknown> = {
      designerId,
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    // Only apply pagination when params are explicitly provided
    const usePagination = pageParam !== null || limitParam !== null;
    const page = parseInt(pageParam || "1");
    const limit = parseInt(limitParam || "50");
    const skip = (page - 1) * limit;

    const clients = await prisma.crmClient.findMany({
      where,
      include: {
        projects: {
          where: { deletedAt: null },
          select: { id: true, name: true, status: true },
        },
        _count: {
          select: {
            projects: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      ...(usePagination ? { take: limit, skip } : {}),
    });

    if (usePagination) {
      const total = await prisma.crmClient.count({ where });
      return NextResponse.json({
        data: clients,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }

    return NextResponse.json(clients);
  } catch (error) {
    console.error("CRM clients fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת לקוחות" }, { status: 500 });
  }
}

// POST /api/designer/crm/clients — יצירת לקוח חדש
export async function POST(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    // Verify the user is actually a designer in the database
    const designer = await prisma.designer.findUnique({
      where: { id: designerId },
      select: { id: true },
    });
    if (!designer) {
      return NextResponse.json({ error: "אין הרשאה — משתמש אינו מעצב/ת" }, { status: 403 });
    }

    const body = await req.json();
    const {
      firstName, lastName, phone, email,
      partner1FirstName, partner1LastName, partner1Phone, partner1Email,
      street, floor, apartment, neighborhood, city,
      renovationSameAddress, renovationStreet, renovationFloor,
      renovationApartment, renovationNeighborhood, renovationCity,
      renovationDetails, renovationPurpose, estimatedBudget,
      accessInstructions, notes,
      name: legacyName,
    } = body;

    // Auto-compute name from firstName + lastName for backwards compatibility
    let computedName = legacyName?.trim() || "";
    if (firstName?.trim()) {
      computedName = `${firstName.trim()} ${(lastName || "").trim()}`.trim();
      if (partner1FirstName?.trim()) {
        const partnerName = `${partner1FirstName.trim()} ${(partner1LastName || "").trim()}`.trim();
        computedName = `${computedName} ו${partnerName}`;
      }
    }

    if (!computedName) {
      return NextResponse.json({ error: "שם לקוח הוא שדה חובה" }, { status: 400 });
    }

    // Build legacy address from structured fields
    const addressParts = [street, city].filter(Boolean);
    const legacyAddress = addressParts.length > 0 ? addressParts.join(", ") : null;

    const client = await prisma.crmClient.create({
      data: {
        designerId,
        name: computedName,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: legacyAddress,
        notes: notes?.trim() || null,
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
        partner1FirstName: partner1FirstName?.trim() || null,
        partner1LastName: partner1LastName?.trim() || null,
        partner1Phone: partner1Phone?.trim() || null,
        partner1Email: partner1Email?.trim() || null,
        street: street?.trim() || null,
        floor: floor?.trim() || null,
        apartment: apartment?.trim() || null,
        neighborhood: neighborhood?.trim() || null,
        city: city?.trim() || null,
        renovationSameAddress: renovationSameAddress === true,
        renovationStreet: renovationStreet?.trim() || null,
        renovationFloor: renovationFloor?.trim() || null,
        renovationApartment: renovationApartment?.trim() || null,
        renovationNeighborhood: renovationNeighborhood?.trim() || null,
        renovationCity: renovationCity?.trim() || null,
        renovationDetails: renovationDetails?.trim() || null,
        renovationPurpose: renovationPurpose?.trim() || null,
        estimatedBudget: estimatedBudget?.toString()?.trim() || null,
        accessInstructions: accessInstructions?.trim() || null,
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("CRM client create error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת לקוח" }, { status: 500 });
  }
}
