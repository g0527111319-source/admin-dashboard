export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

// GET /api/designer/crm/activity-log — רשימת לוג פעילות
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const clientId = searchParams.get("clientId");
    const action = searchParams.get("action");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const logs = await prisma.crmActivityLog.findMany({
      where: {
        designerId,
        ...(projectId ? { projectId } : {}),
        ...(clientId ? { clientId } : {}),
        ...(action ? { action } : {}),
      },
      include: {
        project: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("CRM activity log fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת לוג פעילות" }, { status: 500 });
  }
}

// POST /api/designer/crm/activity-log — יצירת רשומת לוג ידנית
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const body = await req.json();
    const { action, projectId, clientId, entityType, entityId, metadata } = body;

    if (!action?.trim()) {
      return NextResponse.json({ error: "פעולה היא שדה חובה" }, { status: 400 });
    }

    const log = await prisma.crmActivityLog.create({
      data: {
        designerId,
        action: action.trim(),
        ...(projectId ? { projectId } : {}),
        ...(clientId ? { clientId } : {}),
        ...(entityType ? { entityType } : {}),
        ...(entityId ? { entityId } : {}),
        ...(metadata !== undefined ? { metadata } : {}),
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error("CRM activity log create error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת רשומת לוג" }, { status: 500 });
  }
}
