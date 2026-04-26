export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { canAccessFeature } from "@/lib/subscription-gate";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

// GET /api/designer/crm/projects/[projectId]/messages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    // Verify "messages" feature access
    const hasAccess = await canAccessFeature(designerId, "messages");
    if (!hasAccess) {
      return NextResponse.json({ error: "פיצ'ר זה זמין במנוי המקצועי" }, { status: 403 });
    }

    const { projectId } = await params;

    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    const messages = await prisma.crmProjectMessage.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("CRM messages fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת הודעות" }, { status: 500 });
  }
}

// POST /api/designer/crm/projects/[projectId]/messages
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    // Verify "messages" feature access
    const hasAccess = await canAccessFeature(designerId, "messages");
    if (!hasAccess) {
      return NextResponse.json({ error: "פיצ'ר זה זמין במנוי המקצועי" }, { status: 403 });
    }

    const { projectId } = await params;

    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    const body = await req.json();
    const { content } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "תוכן הודעה הוא שדה חובה" }, { status: 400 });
    }

    const message = await prisma.crmProjectMessage.create({
      data: {
        projectId,
        senderType: "designer",
        content: content.trim(),
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("CRM message create error:", error);
    return NextResponse.json({ error: "שגיאה בשליחת הודעה" }, { status: 500 });
  }
}
