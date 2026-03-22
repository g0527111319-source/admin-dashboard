import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/designer/crm/onboarding/[clientId] — רשימת פריטי כניסה של לקוח
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { clientId } = await params;

    // Verify designer owns client
    const client = await prisma.crmClient.findFirst({
      where: { id: clientId, designerId, deletedAt: null },
    });
    if (!client) {
      return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });
    }

    const items = await prisma.crmOnboardingItem.findMany({
      where: { clientId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("CRM onboarding items fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת פריטי כניסה" }, { status: 500 });
  }
}

// POST /api/designer/crm/onboarding/[clientId] — יצירת פריט כניסה או יצירה מתבניות ברירת מחדל
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { clientId } = await params;
    const body = await req.json();

    // Verify designer owns client
    const client = await prisma.crmClient.findFirst({
      where: { id: clientId, designerId, deletedAt: null },
    });
    if (!client) {
      return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });
    }

    // Create from default templates
    if (body.fromDefaults) {
      const templates = await prisma.crmOnboardingTemplate.findMany({
        where: { designerId, isDefault: true },
        orderBy: { sortOrder: "asc" },
      });

      const items = await prisma.crmOnboardingItem.createMany({
        data: templates.map((t) => ({
          clientId,
          title: t.title,
          sortOrder: t.sortOrder,
        })),
      });

      const createdItems = await prisma.crmOnboardingItem.findMany({
        where: { clientId },
        orderBy: { sortOrder: "asc" },
      });

      return NextResponse.json(createdItems, { status: 201 });
    }

    // Create single item
    const { title, sortOrder, projectId } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { error: "כותרת היא שדה חובה" },
        { status: 400 }
      );
    }

    const item = await prisma.crmOnboardingItem.create({
      data: {
        clientId,
        title: title.trim(),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(projectId && { projectId }),
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("CRM onboarding item create error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת פריט כניסה" }, { status: 500 });
  }
}
