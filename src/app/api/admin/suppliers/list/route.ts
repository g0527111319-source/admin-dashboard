export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/admin/suppliers/list — return all suppliers (id + name) for dropdowns
export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(suppliers);
  } catch (error) {
    console.error("Suppliers list GET error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת רשימת ספקים" },
      { status: 500 }
    );
  }
}
