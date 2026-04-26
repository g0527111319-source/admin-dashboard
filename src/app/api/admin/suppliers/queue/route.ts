import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/admin/suppliers/queue — pending suppliers with recommenders for verification UI
export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { approvalStatus: "PENDING" },
      include: {
        recommenders: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(suppliers);
  } catch (error) {
    console.error("Suppliers queue GET error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת תור אימות" },
      { status: 500 },
    );
  }
}
