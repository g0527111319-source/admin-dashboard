// GET /api/designer/leads/assignments — list leads assigned to this designer.
//
// Returns the FULL lead (including PII) since the admin officially assigned
// it. Designer sees: new, dismissed (optionally hidden), and converted.

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, DESIGNER_ONLY } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireRole(req, DESIGNER_ONLY);
  if (!auth.ok) return auth.response;
  const designerId = auth.userId;

  const { searchParams } = new URL(req.url);
  const includeDismissed = searchParams.get("includeDismissed") === "1";

  const assignments = await prisma.leadAssignment.findMany({
    where: {
      designerId,
      ...(includeDismissed ? {} : { dismissedAt: null }),
    },
    orderBy: { assignedAt: "desc" },
    include: { lead: true },
  });

  return NextResponse.json({ assignments });
}
