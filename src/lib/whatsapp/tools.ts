// ==========================================
// AI Tools — Function Calling for WhatsApp Bot
// ==========================================
// Each tool validates permissions based on user role
// and interacts with the database through Prisma.

import prisma from "@/lib/prisma";
import { sendMessage } from "./green-api";
import { normalizePhone } from "./user-resolver";
import type { WhatsAppUser } from "./user-resolver";

// ==========================================
// Types
// ==========================================
export interface ToolDefinition {
  name: string;
  description: string;
  roles: ("designer" | "supplier" | "admin")[];
  parameters: Record<string, { type: string; description: string; required?: boolean; enum?: string[] }>;
}

export interface ToolResult {
  success: boolean;
  message: string;
  data?: unknown;
}

// ==========================================
// Tool Definitions (for Claude function calling)
// ==========================================
export const toolDefinitions: ToolDefinition[] = [
  {
    name: "report_deal",
    description: "דיווח על עסקה חדשה עם ספק. המעצבת מדווחת על עסקה שביצעה.",
    roles: ["designer"],
    parameters: {
      supplierName: { type: "string", description: "שם הספק או שם העסק", required: true },
      amount: { type: "number", description: "סכום העסקה בשקלים", required: true },
      description: { type: "string", description: "תיאור קצר של העסקה", required: false },
    },
  },
  {
    name: "rate_supplier",
    description: "דירוג ספק. המעצבת מדרגת ספק שעבדה איתו.",
    roles: ["designer"],
    parameters: {
      supplierName: { type: "string", description: "שם הספק", required: true },
      score: { type: "number", description: "ציון מ-1 עד 5", required: true },
      comment: { type: "string", description: "תגובה או הערה", required: false },
    },
  },
  {
    name: "confirm_deal",
    description: "אישור או דחייה של עסקה שדווחה על ידי מעצבת",
    roles: ["supplier"],
    parameters: {
      dealId: { type: "string", description: "מזהה העסקה", required: true },
      confirmed: { type: "boolean", description: "האם לאשר (true) או לדחות (false)", required: true },
      note: { type: "string", description: "הערה אופציונלית", required: false },
    },
  },
  {
    name: "check_post_requirements",
    description: "בדיקת דרישות פרסום — לוגו ספק, לוגו קהילה, קרדיט מעצבת",
    roles: ["supplier"],
    parameters: {
      postDescription: { type: "string", description: "תיאור הפרסום לבדיקה", required: true },
    },
  },
  {
    name: "confirm_event_attendance",
    description: "אישור הגעה לאירוע קהילתי",
    roles: ["designer"],
    parameters: {
      eventName: { type: "string", description: "שם האירוע", required: true },
    },
  },
  {
    name: "get_my_deals",
    description: "צפייה בעסקאות שלי. מציג רשימת עסקאות אחרונות.",
    roles: ["designer", "supplier"],
    parameters: {
      limit: { type: "number", description: "מספר עסקאות להציג (ברירת מחדל: 5)", required: false },
    },
  },
  {
    name: "get_community_suppliers",
    description: "רשימת ספקי הקהילה לפי קטגוריה",
    roles: ["designer"],
    parameters: {
      category: { type: "string", description: "קטגוריה לסינון (אופציונלי)", required: false },
    },
  },
  {
    name: "admin_broadcast",
    description: "שליחת הודעה לכל המעצבות או ספקים",
    roles: ["admin"],
    parameters: {
      target: { type: "string", description: "קבוצת יעד", required: true, enum: ["designers", "suppliers", "all"] },
      message: { type: "string", description: "תוכן ההודעה", required: true },
    },
  },
  {
    name: "admin_get_stats",
    description: "קבלת סטטיסטיקות כלליות של הקהילה",
    roles: ["admin"],
    parameters: {},
  },
  {
    name: "admin_create_event",
    description: "יצירת אירוע קהילתי חדש",
    roles: ["admin"],
    parameters: {
      title: { type: "string", description: "שם האירוע", required: true },
      date: { type: "string", description: "תאריך ושעה (YYYY-MM-DD HH:MM)", required: true },
      description: { type: "string", description: "תיאור האירוע", required: false },
    },
  },
  {
    name: "admin_get_all_info",
    description: "חיפוש מידע מפורט על מעצבת, ספק, או עסקה",
    roles: ["admin"],
    parameters: {
      query: { type: "string", description: "מונח חיפוש — שם, טלפון, או מזהה", required: true },
    },
  },
];

