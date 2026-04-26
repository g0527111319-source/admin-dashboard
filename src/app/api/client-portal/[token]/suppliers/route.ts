// GET /api/client-portal/[token]/suppliers
// Public endpoint (token-authed) — the client sees only the supplier rows the
// designer chose to expose (showToClient=true). Personal contact fields like
// the designer's private notes are NOT returned.

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    const portalToken = await prisma.clientPortalToken.findUnique({
      where: { token },
      include: { client: { select: { id: true, deletedAt: true } } },
    });

    if (!portalToken || !portalToken.isActive) {
      return NextResponse.json({ error: "קישור לא תקין או לא פעיל" }, { status: 404 });
    }
    if (portalToken.client.deletedAt) {
      return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });
    }

    const suppliers = await prisma.crmClientSupplier.findMany({
      where: {
        clientId: portalToken.clientId,
        deletedAt: null,
        showToClient: true,
      },
      orderBy: { createdAt: "desc" },
      // Explicit select — keep designer-only fields (notes) out of the
      // client-facing payload.
      select: {
        id: true,
        name: true,
        category: true,
        contactName: true,
        phone: true,
        email: true,
        website: true,
        logo: true,
        communitySupplierId: true,
        crmSupplierId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ suppliers });
  } catch (error) {
    console.error("Client-portal suppliers fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת ספקים" }, { status: 500 });
  }
}
