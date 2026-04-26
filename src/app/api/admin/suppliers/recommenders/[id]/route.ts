import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const FLAG_FIELDS = new Set([
  "trustVerified",
  "serviceVerified",
  "professionalismVerified",
  "responsibilityVerified",
]);

// PATCH /api/admin/suppliers/recommenders/[id]
// Body: { trustVerified?, serviceVerified?, professionalismVerified?, responsibilityVerified? }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "חסר מזהה ממליצה" }, { status: 400 });

    const body = await req.json();
    const data: Record<string, boolean> = {};
    for (const key of Object.keys(body)) {
      if (FLAG_FIELDS.has(key)) data[key] = !!body[key];
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "אין שדות לעדכון" }, { status: 400 });
    }

    const updated = await prisma.supplierRecommender.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Recommender update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון המלצה" }, { status: 500 });
  }
}
