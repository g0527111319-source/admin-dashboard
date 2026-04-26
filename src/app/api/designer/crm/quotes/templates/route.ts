export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

// GET /api/designer/crm/quotes/templates
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

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
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

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
