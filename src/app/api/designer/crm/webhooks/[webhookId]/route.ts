export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

// PATCH /api/designer/crm/webhooks/[webhookId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ webhookId: string }> }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const { webhookId } = await params;
    const body = await req.json();

    const existing = await prisma.crmWebhookEndpoint.findFirst({
      where: { id: webhookId, designerId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Webhook לא נמצא" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.url !== undefined) updateData.url = body.url.trim();
    if (body.events !== undefined) updateData.events = body.events;
    if (body.secret !== undefined) updateData.secret = body.secret?.trim() || null;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const webhook = await prisma.crmWebhookEndpoint.update({
      where: { id: webhookId },
      data: updateData,
    });

    return NextResponse.json(webhook);
  } catch (error) {
    console.error("Webhook update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון" }, { status: 500 });
  }
}

// DELETE /api/designer/crm/webhooks/[webhookId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ webhookId: string }> }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const { webhookId } = await params;

    const existing = await prisma.crmWebhookEndpoint.findFirst({
      where: { id: webhookId, designerId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Webhook לא נמצא" }, { status: 404 });
    }

    await prisma.crmWebhookEndpoint.delete({ where: { id: webhookId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook delete error:", error);
    return NextResponse.json({ error: "שגיאה במחיקה" }, { status: 500 });
  }
}
