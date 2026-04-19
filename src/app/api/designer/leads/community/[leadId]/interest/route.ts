// POST — designer expresses interest in a community-feed lead.
// DELETE — designer removes her interest.
//
// Open to all designers (including free tier). The selection of 3 is done
// later by the admin based on the interest list.

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  const role = req.headers.get("x-user-role");
  const designerId = req.headers.get("x-user-id");
  if (role !== "designer" || !designerId) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 403 });
  }
  const { leadId } = await params;
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { status: true } });
  if (!lead) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  if (lead.status !== "POSTED_TO_COMMUNITY") {
    return NextResponse.json({ error: "הליד כבר לא פתוח להבעת עניין" }, { status: 400 });
  }

  await prisma.leadInterest.upsert({
    where: { leadId_designerId: { leadId, designerId } },
    create: { leadId, designerId },
    update: {},
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  const role = req.headers.get("x-user-role");
  const designerId = req.headers.get("x-user-id");
  if (role !== "designer" || !designerId) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 403 });
  }
  const { leadId } = await params;
  await prisma.leadInterest.deleteMany({ where: { leadId, designerId } });
  return NextResponse.json({ ok: true });
}