// ==========================================
// Tool Execution
// ==========================================

/**
 * Execute a tool by name with given parameters.
 * Validates role permissions before executing.
 */
export async function executeTool(
  toolName: string,
  params: Record<string, unknown>,
  user: WhatsAppUser
): Promise<ToolResult> {
  const toolDef = toolDefinitions.find((t) => t.name === toolName);

  if (!toolDef) {
    return { success: false, message: `כלי לא ידוע: ${toolName}` };
  }

  // Role-based permission check
  if (!toolDef.roles.includes(user.type)) {
    return { success: false, message: "אין לך הרשאה לפעולה זו." };
  }

  try {
    switch (toolName) {
      case "report_deal":
        return await executeReportDeal(params, user);
      case "rate_supplier":
        return await executeRateSupplier(params, user);
      case "confirm_deal":
        return await executeConfirmDeal(params, user);
      case "check_post_requirements":
        return executeCheckPostRequirements(params);
      case "confirm_event_attendance":
        return await executeConfirmEventAttendance(params, user);
      case "get_my_deals":
        return await executeGetMyDeals(params, user);
      case "get_community_suppliers":
        return await executeGetCommunitySuppliers(params);
      case "admin_broadcast":
        return await executeAdminBroadcast(params);
      case "admin_get_stats":
        return await executeAdminGetStats();
      case "admin_create_event":
        return await executeAdminCreateEvent(params);
      case "admin_get_all_info":
        return await executeAdminGetAllInfo(params);
      default:
        return { success: false, message: `כלי לא מיושם: ${toolName}` };
    }
  } catch (error) {
    console.error(`[Tools] Error executing ${toolName}:`, error);
    return { success: false, message: `שגיאה בביצוע הפעולה: ${error instanceof Error ? error.message : "שגיאה לא ידועה"}` };
  }
}

// ==========================================
// Tool Implementations
// ==========================================

async function executeReportDeal(
  params: Record<string, unknown>,
  user: WhatsAppUser
): Promise<ToolResult> {
  const supplierName = String(params.supplierName || "");
  const amount = Number(params.amount);
  const description = String(params.description || "");

  if (!supplierName || !amount || amount <= 0) {
    return { success: false, message: "נדרש שם ספק וסכום חיובי." };
  }

  // Find supplier by name (fuzzy match)
  const supplier = await prisma.supplier.findFirst({
    where: {
      OR: [
        { name: { contains: supplierName, mode: "insensitive" } },
        { contactName: { contains: supplierName, mode: "insensitive" } },
      ],
      isActive: true,
    },
  });

  if (!supplier) {
    return { success: false, message: `לא נמצא ספק בשם "${supplierName}" בקהילה. בדקי את השם ונסי שוב.` };
  }

  // Create deal record
  const deal = await prisma.deal.create({
    data: {
      designerId: user.id,
      supplierId: supplier.id,
      amount,
      description: description || null,
      dealDate: new Date(),
      reportedAt: new Date(),
    },
  });

  // Update designer stats
  await prisma.designer.update({
    where: { id: user.id },
    data: {
      totalDealsReported: { increment: 1 },
      totalDealAmount: { increment: amount },
    },
  });

  // Notify supplier about the new deal
  try {
    await sendMessage(
      supplier.phone,
      `🏛️ *זירת האדריכלות*\n\nמעצבת *${user.name}* דיווחה על עסקה בסך *${amount.toLocaleString("he-IL")} ₪*.\n\nתיאור: ${description || "ללא תיאור"}\n\nהאם לאשר את העסקה?\nמזהה עסקה: ${deal.id}`
    );
  } catch (err) {
    console.error("[Tools] Failed to notify supplier:", err);
  }

  return {
    success: true,
    message: `העסקה דווחה בהצלחה!\nספק: ${supplier.name}\nסכום: ${amount.toLocaleString("he-IL")} ₪\nהספק קיבל הודעה לאישור.`,
    data: { dealId: deal.id, supplierId: supplier.id },
  };
}

