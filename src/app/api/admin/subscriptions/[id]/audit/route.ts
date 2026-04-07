/**
 * GET /api/admin/subscriptions/[id]/audit
 *
 * Return the audit trail (most recent first) for a single subscription.
 * Query: ?limit=50
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSubscriptionAuditTrail } from "@/lib/subscription-audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "חסר מזהה מנוי" }, { status: 400 });
    }

    const limitParam = new URL(req.url).searchParams.get("limit");
    const limit = limitParam ? Math.min(500, Math.max(1, parseInt(limitParam, 10) || 50)) : 50;

    const trail = await getSubscriptionAuditTrail(id, limit);

    return NextResponse.json({ subscriptionId: id, count: trail.length, trail });
  } catch (error) {
    console.error("[admin audit] error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת יומן הביקורת" },
      { status: 500 }
    );
  }
}
