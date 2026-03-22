import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/designer/crm/workflows
export async function GET(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

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
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

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
