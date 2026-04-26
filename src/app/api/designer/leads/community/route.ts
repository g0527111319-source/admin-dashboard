// GET /api/designer/leads/community — list anonymized community-feed leads.
//
// Returns only leads with status=POSTED_TO_COMMUNITY. Strips personal data
// (name/address/phone/email) because the lead hasn't been assigned yet —
// designers only see it to decide if they want to raise their hand.
//
// Also marks whether the current designer has already expressed interest.

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { anonymizeLeadForFeed } from "@/lib/leads";
import { requireRole, DESIGNER_ONLY } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireRole(req, DESIGNER_ONLY);
  if (!auth.ok) return auth.response;
  const designerId = auth.userId;

  const leads = await prisma.lead.findMany({
    where: { status: "POSTED_TO_COMMUNITY" },
    orderBy: { postedToCommunityAt: "desc" },
    take: 50,
    include: {
      interests: {
        where: { designerId },
        select: { id: true },
      },
      _count: { select: { interests: true } },
    },
  });

  const anonymized = leads.map((l) => ({
    ...anonymizeLeadForFeed(l),
    additionalNotes: l.additionalNotes, // can share — no PII
    myInterest: l.interests.length > 0,
    totalInterested: l._count.interests,
  }));

  return NextResponse.json({ leads: anonymized });
}
