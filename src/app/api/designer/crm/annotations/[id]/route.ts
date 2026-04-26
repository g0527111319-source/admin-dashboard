export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ttlForStatus } from "@/lib/annotation-ttl";
import type { AnnotationStatus } from "@/generated/prisma/client";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

// ==========================================
// Designer-side single annotation operations
// PATCH  /api/designer/crm/annotations/[id]  → change status (resolve / pin)
// DELETE /api/designer/crm/annotations/[id]  → hard delete
// ==========================================

const VALID_STATUSES: AnnotationStatus[] = ["OPEN", "ANSWERED", "RESOLVED", "PINNED"];

async function loadOwned(designerId: string, annotationId: string) {
  return prisma.annotation.findFirst({
    where: {
      id: annotationId,
      model: { project: { designerId } },
    },
    include: {
      model: { select: { expiresAt: true } },
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  const designerId = auth.userId;

  try {
    const body = await req.json();
    const nextStatus = body.status as AnnotationStatus | undefined;

    if (!nextStatus || !VALID_STATUSES.includes(nextStatus)) {
      return NextResponse.json(
        { error: "סטטוס לא תקין" },
        { status: 400 }
      );
    }

    const existing = await loadOwned(designerId, params.id);
    if (!existing) {
      return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
    }

    const updated = await prisma.annotation.update({
      where: { id: params.id },
      data: {
        status: nextStatus,
        expiresAt: ttlForStatus(nextStatus, existing.model.expiresAt),
      },
    });

    return NextResponse.json({ annotation: updated });
  } catch (error) {
    console.error("[designer annotation PATCH] error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  const designerId = auth.userId;

  try {
    const existing = await loadOwned(designerId, params.id);
    if (!existing) {
      return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
    }

    await prisma.annotation.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[designer annotation DELETE] error:", error);
    return NextResponse.json({ error: "שגיאה במחיקה" }, { status: 500 });
  }
}
