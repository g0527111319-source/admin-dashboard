// ==========================================
// Daily Summary — Admin Report Generator
// ==========================================
// Generates a Hebrew daily summary of platform activity
// and sends it to admin phone number(s) via WhatsApp.

import prisma from "@/lib/prisma";
import { sendMessage } from "./green-api";
import { g } from "@/lib/gender";

// ==========================================
// Configuration
// ==========================================
const ADMIN_PHONES = (process.env.ADMIN_WHATSAPP_PHONES || "")
  .split(",")
  .map((p) => p.trim())
  .filter(Boolean);

const INACTIVE_DESIGNER_DAYS = 30;
const PENDING_DEAL_DAYS = 7;

// ==========================================
// Data Fetching
// ==========================================

interface DailySummaryData {
  newDeals: { count: number; totalAmount: number };
  newDesigners: { count: number; names: string[] };
  supplierConfirmations: { count: number };
  events: { name: string; registrations: number }[];
  botMessages: number;
  alerts: string[];
}

/**
 * Fetch today's activity data from the database.
 */
async function fetchDailyData(): Promise<DailySummaryData> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  // 1. New deals today
  const newDeals = await prisma.deal.findMany({
    where: {
      createdAt: { gte: startOfDay, lt: endOfDay },
    },
    select: { amount: true },
  });
  const dealCount = newDeals.length;
  const dealTotal = newDeals.reduce((sum, d) => sum + d.amount, 0);

  // 2. New designers registered today
  const newDesigners = await prisma.designer.findMany({
    where: {
      createdAt: { gte: startOfDay, lt: endOfDay },
    },
    select: { fullName: true },
  });

  // 3. Supplier confirmations today
  const supplierConfirmations = await prisma.deal.count({
    where: {
      supplierConfirmed: true,
      supplierConfirmedAt: { gte: startOfDay, lt: endOfDay },
    },
  });

  // 4. Upcoming events with registrations
  const upcomingEvents = await prisma.event.findMany({
    where: {
      date: { gte: startOfDay },
      status: { in: ["OPEN", "DRAFT"] },
    },
    include: {
      _count: { select: { registrations: true } },
    },
    orderBy: { date: "asc" },
    take: 5,
  });

  const events = upcomingEvents.map((e) => ({
    name: e.title,
    registrations: e._count.registrations,
  }));

  // 5. Bot messages today (from audit log)
  const botMessages = await prisma.whatsAppAuditLog.count({
    where: {
      createdAt: { gte: startOfDay, lt: endOfDay },
    },
  });

  // 6. Alerts — inactive designers
  const alerts: string[] = [];

  const inactiveThreshold = new Date(
    now.getTime() - INACTIVE_DESIGNER_DAYS * 24 * 60 * 60 * 1000
  );
  const inactiveDesigners = await prisma.designer.findMany({
    where: {
      isActive: true,
      updatedAt: { lt: inactiveThreshold },
    },
    select: { fullName: true, gender: true },
    take: 5,
  });

  for (const designer of inactiveDesigners) {
    alerts.push(
      `${g(designer.gender, "מעצב", "מעצבת")} "${designer.fullName}" לא ${g(designer.gender, "פעיל", "פעילה")} ${INACTIVE_DESIGNER_DAYS} יום`
    );
  }

  // 7. Alerts — pending deal confirmations older than 7 days
  const pendingThreshold = new Date(
    now.getTime() - PENDING_DEAL_DAYS * 24 * 60 * 60 * 1000
  );
  const pendingDeals = await prisma.deal.count({
    where: {
      supplierConfirmed: false,
      createdAt: { lt: pendingThreshold },
    },
  });

  if (pendingDeals > 0) {
    alerts.push(
      `${pendingDeals} עסקאות ממתינות לאישור ספק מעל ${PENDING_DEAL_DAYS} ימים`
    );
  }

  return {
    newDeals: { count: dealCount, totalAmount: dealTotal },
    newDesigners: {
      count: newDesigners.length,
      names: newDesigners.map((d) => d.fullName),
    },
    supplierConfirmations: { count: supplierConfirmations },
    events,
    botMessages,
    alerts,
  };
}

// ==========================================
// Message Formatting
// ==========================================

/**
 * Format daily data into a Hebrew WhatsApp summary message.
 */
function formatSummaryMessage(data: DailySummaryData): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const lines: string[] = [];

  lines.push("📊 סיכום יומי — זירת האדריכלות");
  lines.push(`📅 ${dateStr}`);
  lines.push("");

  // Deals
  const totalFormatted = data.newDeals.totalAmount.toLocaleString("he-IL");
  lines.push(
    `💰 עסקאות: ${data.newDeals.count} חדשות (סה"כ ₪${totalFormatted})`
  );

  // Designers
  if (data.newDesigners.count > 0) {
    const namesList = data.newDesigners.names.join(", ");
    lines.push(
      `🎨 מעצבות: ${data.newDesigners.count} חדשות נרשמו (${namesList})`
    );
  } else {
    lines.push("🎨 מעצבות: אין הרשמות חדשות");
  }

  // Supplier confirmations
  lines.push(`🏪 ספקים: ${data.supplierConfirmations.count} אישרו עסקאות`);

  // Events
  if (data.events.length > 0) {
    for (const event of data.events) {
      lines.push(`📅 אירוע "${event.name}" — ${event.registrations} נרשמו`);
    }
  }

  // Bot messages
  lines.push(`📝 הודעות בוט: ${data.botMessages} שיחות היום`);

  // Alerts
  if (data.alerts.length > 0) {
    lines.push("");
    lines.push("⚠️ דורש תשומת לב:");
    for (const alert of data.alerts) {
      lines.push(`- ${alert}`);
    }
  }

  return lines.join("\n");
}

// ==========================================
// Main Export
// ==========================================

/**
 * Generate and send the daily summary to all admin phones.
 * Returns the formatted message for logging/preview.
 */
export async function generateDailySummary(): Promise<{
  message: string;
  sentTo: string[];
  errors: string[];
}> {
  const data = await fetchDailyData();
  const message = formatSummaryMessage(data);

  const sentTo: string[] = [];
  const errors: string[] = [];

  if (ADMIN_PHONES.length === 0) {
    errors.push(
      "ADMIN_WHATSAPP_PHONES not configured — summary not sent"
    );
    console.warn("[DailySummary] No admin phones configured");
    return { message, sentTo, errors };
  }

  for (const phone of ADMIN_PHONES) {
    try {
      await sendMessage(phone, message);
      sentTo.push(phone);
      console.log(`[DailySummary] Sent to ${phone}`);
    } catch (error) {
      const errMsg = `Failed to send to ${phone}: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errMsg);
      console.error(`[DailySummary] ${errMsg}`);
    }
  }

  return { message, sentTo, errors };
}