async function executeRateSupplier(
  params: Record<string, unknown>,
  user: WhatsAppUser
): Promise<ToolResult> {
  const supplierName = String(params.supplierName || "");
  const score = Number(params.score);
  const comment = String(params.comment || "");

  if (!supplierName || !score || score < 1 || score > 5) {
    return { success: false, message: "נדרש שם ספק וציון בין 1 ל-5." };
  }

  const supplier = await prisma.supplier.findFirst({
    where: {
      OR: [
        { name: { contains: supplierName, mode: "insensitive" } },
        { contactName: { contains: supplierName, mode: "insensitive" } },
      ],
      isActive: true,
    },
  });

  if (!supplier) {
    return { success: false, message: `לא נמצא ספק בשם "${supplierName}".` };
  }

  // Upsert recommendation (one per designer-supplier pair)
  await prisma.recommendation.upsert({
    where: {
      designerId_supplierId: {
        designerId: user.id,
        supplierId: supplier.id,
      },
    },
    update: {
      rating: score,
      text: comment || null,
    },
    create: {
      designerId: user.id,
      supplierId: supplier.id,
      rating: score,
      text: comment || null,
    },
  });

  // Recalculate supplier average rating
  const ratings = await prisma.recommendation.aggregate({
    where: { supplierId: supplier.id, isHidden: false },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.supplier.update({
    where: { id: supplier.id },
    data: {
      averageRating: ratings._avg.rating || 0,
      ratingCount: ratings._count.rating || 0,
    },
  });

  const stars = "⭐".repeat(score);
  return {
    success: true,
    message: `הדירוג נשמר!\nספק: ${supplier.name}\nציון: ${stars} (${score}/5)\n${comment ? `תגובה: ${comment}` : ""}`,
  };
}

async function executeConfirmDeal(
  params: Record<string, unknown>,
  user: WhatsAppUser
): Promise<ToolResult> {
  const dealId = String(params.dealId || "");
  const confirmed = Boolean(params.confirmed);
  const note = String(params.note || "");

  if (!dealId) {
    return { success: false, message: "נדרש מזהה עסקה." };
  }

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { designer: true, supplier: true },
  });

  if (!deal) {
    return { success: false, message: "עסקה לא נמצאה." };
  }

  // Verify the supplier owns this deal
  if (deal.supplierId !== user.id) {
    return { success: false, message: "אין לך הרשאה לאשר עסקה זו." };
  }

  await prisma.deal.update({
    where: { id: dealId },
    data: {
      supplierConfirmed: confirmed,
      supplierConfirmedAt: confirmed ? new Date() : null,
    },
  });

  if (confirmed) {
    // Update supplier stats
    await prisma.supplier.update({
      where: { id: user.id },
      data: {
        totalDeals: { increment: 1 },
        totalDealAmount: { increment: deal.amount },
      },
    });
  }

  // Notify designer
  try {
    await sendMessage(
      deal.designer.phone,
      confirmed
        ? `✅ הספק *${deal.supplier.name}* אישר את העסקה בסך ${deal.amount.toLocaleString("he-IL")} ₪!${note ? `\nהערה: ${note}` : ""}`
        : `❌ הספק *${deal.supplier.name}* דחה את העסקה בסך ${deal.amount.toLocaleString("he-IL")} ₪.${note ? `\nסיבה: ${note}` : ""}`
    );
  } catch (err) {
    console.error("[Tools] Failed to notify designer:", err);
  }

  return {
    success: true,
    message: confirmed
      ? `העסקה אושרה בהצלחה! המעצבת קיבלה הודעה.`
      : `העסקה נדחתה. המעצבת קיבלה הודעה.`,
  };
}

