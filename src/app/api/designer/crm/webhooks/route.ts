import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/designer/crm/webhooks
export async function GET(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const webhooks = await prisma.crmWebhookEndpoint.findMany({
      where: { designerId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(webhooks);
  } catch (error) {
    console.error("Webhooks fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינה" }, { status: 500 });
  }
}

// POST /api/designer/crm/webhooks
export async function POST(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const body = await req.json();
    const { name, url, events, secret } = body;

    if (!name?.trim() || !url?.trim()) {
      return NextResponse.json({ error: "שם וכתובת URL הם שדות חובה" }, { status: 400 });
    }

    const webhook = await prisma.crmWebhookEndpoint.create({
      data: {
        designerId,
        name: name.trim(),
        url: url.trim(),
        events: events || [],
        secret: secret?.trim() || null,
      },
    });

    return NextResponse.json(webhook, { status: 201 });
  } catch (error) {
    console.error("Webhook create error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת webhook" }, { status: 500 });
  }
}
