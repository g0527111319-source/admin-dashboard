// ==========================================
// Scheduled Tasks — Admin Recurring Tasks via WhatsApp
// ==========================================
// System for admin to set recurring tasks through WhatsApp.
// Tasks are stored in DB and executed at the specified times.

import prisma from "@/lib/prisma";
import { processMessage } from "./conversation-engine";
import { sendMessage } from "./green-api";
import type { WhatsAppUser } from "./user-resolver";

// ==========================================
// Types
// ==========================================
export interface ScheduledTask {
  id: string;
  description: string;
  cronExpr: string | null;
  nextRunAt: Date | null;
  prompt: string;
  isActive: boolean;
}

// ==========================================
// Cron Expression Parser (simplified)
// ==========================================

/**
 * Parse a Hebrew task command into a cron expression and prompt.
 * Examples:
 * - "כל יום ב-9 בבוקר שלח לי סיכום עסקאות"
 * - "כל שני ב-10 שלח סטטיסטיקות"
 * - "מחר ב-8 שלח תזכורת"
 */
export function parseTaskCommand(text: string): {
  cronExpr: string | null;
  nextRunAt: Date | null;
  description: string;
  prompt: string;
} | null {
  const lowerText = text.trim();

  // Pattern: "כל יום ב-HH" or "כל יום בשעה HH"
  const dailyMatch = lowerText.match(/כל\s+יום\s+ב-?(\d{1,2})/);
  if (dailyMatch) {
    const hour = parseInt(dailyMatch[1]);
    if (hour >= 0 && hour <= 23) {
      const prompt = lowerText.replace(/כל\s+יום\s+ב-?\d{1,2}(\s+בבוקר|\s+בערב)?/, "").trim();
      return {
        cronExpr: `0 ${hour} * * *`,
        nextRunAt: getNextRunTime(hour),
        description: `כל יום ב-${hour}:00`,
        prompt: prompt || "שלח סיכום יומי",
      };
    }
  }

  // Pattern: "כל [day] ב-HH"
  const weeklyDays: Record<string, number> = {
    "ראשון": 0, "שני": 1, "שלישי": 2, "רביעי": 3,
    "חמישי": 4, "שישי": 5, "שבת": 6,
  };

  for (const [dayName, dayNum] of Object.entries(weeklyDays)) {
    const weeklyMatch = lowerText.match(new RegExp(`כל\\s+${dayName}\\s+ב-?(\\d{1,2})`));
    if (weeklyMatch) {
      const hour = parseInt(weeklyMatch[1]);
      const prompt = lowerText
        .replace(new RegExp(`כל\\s+${dayName}\\s+ב-?\\d{1,2}(\\s+בבוקר|\\s+בערב)?`), "")
        .trim();
      return {
        cronExpr: `0 ${hour} * * ${dayNum}`,
        nextRunAt: getNextWeeklyRunTime(dayNum, hour),
        description: `כל ${dayName} ב-${hour}:00`,
        prompt: prompt || "שלח סיכום שבועי",
      };
    }
  }

  // Pattern: one-time — "מחר ב-HH" or "היום ב-HH"
  const tomorrowMatch = lowerText.match(/מחר\s+ב-?(\d{1,2})/);
  if (tomorrowMatch) {
    const hour = parseInt(tomorrowMatch[1]);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(hour, 0, 0, 0);
    const prompt = lowerText.replace(/מחר\s+ב-?\d{1,2}(\s+בבוקר|\s+בערב)?/, "").trim();
    return {
      cronExpr: null,
      nextRunAt: tomorrow,
      description: `מחר ב-${hour}:00`,
      prompt: prompt || "משימה חד-פעמית",
    };
  }

  const todayMatch = lowerText.match(/היום\s+ב-?(\d{1,2})/);
  if (todayMatch) {
    const hour = parseInt(todayMatch[1]);
    const today = new Date();
    today.setHours(hour, 0, 0, 0);
    if (today <= new Date()) {
      return null; // Time already passed
    }
    const prompt = lowerText.replace(/היום\s+ב-?\d{1,2}(\s+בבוקר|\s+בערב)?/, "").trim();
    return {
      cronExpr: null,
      nextRunAt: today,
      description: `היום ב-${hour}:00`,
      prompt: prompt || "משימה חד-פעמית",
    };
  }

  return null;
}

