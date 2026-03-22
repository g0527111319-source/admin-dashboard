import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

// POST /api/designer/crm/clients/[clientId]/portal-token
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { clientId } = await params;

    // Verify designer ownership
    const client = await prisma.crmClient.findFirst({
      where: { id: clientId, designerId, deletedAt: null },
    });
    if (!client) {
      return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });
    }

    // Deactivate any existing tokens for this client
    await prisma.clientPortalToken.updateMany({
      where: { clientId, isActive: true },
      data: { isActive: false },
    });

    // Create new portal token
    const token = crypto.randomUUID();
    const portalToken = await prisma.clientPortalToken.create({
      data: {
        clientId,
        token,
        isActive: true,
      },
    });

    return NextResponse.json({
      token: portalToken.token,
      url: `/client-portal/${portalToken.token}`,
    }, { status: 201 });
  } catch (error) {
    console.error("Portal token create error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת טוקן פורטל" }, { status: 500 });
  }
}
