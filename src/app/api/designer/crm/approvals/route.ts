import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// GET /api/designer/crm/approvals — רשימת בקשות אישור של המעצבת
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {
      designerId,
    };

    if (projectId) {
      where.projectId = projectId;
    }

    if (status) {
      where.status = status;
    }

    const approvals = await prisma.crmApprovalRequest.findMany({
      where,
      include: {
        options: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(approvals);
  } catch (error) {
    console.error("CRM approvals fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת בקשות אישור" }, { status: 500 });
  }
}

// POST /api/designer/crm/approvals — יצירת בקשת אישור חדשה
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const body = await req.json();
    const { projectId, clientId, type, title, description, options } = body;

    if (!projectId || !clientId || !title?.trim()) {
      return NextResponse.json(
        { error: "פרויקט, לקוח וכותרת הם שדות חובה" },
        { status: 400 }
      );
    }

    // Verify project ownership
    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    const approvalType = type === "SELECTION" ? "SELECTION" : "SINGLE";

    let optionsData: { label: string; description?: string; imageUrl?: string; sortOrder: number }[] = [];

    if (approvalType === "SINGLE") {
      optionsData = [{ label: title.trim(), sortOrder: 0 }];
    } else {
      if (!options || !Array.isArray(options) || options.length === 0) {
        return NextResponse.json(
          { error: "יש לספק אפשרויות לבחירה" },
          { status: 400 }
        );
      }
      optionsData = options.map(
        (opt: { label: string; description?: string; imageUrl?: string }, index: number) => ({
          label: opt.label,
          description: opt.description || undefined,
          imageUrl: opt.imageUrl || undefined,
          sortOrder: index,
        })
      );
    }

    const approval = await prisma.crmApprovalRequest.create({
      data: {
        designerId,
        projectId,
        clientId,
        type: approvalType,
        title: title.trim(),
        description: description?.trim() || null,
        options: {
          create: optionsData,
        },
      },
      include: {
        options: { orderBy: { sortOrder: "asc" } },
      },
    });

    // Create activity log
    await prisma.crmActivityLog.create({
      data: {
        designerId,
        projectId,
        clientId,
        action: "approval_sent",
        entityType: "approval",
        entityId: approval.id,
        actorType: "designer",
      },
    });

    return NextResponse.json(approval, { status: 201 });
  } catch (error) {
    console.error("CRM approval create error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת בקשת אישור" }, { status: 500 });
  }
}
