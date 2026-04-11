export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/designer/crm/quotes/templates
export async function GET(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const templates = await prisma.crmQuoteTemplate.findMany({
      where: { designerId },
      orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Quote templates fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת תבניות" }, { status: 500 });
  }
}

// POST /api/designer/crm/quotes/templates
export async function POST(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, contentBlocks, fields, isDefault, styling } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "שם התבנית חובה" }, { status: 400 });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.crmQuoteTemplate.updateMany({
        where: { designerId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const template = await prisma.crmQuoteTemplate.create({
      data: {
        designerId,
        name: name.trim(),
        description: description?.trim() || null,
        contentBlocks: contentBlocks || [],
        fields: fields || [],
        isDefault: isDefault || false,
        styling: styling || {},
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Quote template create error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת תבנית" }, { status: 500 });
  }
}
