// GET /api/public/designer/[designerId]/recommendations
// Returns published (isPublic=true) CrmClientRecommendation rows for that designer.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { designerId: string } }
) {
  try {
    const rows = await prisma.crmClientRecommendation.findMany({
      where: {
        designerId: params.designerId,
        isPublic: true,
        rating: { gte: 4 },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        rating: true,
        text: true,
        createdAt: true,
        client: { select: { name: true } },
      },
    });

    const recommendations = rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      text: r.text,
      clientName: r.client?.name ?? null,
      createdAt: r.createdAt,
    }));

    return NextResponse.json(recommendations);
  } catch (error) {
    console.error("Public recommendations error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת המלצות" },
      { status: 500 }
    );
  }
}
