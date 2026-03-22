import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/designer/crm/templates
export async function GET(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const templates = await prisma.crmMessageTemplate.findMany({
      where: { designerId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("CRM templates fetch error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת תבניות" },
      { status: 500 }
    );
  }
}

// POST /api/designer/crm/templates
export async function POST(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const body = await req.json();
    const { name, content, category, variables } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "שם תבנית הוא שדה חובה" },
        { status: 400 }
      );
    }

    if (!content?.trim()) {
      return NextResponse.json(
        { error: "תוכן תבנית הוא שדה חובה" },
        { status: 400 }
      );
    }

    const template = await prisma.crmMessageTemplate.create({
      data: {
        designerId,
        name: name.trim(),
        content: content.trim(),
        category: category?.trim() || null,
        variables: variables || [],
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("CRM template create error:", error);
    return NextResponse.json(
      { error: "שגיאה ביצירת תבנית" },
      { status: 500 }
    );
  }
}
