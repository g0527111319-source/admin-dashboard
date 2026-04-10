import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/designer/crm/projects — רשימת פרויקטים
export async function GET(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const clientId = searchParams.get("clientId");
    const search = searchParams.get("search");
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    const where: Record<string, unknown> = {
      designerId,
      deletedAt: null,
    };

    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { client: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    // Only apply pagination when params are explicitly provided
    const usePagination = pageParam !== null || limitParam !== null;
    const page = parseInt(pageParam || "1");
    const limit = parseInt(limitParam || "50");
    const skip = (page - 1) * limit;

    const projects = await prisma.crmProject.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, phone: true, email: true, address: true } },
        phases: { orderBy: { sortOrder: "asc" } },
        _count: {
          select: { messages: true, documents: true, photos: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      ...(usePagination ? { take: limit, skip } : {}),
    });

    if (usePagination) {
      const total = await prisma.crmProject.count({ where });
      return NextResponse.json({
        data: projects,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }

    return NextResponse.json(projects);
  } catch (error) {
    console.error("CRM projects fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת פרויקטים" }, { status: 500 });
  }
}

// POST /api/designer/crm/projects — יצירת פרויקט
export async function POST(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const body = await req.json();
    const { clientId, name, projectType, estimatedBudget, address, notes, startDate } = body;

    if (!clientId || !name?.trim()) {
      return NextResponse.json({ error: "שם פרויקט ולקוח הם שדות חובה" }, { status: 400 });
    }

    // Verify client ownership
    const client = await prisma.crmClient.findFirst({
      where: { id: clientId, designerId, deletedAt: null },
    });
    if (!client) {
      return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });
    }

    // Get default phases from designer settings
    let defaultPhases: string[] = ["ייעוץ ראשוני", "תכנון ועיצוב", "בחירת חומרים", "ביצוע", "פיקוח", "מסירה"];
    const settings = await prisma.designerCrmSettings.findUnique({
      where: { designerId },
    });
    if (settings?.defaultPhases) {
      try {
        const parsed = typeof settings.defaultPhases === "string"
          ? JSON.parse(settings.defaultPhases)
          : settings.defaultPhases;
        if (Array.isArray(parsed) && parsed.length > 0) {
          defaultPhases = parsed;
        }
      } catch {
        // use defaults
      }
    }

    const project = await prisma.crmProject.create({
      data: {
        designerId,
        clientId,
        name: name.trim(),
        projectType: projectType || "RENOVATION",
        estimatedBudget: estimatedBudget ? Number(estimatedBudget) : null,
        address: address?.trim() || null,
        notes: notes?.trim() || null,
        startDate: startDate ? new Date(startDate) : new Date(),
        phases: {
          create: defaultPhases.map((phaseName, index) => ({
            name: phaseName,
            sortOrder: index,
            isCurrent: index === 0,
          })),
        },
      },
      include: {
        client: { select: { id: true, name: true } },
        phases: { orderBy: { sortOrder: "asc" } },
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("CRM project create error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת פרויקט" }, { status: 500 });
  }
}
