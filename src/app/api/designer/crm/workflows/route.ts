import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// GET /api/designer/crm/workflows
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const templates = await prisma.crmWorkflowTemplate.findMany({
      where: { designerId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("CRM workflow templates fetch error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת תבניות תהליך עבודה" },
      { status: 500 }
    );
  }
}

// POST /api/designer/crm/workflows
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const body = await req.json();
    const {
      name,
      description,
      projectType,
      isDefault,
      phases,
      defaultTasks,
      autoMessages,
      budgetCategories,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "שם תבנית הוא שדה חובה" },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults first
    if (isDefault) {
      await prisma.crmWorkflowTemplate.updateMany({
        where: { designerId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const template = await prisma.crmWorkflowTemplate.create({
      data: {
        designerId,
        name: name.trim(),
        description: description?.trim() || null,
        projectType: projectType || "RENOVATION",
        isDefault: isDefault || false,
        phases: phases ? JSON.parse(JSON.stringify(phases)) : [],
        defaultTasks: defaultTasks ? JSON.parse(JSON.stringify(defaultTasks)) : [],
        autoMessages: autoMessages ? JSON.parse(JSON.stringify(autoMessages)) : [],
        budgetCategories: budgetCategories ? JSON.parse(JSON.stringify(budgetCategories)) : [],
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("CRM workflow template create error:", error);
    return NextResponse.json(
      { error: "שגיאה ביצירת תבנית תהליך עבודה" },
      { status: 500 }
    );
  }
}
