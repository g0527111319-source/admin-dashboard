// ==========================================
// WhatsApp Bot Status Endpoint
// ==========================================
// GET endpoint for admin to check bot status.

import { NextResponse } from "next/server";
import { getInstanceStatus, isMockMode, getMessagesProcessed24h } from "@/lib/whatsapp/green-api";
import { getActiveConversationsCount } from "@/lib/whatsapp/conversation-engine";
import { getSecurityStats } from "@/lib/whatsapp/security";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Get Green API instance status
    const instanceStatus = await getInstanceStatus();

    // Get message count from audit log (last 24 hours)
    let auditMessageCount = 0;
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      auditMessageCount = await prisma.whatsAppAuditLog.count({
        where: { createdAt: { gte: twentyFourHoursAgo } },
      });
    } catch {
      // DB might not be available
      auditMessageCount = getMessagesProcessed24h();
    }

    // Get recent conversations count
    let recentConversations = 0;
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      recentConversations = await prisma.whatsAppConversation.count({
        where: { updatedAt: { gte: oneHourAgo } },
      });
    } catch {
      recentConversations = getActiveConversationsCount();
    }

    // Get scheduled tasks count
    let activeTasksCount = 0;
    try {
      activeTasksCount = await prisma.whatsAppScheduledTask.count({
        where: { isActive: true },
      });
    } catch {
      // DB might not be available
    }

    // Security stats
    const security = getSecurityStats();

    return NextResponse.json({
      connected: instanceStatus.isOnline,
      instanceStatus: instanceStatus.stateInstance,
      mockMode: isMockMode(),
      messagesProcessed24h: auditMessageCount,
      activeConversations: recentConversations,
      inMemoryConversations: getActiveConversationsCount(),
      scheduledTasks: activeTasksCount,
      security: {
        activeRateLimits: security.activeRateLimits,
        blockedPhones: security.blockedPhones,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Status] Error:", error);
    return NextResponse.json(
      {
        connected: false,
        instanceStatus: "error",
        mockMode: isMockMode(),
        error: "Failed to fetch status",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
