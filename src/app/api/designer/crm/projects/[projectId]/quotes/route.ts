export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/designer/crm/projects/[projectId]/quotes — רשימת הצעות מחיר
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { projectId } = await params;

    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    const quotes = await prisma.crmQuote.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(quotes);
  } catch (error) {
    console.error("CRM quotes fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת הצעות מחיר" }, { status: 500 });
  }
}

// POST /api/designer/crm/projects/[projectId]/quotes — יצירת הצעת מחיר
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { projectId } = await params;

    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    const body = await req.json();
    const { title, services, totalAmount, paymentTerms, validUntil } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "כותרת הצעת מחיר היא שדה חובה" }, { status: 400 });
    }

    if (!services) {
      return NextResponse.json({ error: "שירותים הם שדה חובה" }, { status: 400 });
    }

    if (totalAmount === undefined || totalAmount === null) {
      return NextResponse.json({ error: "סכום כולל הוא שדה חובה" }, { status: 400 });
    }

    const quote = await prisma.crmQuote.create({
      data: {
        projectId,
        designerId,
        title: title.trim(),
        services,
        totalAmount,
        ...(paymentTerms !== undefined && { paymentTerms: paymentTerms.trim() }),
        ...(validUntil !== undefined && { validUntil: new Date(validUntil) }),
      },
    });

    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    console.error("CRM quote create error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת הצעת מחיר" }, { status: 500 });
  }
}