function getNextRunTime(hour: number): Date {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, 0, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

function getNextWeeklyRunTime(dayOfWeek: number, hour: number): Date {
  const now = new Date();
  const next = new Date();
  const currentDay = now.getDay();
  let daysAhead = dayOfWeek - currentDay;
  if (daysAhead < 0) daysAhead += 7;
  if (daysAhead === 0 && now.getHours() >= hour) daysAhead = 7;
  next.setDate(now.getDate() + daysAhead);
  next.setHours(hour, 0, 0, 0);
  return next;
}

// ==========================================
// Task Management
// ==========================================

/**
 * Schedule a new task from an admin WhatsApp command.
 */
export async function scheduleTask(
  adminPhone: string,
  command: string
): Promise<string> {
  const parsed = parseTaskCommand(command);

  if (!parsed) {
    return "לא הצלחתי לפרסר את הפקודה. דוגמאות:\n• כל יום ב-9 שלח סיכום עסקאות\n• כל שני ב-10 שלח סטטיסטיקות\n• מחר ב-8 שלח תזכורת";
  }

  try {
    const task = await prisma.whatsAppScheduledTask.create({
      data: {
        createdBy: adminPhone,
        description: parsed.description,
        cronExpr: parsed.cronExpr,
        nextRunAt: parsed.nextRunAt,
        prompt: parsed.prompt,
        isActive: true,
      },
    });

    const typeLabel = parsed.cronExpr ? "משימה חוזרת" : "משימה חד-פעמית";
    return `✅ ${typeLabel} נוצרה!\n📋 ${parsed.description}\n📝 ${parsed.prompt}\n🔑 מזהה: ${task.id.substring(0, 8)}`;
  } catch (error) {
    console.error("[ScheduledTasks] Failed to create task:", error);
    return "שגיאה ביצירת המשימה. נסי שוב.";
  }
}

/**
 * List all active scheduled tasks for the admin.
 */
export async function listTasks(): Promise<string> {
  try {
    const tasks = await prisma.whatsAppScheduledTask.findMany({
      where: { isActive: true },
      orderBy: { nextRunAt: "asc" },
    });

    if (tasks.length === 0) {
      return "אין משימות מתוזמנות פעילות.";
    }

    const lines = tasks.map((t, i) => {
      const nextRun = t.nextRunAt
        ? t.nextRunAt.toLocaleString("he-IL")
        : "לא מוגדר";
      return `${i + 1}. ${t.description}\n   📝 ${t.prompt}\n   ⏰ ריצה הבאה: ${nextRun}`;
    });

    return `📋 משימות מתוזמנות:\n\n${lines.join("\n\n")}`;
  } catch (error) {
    console.error("[ScheduledTasks] Failed to list tasks:", error);
    return "שגיאה בשליפת משימות.";
  }
}

/**
 * Cancel a scheduled task by ID prefix.
 */
export async function cancelTask(idPrefix: string): Promise<string> {
  try {
    const tasks = await prisma.whatsAppScheduledTask.findMany({
      where: {
        id: { startsWith: idPrefix },
        isActive: true,
      },
    });

    if (tasks.length === 0) {
      return `לא נמצאה משימה עם מזהה "${idPrefix}".`;
    }

    if (tasks.length > 1) {
      return `נמצאו ${tasks.length} משימות. ציין מזהה מדויק יותר.`;
    }

    await prisma.whatsAppScheduledTask.update({
      where: { id: tasks[0].id },
      data: { isActive: false },
    });

    return `✅ משימה "${tasks[0].description}" בוטלה.`;
  } catch (error) {
    console.error("[ScheduledTasks] Failed to cancel task:", error);
    return "שגיאה בביטול המשימה.";
  }
}

// ==========================================
// Task Executor
// ==========================================

/**
 * Execute all due scheduled tasks.
 * Should be called periodically (e.g., every minute via cron).
 */
export async function executeScheduledTasks(): Promise<number> {
  const now = new Date();

  try {
    const dueTasks = await prisma.whatsAppScheduledTask.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: now },
      },
    });

    let executed = 0;

    for (const task of dueTasks) {
      try {
        console.log(`[ScheduledTasks] Executing task: ${task.description}`);

        // Create admin user context
        const adminUser: WhatsAppUser = {
          type: "admin",
          id: "admin",
          name: "מנהלת הקהילה",
          phone: task.createdBy,
          data: {},
        };

        // Process through Claude
        const { response } = await processMessage(adminUser, task.prompt);

        // Send result to admin
        await sendMessage(task.createdBy, `📋 *משימה מתוזמנת: ${task.description}*\n\n${response}`);

        // Update task
        if (task.cronExpr) {
          // Recurring task — calculate next run
          const nextRun = calculateNextCronRun(task.cronExpr);
          await prisma.whatsAppScheduledTask.update({
            where: { id: task.id },
            data: {
              lastRunAt: now,
              nextRunAt: nextRun,
            },
          });
        } else {
          // One-time task — deactivate
          await prisma.whatsAppScheduledTask.update({
            where: { id: task.id },
            data: {
              lastRunAt: now,
              isActive: false,
            },
          });
        }

        executed++;
      } catch (error) {
        console.error(`[ScheduledTasks] Failed to execute task ${task.id}:`, error);
      }
    }

    return executed;
  } catch (error) {
    console.error("[ScheduledTasks] Failed to query due tasks:", error);
    return 0;
  }
}

/**
 * Simple cron next-run calculator.
 * Handles: "minute hour * * *" and "minute hour * * dayOfWeek"
 */
function calculateNextCronRun(cronExpr: string): Date {
  const parts = cronExpr.split(" ");
  if (parts.length !== 5) {
    // Fallback: next day same time
    const next = new Date();
    next.setDate(next.getDate() + 1);
    return next;
  }

  const minute = parseInt(parts[0]) || 0;
  const hour = parseInt(parts[1]) || 0;
  const dayOfWeek = parts[4] !== "*" ? parseInt(parts[4]) : null;

  const now = new Date();

  if (dayOfWeek !== null) {
    // Weekly
    return getNextWeeklyRunTime(dayOfWeek, hour);
  }

  // Daily
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}
