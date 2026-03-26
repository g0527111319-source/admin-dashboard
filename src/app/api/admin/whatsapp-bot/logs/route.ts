// ==========================================
// WhatsApp Bot Audit Logs API
// ==========================================
// Returns recent audit log entries for the admin dashboard.

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const phone = searchParams.get("phone");

    const whereClause: Record<string, unknown> = {};
    if (phone) {
      whereClause.phone = { contains: phone };
    }

    const logs = await prisma.whatsAppAuditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ logs, total: logs.length });
  } catch (error) {
    console.error("[WhatsApp Logs API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch logs", logs: [] },
      { status: 500 }
    );
  }
}