function executeCheckPostRequirements(
  params: Record<string, unknown>
): ToolResult {
  const postDescription = String(params.postDescription || "").toLowerCase();

  const checks = {
    supplierLogo: false,
    communityLogo: false,
    designerCredit: false,
  };

  // Check for supplier logo mention
  if (
    postDescription.includes("לוגו") ||
    postDescription.includes("logo") ||
    postDescription.includes("סמל")
  ) {
    checks.supplierLogo = true;
  }

  // Check for community logo
  if (
    postDescription.includes("זירת") ||
    postDescription.includes("הקהילה") ||
    postDescription.includes("זירה")
  ) {
    checks.communityLogo = true;
  }

  // Check for designer credit
  if (
    postDescription.includes("מעצב") ||
    postDescription.includes("עיצוב") ||
    postDescription.includes("קרדיט") ||
    postDescription.includes("credit")
  ) {
    checks.designerCredit = true;
  }

  const missing: string[] = [];
  if (!checks.supplierLogo) missing.push("לוגו הספק");
  if (!checks.communityLogo) missing.push("לוגו זירת האדריכלות");
  if (!checks.designerCredit) missing.push("קרדיט למעצבת");

  if (missing.length === 0) {
    return {
      success: true,
      message: "✅ הפרסום עומד בכל הדרישות!\n• לוגו ספק ✓\n• לוגו קהילה ✓\n• קרדיט מעצבת ✓",
    };
  }

  return {
    success: true,
    message: `⚠️ חסרים פריטים בפרסום:\n${missing.map((m) => `• ❌ ${m}`).join("\n")}\n\nנא להוסיף את הפריטים החסרים לפני פרסום.`,
  };
}

async function executeConfirmEventAttendance(
  params: Record<string, unknown>,
  user: WhatsAppUser
): Promise<ToolResult> {
  const eventName = String(params.eventName || "");

  if (!eventName) {
    return { success: false, message: "נדרש שם אירוע." };
  }

  // Find upcoming event by name
  const event = await prisma.event.findFirst({
    where: {
      title: { contains: eventName, mode: "insensitive" },
      date: { gte: new Date() },
      status: "OPEN",
    },
    orderBy: { date: "asc" },
  });

  if (!event) {
    return { success: false, message: `לא נמצא אירוע פתוח בשם "${eventName}".` };
  }

  // Check if already registered
  const existing = await prisma.eventRegistration.findUnique({
    where: {
      eventId_designerId: {
        eventId: event.id,
        designerId: user.id,
      },
    },
  });

  if (existing) {
    return { success: true, message: `את כבר רשומה לאירוע "${event.title}"! נתראה שם.` };
  }

  // Register
  await prisma.eventRegistration.create({
    data: {
      eventId: event.id,
      designerId: user.id,
    },
  });

  // Update designer stats
  await prisma.designer.update({
    where: { id: user.id },
    data: { eventsAttended: { increment: 1 } },
  });

  const dateStr = event.date.toLocaleDateString("he-IL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return {
    success: true,
    message: `✅ נרשמת לאירוע "${event.title}"!\n📅 ${dateStr}\n📍 ${event.location || "יעודכן"}\nנתראה שם!`,
  };
}

async function executeGetMyDeals(
  params: Record<string, unknown>,
  user: WhatsAppUser
): Promise<ToolResult> {
  const limit = Math.min(Number(params.limit) || 5, 20);

  const whereClause =
    user.type === "designer"
      ? { designerId: user.id }
      : { supplierId: user.id };

  const deals = await prisma.deal.findMany({
    where: whereClause,
    include: {
      designer: { select: { fullName: true } },
      supplier: { select: { name: true } },
    },
    orderBy: { reportedAt: "desc" },
    take: limit,
  });

  if (deals.length === 0) {
    return { success: true, message: "אין עסקאות להצגה." };
  }

  const lines = deals.map((d, i) => {
    const status = d.supplierConfirmed ? "✅ מאושר" : "⏳ ממתין לאישור";
    const date = d.reportedAt.toLocaleDateString("he-IL");
    const otherParty =
      user.type === "designer" ? d.supplier.name : d.designer.fullName;
    return `${i + 1}. ${otherParty} — ${d.amount.toLocaleString("he-IL")} ₪ | ${date} | ${status}`;
  });

  return {
    success: true,
    message: `📋 העסקאות האחרונות שלך:\n\n${lines.join("\n")}`,
    data: deals.map((d) => ({ id: d.id, amount: d.amount, confirmed: d.supplierConfirmed })),
  };
}

