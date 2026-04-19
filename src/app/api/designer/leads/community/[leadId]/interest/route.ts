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

  // Commission disclosure: the client sends { commissionAgreed: true, commissionPercent: 8 }
  // after the designer actively accepts the modal. We require the flag to be
  // present and true — anyone replaying a bare POST from a stale client gets
  // rejected so we never record an un-confirmed agreement.
  const body = (await req.json().catch(() => ({}))) as {
    commissionAgreed?: boolean;
    commissionPercent?: number;
  };
  if (body.commissionAgreed !== true) {
    return NextResponse.json(
      { error: "יש לאשר את תנאי עמלת הקהילה כדי להביע עניין בליד" },
      { status: 400 },
    );
  }

  await prisma.leadInterest.upsert({
    where: { leadId_designerId: { leadId, designerId } },
    create: { leadId, designerId },
    update: {},
  });

  // Server-side audit trail — shows up in Vercel logs with designer + lead +
  // timestamp so we can reconcile disputes. Schema-level persistence can be
  // added later via a nullable `commissionAgreedAt` column on LeadInterest.
  console.log(
    JSON.stringify({
      event: "lead.community.interest.commission_agreed",
      leadId,
      designerId,
      commissionPercent: body.commissionPercent ?? 8,
      at: new Date().toISOString(),
    }),
  );

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
