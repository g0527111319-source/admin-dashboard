import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/designer/crm/onboarding/templates — רשימת תבניות כניסה
export async function GET(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const templates = await prisma.crmOnboardingTemplate.findMany({
      where: { designerId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("CRM onboarding templates fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת תבניות כניסה" }, { status: 500 });
  }
}

// POST /api/designer/crm/onboarding/templates — יצירת תבנית כניסה
export async function POST(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const body = await req.json();
    const { title, sortOrder, isDefault } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { error: "כותרת היא שדה חובה" },
        { status: 400 }
      );
    }

    const template = await prisma.crmOnboardingTemplate.create({
      data: {
        designerId,
        title: title.trim(),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("CRM onboarding template create error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת תבנית כניסה" }, { status: 500 });
  }
}
