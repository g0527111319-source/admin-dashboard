import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// GET /api/designer/crm/clients — רשימת לקוחות של המעצבת
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

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

    let clients;
    try {
      clients = await prisma.crmClient.findMany({
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
    } catch {
      // Fallback: new columns may not exist — use select for core fields only
      clients = await prisma.crmClient.findMany({
        where,
        select: {
          id: true, designerId: true, name: true, phone: true, email: true,
          address: true, notes: true, createdAt: true, updatedAt: true, deletedAt: true,
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
    }

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

// POST /api/designer/crm/clients — יצירת לקוח חדש + פרויקט ראשון אוטומטי
//
// PRODUCT RULE: every client MUST have at least one project. The old flow
// allowed creating a naked client (zero projects) — this is no longer valid.
// We wrap the client+project insert in a single Prisma transaction so either
// both land in the DB or neither does; no partial state.
//
// PRIVACY: `designerId` is read from the authenticated `x-user-id` header and
// used for BOTH inserts. The client cannot pass a designerId of their own.
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

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
      // NEW: auto-project + language preference
      firstProjectName,
      language,
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

    // First project name: explicit value → fallback "פרויקט ראשון".
    const projectName = (firstProjectName?.trim() as string | undefined) || "פרויקט ראשון";

    // Normalize language to one of the two supported values.
    const normalizedLanguage =
      language === "en" || language === "he" ? language : "he";

    // Full-fat client payload with every structured field. We'll fall back to a
    // core-fields-only version if the DB hasn't been `db push`ed with the new
    // columns yet — same pattern this route already used before.
    const fullClientData = {
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
      language: normalizedLanguage,
    };

    const coreClientData = {
      designerId,
      name: computedName,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      address: legacyAddress,
      notes: notes?.trim() || null,
    };

    // Transactional create: client + first project. If either one fails the
    // whole thing rolls back — we never leave a client without a project.
    let client: { id: string } & Record<string, unknown>;
    try {
      const result = await prisma.$transaction(async (tx) => {
        const newClient = await tx.crmClient.create({ data: fullClientData });
        const newProject = await tx.crmProject.create({
          data: {
            clientId: newClient.id,
            designerId,
            name: projectName,
            status: "ACTIVE",
            // projectType has a schema default of RENOVATION — keep it.
          },
          select: { id: true, name: true, status: true },
        });
        return { ...newClient, projects: [newProject], _count: { projects: 1 } };
      });
      client = result as typeof client;
    } catch (createError) {
      // Fallback path: new columns (language, or whatever else) may not exist
      // in the DB yet. Retry with core-only fields — still transactional so the
      // "every client has a project" invariant holds.
      console.warn("CRM client+project create with full fields failed, falling back:", createError);
      const result = await prisma.$transaction(async (tx) => {
        const newClient = await tx.crmClient.create({ data: coreClientData });
        const newProject = await tx.crmProject.create({
          data: {
            clientId: newClient.id,
            designerId,
            name: projectName,
            status: "ACTIVE",
          },
          select: { id: true, name: true, status: true },
        });
        return { ...newClient, projects: [newProject], _count: { projects: 1 } };
      });
      client = result as typeof client;
    }

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("CRM client create error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת לקוח" }, { status: 500 });
  }
}
