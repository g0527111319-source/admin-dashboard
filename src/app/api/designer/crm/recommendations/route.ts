export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/designer/crm/recommendations — רשימת המלצות
export async function GET(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const recommendations = await prisma.crmClientRecommendation.findMany({
      where: { designerId },
      include: {
        client: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error("CRM recommendations fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת המלצות" }, { status: 500 });
  }
}

// POST /api/designer/crm/recommendations — שליחת בקשת המלצה
export async function POST(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const body = await req.json();
    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json({ error: "מזהה לקוח הוא שדה חובה" }, { status: 400 });
    }

    // Verify client belongs to designer
    const client = await prisma.crmClient.findFirst({
      where: { id: clientId, designerId, deletedAt: null },
    });
    if (!client) {
      return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });
    }

    const recommendation = await prisma.crmClientRecommendation.create({
      data: {
        designerId,
        clientId,
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(recommendation, { status: 201 });
  } catch (error) {
    console.error("CRM recommendation create error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת בקשת המלצה" }, { status: 500 });
  }
}
