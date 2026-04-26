import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// GET single subscription
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const sub = await prisma.designerSubscription.findUnique({
      where: { id },
      include: {
        plan: true,
        designer: true,
        payments: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!sub) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
    return NextResponse.json(sub);
  } catch (error) {
    console.error("Subscription get error:", error);
    return NextResponse.json({ error: "שגיאה בטעינה" }, { status: 500 });
  }
}

// PATCH — Update subscription (change plan, status, etc)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const body = await req.json();
    const allowed: Record<string, unknown> = {};
    const fields = [
      "planId",
      "status",
      "trialEndsAt",
      "currentPeriodStart",
      "currentPeriodEnd",
      "autoRenew",
      "cancelReason",
      "notes",
    ];
    for (const f of fields) if (f in body) allowed[f] = body[f];
    if (body.cancel === true) {
      allowed.status = "cancelled";
      allowed.cancelledAt = new Date();
      allowed.autoRenew = false;
    }
    const updated = await prisma.designerSubscription.update({
      where: { id },
      data: allowed,
      include: { plan: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Subscription update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון" }, { status: 500 });
  }
}

// DELETE — Cancel subscription (soft)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const updated = await prisma.designerSubscription.update({
      where: { id },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
        autoRenew: false,
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Subscription cancel error:", error);
    return NextResponse.json({ error: "שגיאה בביטול" }, { status: 500 });
  }
}