async function executeGetCommunitySuppliers(
  params: Record<string, unknown>
): Promise<ToolResult> {
  const category = params.category ? String(params.category) : undefined;

  const whereClause: Record<string, unknown> = { isActive: true, isHidden: false };
  if (category) {
    whereClause.category = { contains: category, mode: "insensitive" };
  }

  const suppliers = await prisma.supplier.findMany({
    where: whereClause,
    select: {
      name: true,
      category: true,
      city: true,
      phone: true,
      // Intentionally NOT including ratings — privacy
    },
    orderBy: { name: "asc" },
    take: 30,
  });

  if (suppliers.length === 0) {
    return {
      success: true,
      message: category
        ? `לא נמצאו ספקים בקטגוריה "${category}".`
        : "לא נמצאו ספקים.",
    };
  }

  const lines = suppliers.map(
    (s, i) => `${i + 1}. *${s.name}* — ${s.category}${s.city ? ` (${s.city})` : ""}`
  );

  return {
    success: true,
    message: `📋 ספקי הקהילה${category ? ` — ${category}` : ""}:\n\n${lines.join("\n")}`,
  };
}

async function executeAdminBroadcast(
  params: Record<string, unknown>
): Promise<ToolResult> {
  const target = String(params.target);
  const message = String(params.message || "");

  if (!message) {
    return { success: false, message: "נדרש תוכן להודעה." };
  }

  const phones: string[] = [];

  if (target === "designers" || target === "all") {
    const designers = await prisma.designer.findMany({
      where: { isActive: true },
      select: { phone: true },
    });
    phones.push(...designers.map((d) => d.phone));
  }

  if (target === "suppliers" || target === "all") {
    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      select: { phone: true },
    });
    phones.push(...suppliers.map((s) => s.phone));
  }

  // Deduplicate
  const uniquePhones = [...new Set(phones.map((p) => normalizePhone(p)))];

  // Queue messages (send with delays to avoid rate limiting)
  let sent = 0;
  let failed = 0;

  for (const phone of uniquePhones) {
    try {
      await sendMessage(phone, `🏛️ *זירת האדריכלות*\n\n${message}`);
      sent++;
      // Small delay between messages
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch {
      failed++;
    }
  }

  return {
    success: true,
    message: `📤 שידור הושלם!\nנשלח ל: ${sent} נמענים\nנכשל: ${failed}`,
    data: { sent, failed, total: uniquePhones.length },
  };
}

