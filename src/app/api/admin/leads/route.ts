// GET /api/admin/leads — list all leads with optional status filter
//
// Middleware blocks non-admins, but we double-check here as a defense-in-depth.
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (req.headers.get("x-user-role") !== "admin") {
    return NextResponse.json({ error: "לא מורשה" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const q = (searchParams.get("q") || "").trim();

  const where: Record<string, unknown> = {};
  if (status && ["NEW", "REVIEWING", "POSTED_TO_COMMUNITY", "DISTRIBUTED", "CONVERTED", "ARCHIVED"].includes(status)) {
    where.status = status;
  }
  if (q) {
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { email: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
    ];
  }

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      city: true,
      sizeSqm: true,
      renovationBudget: true,
      designerBudget: true,
      startTiming: true,
      status: true,
      createdAt: true,
      postedToCommunityAt: true,
      distributedAt: true,
      convertedAt: true,
      _count: {
        select: { interests: true, assignments: true },
      },
    },
  });

  // Compact counts by status for the filter bar
  const counts = await prisma.lead.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  return NextResponse.json({ leads, counts });
}
