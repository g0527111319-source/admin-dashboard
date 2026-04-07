import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST — Grant trial period to subscription
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const days = Number(body.days ?? 14);
    if (!days || days < 1) {
      return NextResponse.json({ error: "מספר ימים לא תקין" }, { status: 400 });
    }
    const existing = await prisma.designerSubscription.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

    const base = existing.trialEndsAt && existing.trialEndsAt > new Date()
      ? new Date(existing.trialEndsAt)
      : new Date();
    base.setDate(base.getDate() + days);

    const updated = await prisma.designerSubscription.update({
      where: { id },
      data: {
        trialEndsAt: base,
        status: "trial",
      },
      include: { plan: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Grant trial error:", error);
    return NextResponse.json({ error: "שגיאה בהענקת ניסיון" }, { status: 500 });
  }
}
