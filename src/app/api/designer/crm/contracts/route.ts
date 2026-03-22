import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/designer/crm/contracts — list all contracts
export async function GET(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = { designerId };
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;

    const contracts = await prisma.crmContract.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            client: { select: { id: true, name: true, email: true, phone: true, address: true } },
          },
        },
        template: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(contracts);
  } catch (error) {
    console.error("Contracts fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת חוזים" }, { status: 500 });
  }
}

// POST /api/designer/crm/contracts — create contract
export async function POST(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, templateId, title, totalAmount, pdfUrl, notesInternal, clientName, clientEmail, clientPhone, designerFieldValues, clientFieldValues } = body;

    if (!projectId || !title?.trim()) {
      return NextResponse.json({ error: "פרויקט וכותרת הם שדות חובה" }, { status: 400 });
    }

    // Verify project ownership and get client data
    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
      include: { client: { select: { id: true, name: true, email: true, phone: true, address: true } } },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    // Auto-populate client details from saved client if not provided
    const resolvedClientName = clientName?.trim() || project.client?.name || null;
    const resolvedClientEmail = clientEmail?.trim() || project.client?.email || null;
    const resolvedClientPhone = clientPhone?.trim() || project.client?.phone || null;

    // Auto contract number
    const contractCount = await prisma.crmContract.count({ where: { designerId } });
    const contractNumber = `CTR-${String(contractCount + 1).padStart(4, "0")}`;

    const contract = await prisma.crmContract.create({
      data: {
        projectId,
        designerId,
        templateId: templateId || null,
        title: title.trim(),
        totalAmount: totalAmount || 0,
        contractNumber,
        pdfUrl: pdfUrl?.trim() || null,
        notesInternal: notesInternal?.trim() || null,
        clientName: resolvedClientName,
        clientEmail: resolvedClientEmail,
        clientPhone: resolvedClientPhone,
        designerFieldValues: designerFieldValues || {},
        clientFieldValues: clientFieldValues || {},
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            client: { select: { id: true, name: true, email: true, phone: true, address: true } },
          },
        },
        template: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(contract, { status: 201 });
  } catch (error) {
    console.error("Contract create error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת חוזה" }, { status: 500 });
  }
}
