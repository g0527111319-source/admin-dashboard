import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// GET /api/admin/whatsapp — templates, broadcast history, message logs
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    // 1. Message templates from SystemSetting
    const templatesSetting = await prisma.systemSetting.findUnique({
      where: { key: "whatsapp_templates" },
    });
    const templates = templatesSetting
      ? (templatesSetting.value as unknown as Array<{
          id: string;
          name: string;
          body: string;
          variables: string[];
        }>)
      : [];

    // 2. Past broadcasts from SystemSetting
    const broadcastsSetting = await prisma.systemSetting.findUnique({
      where: { key: "whatsapp_broadcasts" },
    });
    const broadcasts = broadcastsSetting
      ? (broadcastsSetting.value as unknown as Array<{
          id: string;
          date: string;
          preview: string;
          recipientsCount: number;
          sent: number;
          delivered: number;
          read: number;
          failed: number;
        }>)
      : [];

    // 3. Message logs from WhatsAppLog model (real DB data)
    const logs = await prisma.whatsAppLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const messageLogs = logs.map((log) => ({
      time: new Date(log.createdAt).toLocaleTimeString("he-IL", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      dir: log.direction === "SENT" ? "שליחה" : "קבלה",
      phone: log.phone.replace(/(\d{3})\d{4}(\d{3})/, "$1-***-$2"),
      msg: log.message.length > 50 ? log.message.slice(0, 50) + "..." : log.message,
      status: log.status === "delivered"
        ? "נמסר"
        : log.status === "read"
          ? "נקרא"
          : log.status === "failed"
            ? "נכשל"
            : "נשלח",
    }));

    // 4. Stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMessages = await prisma.whatsAppLog.count({
      where: { createdAt: { gte: today } },
    });
    const failedToday = await prisma.whatsAppLog.count({
      where: { createdAt: { gte: today }, status: "failed" },
    });

    return NextResponse.json({
      templates,
      broadcasts,
      messageLogs,
      stats: {
        todayMessages,
        failedToday,
        pendingReminders: 0,
      },
    });
  } catch (error) {
    console.error("Admin whatsapp fetch error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת נתוני וואטסאפ" },
      { status: 500 }
    );
  }
}
