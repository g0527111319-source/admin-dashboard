import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// GET /api/designer/crm/templates
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

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
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

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
