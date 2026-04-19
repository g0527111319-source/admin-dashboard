// PATCH — mark assignment viewed / dismissed.
//
// Body:
//   { viewed: true }    → sets viewedAt (idempotent)
//   { dismiss: true }   → sets dismissedAt — hides from default list
//   { undismiss: true } → clears dismissedAt

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ assignmentId: string }> }) {
  const role = req.headers.get("x-user-role");
  const designerId = req.headers.get("x-user-id");
  if (role !== "designer" || !designerId) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 403 });
  }
  const { assignmentId } = await params;
  const existing = await prisma.leadAssignment.findUnique({ where: { id: assignmentId } });
  if (!existing || existing.designerId !== designerId) {
    return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({})) as {
    viewed?: boolean; dismiss?: boolean; undismiss?: boolean;
  };
  const data: Record<string, unknown> = {};
  if (body.viewed && !existing.viewedAt) data.viewedAt = new Date();
  if (body.dismiss) data.dismissedAt = new Date();
  if (body.undismiss) data.dismissedAt = null;
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "אין שינוי" }, { status: 400 });

  const updated = await prisma.leadAssignment.update({ where: { id: assignmentId }, data });
  return NextResponse.json({ assignment: updated });
}
