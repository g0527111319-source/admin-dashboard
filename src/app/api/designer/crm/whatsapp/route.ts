import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// GET /api/designer/crm/whatsapp — get config + recent messages
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "config" | "messages"

    if (type === "config") {
      const config = await prisma.whatsAppConfig.findUnique({
        where: { designerId },
      });
      return NextResponse.json(config || { isActive: false });
    }

    // Default: messages
    const clientId = searchParams.get("clientId");
    const where: Record<string, unknown> = { designerId };
    if (clientId) where.clientId = clientId;

    const messages = await prisma.whatsAppMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        client: { select: { id: true, name: true, phone: true } },
      },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("WhatsApp fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינה" }, { status: 500 });
  }
}

// POST /api/designer/crm/whatsapp — save config or send message
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const body = await req.json();
    const { action } = body;

    if (action === "save-config") {
      const { phoneNumberId, accessToken, webhookSecret, isActive } = body;
      const config = await prisma.whatsAppConfig.upsert({
        where: { designerId },
        update: {
          phoneNumberId: phoneNumberId?.trim() || null,
          accessToken: accessToken?.trim() || null,
          webhookSecret: webhookSecret?.trim() || null,
          isActive: isActive ?? false,
        },
        create: {
          designerId,
          phoneNumberId: phoneNumberId?.trim() || null,
          accessToken: accessToken?.trim() || null,
          webhookSecret: webhookSecret?.trim() || null,
          isActive: isActive ?? false,
        },
      });
      return NextResponse.json(config);
    }

    if (action === "send-message") {
      const { clientId, phoneNumber, content, messageType } = body;
      if (!content?.trim() || !phoneNumber?.trim()) {
        return NextResponse.json({ error: "תוכן וטלפון הם שדות חובה" }, { status: 400 });
      }

      // Save message to DB (actual sending would be via WhatsApp API)
      const message = await prisma.whatsAppMessage.create({
        data: {
          designerId,
          clientId: clientId || null,
          direction: "outbound",
          phoneNumber: phoneNumber.trim(),
          messageType: messageType || "text",
          content: content.trim(),
          status: "sent",
        },
      });

      return NextResponse.json(message, { status: 201 });
    }

    return NextResponse.json({ error: "פעולה לא חוקית" }, { status: 400 });
  } catch (error) {
    console.error("WhatsApp action error:", error);
    return NextResponse.json({ error: "שגיאה בביצוע פעולה" }, { status: 500 });
  }
}
