// GET /api/designer/leads/assignments — list leads assigned to this designer.
//
// Returns the FULL lead (including PII) since the admin officially assigned
// it. Designer sees: new, dismissed (optionally hidden), and converted.

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const role = req.headers.get("x-user-role");
  const designerId = req.headers.get("x-user-id");
  if (role !== "designer" || !designerId) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 403 });
  }

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
