// POST — publish the lead to the community feed.
//
// Moves status to POSTED_TO_COMMUNITY so it surfaces on the designer
// dashboard's "לידים חדשים בקהילה" component. Designers then raise hand
// via /api/designer/leads/community/[leadId]/interest and admin picks 3.

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  if (req.headers.get("x-user-role") !== "admin") {
    return NextResponse.json({ error: "לא מורשה" }, { status: 403 });
  }
  const { leadId } = await params;
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  if (lead.status === "CONVERTED" || lead.status === "ARCHIVED") {
    return NextResponse.json({ error: "הליד סגור — לא ניתן לפרסם" }, { status: 400 });
  }

  const updated = await prisma.lead.update({
    where: { id: leadId },
    data: {
      status: "POSTED_TO_COMMUNITY",
      postedToCommunityAt: new Date(),
    },
  });
  return NextResponse.json({ lead: updated });
}
