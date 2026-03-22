import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/designer/crm/schedule
export async function GET(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    const where: Record<string, unknown> = {
      designerId,
    };

    if (projectId) {
      where.projectId = projectId;
    }

    const blocks = await prisma.crmScheduleBlock.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { startDate: "asc" }],
    });

    return NextResponse.json(blocks);
  } catch (error) {
    console.error("CRM schedule fetch error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת לוח הזמנים" },
      { status: 500 }
    );
  }
}

// POST /api/designer/crm/schedule
export async function POST(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const body = await req.json();
    const {
      projectId,
      title,
      startDate,
      endDate,
      durationDays,
      color,
      dependsOn,
      supplierName,
      supplierPhone,
      status,
      sortOrder,
    } = body;

    if (!projectId?.trim()) {
      return NextResponse.json(
        { error: "מזהה פרויקט הוא שדה חובה" },
        { status: 400 }
      );
    }

    if (!title?.trim()) {
      return NextResponse.json(
        { error: "כותרת היא שדה חובה" },
        { status: 400 }
      );
    }

    const block = await prisma.crmScheduleBlock.create({
      data: {
        designerId,
        projectId: projectId.trim(),
        title: title.trim(),
        ...(startDate !== undefined && {
          startDate: startDate ? new Date(startDate) : null,
        }),
        ...(endDate !== undefined && {
          endDate: endDate ? new Date(endDate) : null,
        }),
        ...(durationDays !== undefined && { durationDays }),
        ...(color !== undefined && { color }),
        ...(dependsOn !== undefined && { dependsOn }),
        ...(supplierName !== undefined && {
          supplierName: supplierName?.trim() || null,
        }),
        ...(supplierPhone !== undefined && {
          supplierPhone: supplierPhone?.trim() || null,
        }),
        ...(status !== undefined && { status }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return NextResponse.json(block, { status: 201 });
  } catch (error) {
    console.error("CRM schedule block create error:", error);
    return NextResponse.json(
      { error: "שגיאה ביצירת בלוק בלוח הזמנים" },
      { status: 500 }
    );
  }
}
