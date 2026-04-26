import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_SUPPLIER } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// GET /api/supplier/designers — list designers visible to the logged-in supplier.
// Returns ONLY: id, fullName, city, phone, email. No ratings, no specialization,
// no internal data. The community manager is the only party with access to
// quality/rating data about designers or suppliers.
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_SUPPLIER);
  if (!auth.ok) return auth.response;
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    const where: Record<string, unknown> = {};
    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }

    const designers = await prisma.designer.findMany({
      where,
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        city: true,
        phone: true,
        email: true,
      },
      take: 300,
    });

    return NextResponse.json({ designers });
  } catch (error) {
    console.error("Supplier designers list error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת רשימת מעצבות" }, { status: 500 });
  }
}
