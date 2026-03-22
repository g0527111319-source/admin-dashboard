import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/client-portal/[token]/settings
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const portalToken = await prisma.clientPortalToken.findUnique({
      where: { token },
      include: { client: { include: { clientSettings: true } } },
    });

    if (!portalToken || !portalToken.isActive || portalToken.client.deletedAt) {
      return NextResponse.json({ error: "קישור לא תקין" }, { status: 404 });
    }

    const notifications = portalToken.client.clientSettings?.notifications || {};

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Client settings fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת הגדרות" }, { status: 500 });
  }
}

// PATCH /api/client-portal/[token]/settings
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const portalToken = await prisma.clientPortalToken.findUnique({
      where: { token },
      include: { client: true },
    });

    if (!portalToken || !portalToken.isActive || portalToken.client.deletedAt) {
      return NextResponse.json({ error: "קישור לא תקין" }, { status: 404 });
    }

    const body = await req.json();
    const { notifications } = body;

    if (notifications !== undefined) {
      await prisma.clientCrmSettings.upsert({
        where: { clientId: portalToken.clientId },
        create: {
          clientId: portalToken.clientId,
          designerId: portalToken.client.designerId,
          notifications,
        },
        update: {
          notifications,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Client settings update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון הגדרות" }, { status: 500 });
  }
}