async function executeAdminGetStats(): Promise<ToolResult> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    designerCount,
    supplierCount,
    dealsThisMonth,
    totalDealsAmount,
    upcomingEvents,
    ratingsCount,
  ] = await Promise.all([
    prisma.designer.count({ where: { isActive: true } }),
    prisma.supplier.count({ where: { isActive: true } }),
    prisma.deal.count({ where: { reportedAt: { gte: startOfMonth } } }),
    prisma.deal.aggregate({
      where: { reportedAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.event.count({ where: { date: { gte: now }, status: "OPEN" } }),
    prisma.recommendation.count({ where: { createdAt: { gte: startOfMonth } } }),
  ]);

  const monthName = now.toLocaleDateString("he-IL", { month: "long", year: "numeric" });

  return {
    success: true,
    message: `📊 סטטיסטיקות — ${monthName}:\n\n` +
      `👩‍🎨 מעצבות פעילות: ${designerCount}\n` +
      `🏢 ספקים פעילים: ${supplierCount}\n` +
      `💰 עסקאות החודש: ${dealsThisMonth}\n` +
      `💵 סה"כ סכום: ${(totalDealsAmount._sum.amount || 0).toLocaleString("he-IL")} ₪\n` +
      `⭐ דירוגים החודש: ${ratingsCount}\n` +
      `📅 אירועים קרובים: ${upcomingEvents}`,
  };
}

async function executeAdminCreateEvent(
  params: Record<string, unknown>
): Promise<ToolResult> {
  const title = String(params.title || "");
  const dateStr = String(params.date || "");
  const description = String(params.description || "");

  if (!title || !dateStr) {
    return { success: false, message: "נדרש שם אירוע ותאריך." };
  }

  const eventDate = new Date(dateStr);
  if (isNaN(eventDate.getTime())) {
    return { success: false, message: `תאריך לא תקין: "${dateStr}". השתמשי בפורמט YYYY-MM-DD.` };
  }

  const event = await prisma.event.create({
    data: {
      title,
      date: eventDate,
      description: description || null,
      status: "OPEN",
    },
  });

  return {
    success: true,
    message: `✅ אירוע נוצר!\n📌 ${title}\n📅 ${eventDate.toLocaleDateString("he-IL")}\n${description ? `📝 ${description}` : ""}`,
    data: { eventId: event.id },
  };
}

async function executeAdminGetAllInfo(
  params: Record<string, unknown>
): Promise<ToolResult> {
  const query = String(params.query || "");

  if (!query) {
    return { success: false, message: "נדרש מונח חיפוש." };
  }

  const results: string[] = [];

  // Search designers
  const designers = await prisma.designer.findMany({
    where: {
      OR: [
        { fullName: { contains: query, mode: "insensitive" } },
        { phone: { contains: query } },
        { email: { contains: query, mode: "insensitive" } },
      ],
    },
    take: 5,
  });

  for (const d of designers) {
    results.push(
      `👩‍🎨 מעצבת: ${d.fullName}\n` +
      `   טל: ${d.phone} | מייל: ${d.email || "—"}\n` +
      `   עיר: ${d.city || "—"} | התמחות: ${d.specialization || "—"}\n` +
      `   עסקאות: ${d.totalDealsReported} | סה"כ: ${d.totalDealAmount.toLocaleString("he-IL")} ₪`
    );
  }

  // Search suppliers
  const suppliers = await prisma.supplier.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { contactName: { contains: query, mode: "insensitive" } },
        { phone: { contains: query } },
      ],
    },
    take: 5,
  });

  for (const s of suppliers) {
    results.push(
      `🏢 ספק: ${s.name} (${s.contactName})\n` +
      `   טל: ${s.phone} | מייל: ${s.email || "—"}\n` +
      `   קטגוריה: ${s.category} | דירוג: ${s.averageRating.toFixed(1)}⭐\n` +
      `   עסקאות: ${s.totalDeals} | סה"כ: ${s.totalDealAmount.toLocaleString("he-IL")} ₪`
    );
  }

  // Search deals by ID
  if (query.length > 10) {
    try {
      const deal = await prisma.deal.findUnique({
        where: { id: query },
        include: {
          designer: { select: { fullName: true } },
          supplier: { select: { name: true } },
        },
      });

      if (deal) {
        results.push(
          `💰 עסקה: ${deal.id}\n` +
          `   מעצבת: ${deal.designer.fullName}\n` +
          `   ספק: ${deal.supplier.name}\n` +
          `   סכום: ${deal.amount.toLocaleString("he-IL")} ₪\n` +
          `   סטטוס: ${deal.supplierConfirmed ? "מאושר" : "ממתין"}\n` +
          `   תאריך: ${deal.reportedAt.toLocaleDateString("he-IL")}`
        );
      }
    } catch {
      // Not a valid ID, ignore
    }
  }

  if (results.length === 0) {
    return { success: true, message: `לא נמצאו תוצאות עבור "${query}".` };
  }

  return {
    success: true,
    message: `🔍 תוצאות חיפוש — "${query}":\n\n${results.join("\n\n")}`,
  };
}

// ==========================================
// Convert tool definitions to Anthropic format
// ==========================================
export function getAnthropicTools(userRole: string) {
  return toolDefinitions
    .filter((t) => t.roles.includes(userRole as "designer" | "supplier" | "admin"))
    .map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: {
        type: "object" as const,
        properties: Object.fromEntries(
          Object.entries(t.parameters).map(([key, val]) => [
            key,
            {
              type: val.type === "boolean" ? "boolean" : val.type === "number" ? "number" : "string",
              description: val.description,
              ...(val.enum ? { enum: val.enum } : {}),
            },
          ])
        ),
        required: Object.entries(t.parameters)
          .filter(([, val]) => val.required)
          .map(([key]) => key),
      },
    }));
}
