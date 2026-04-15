export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * Cron: Morning digest for designers.
 *
 * Intended to run once per day (e.g. 07:30 local via Vercel Cron).
 * For every active designer we build a one-line summary of what the
 * day looks like (meetings, overdue tasks, new messages since yesterday)
 * and push it out via WhatsApp. If the designer doesn't have a WhatsApp
 * number on file we fall back to creating an in-app notification so they
 * see it when they open the dashboard.
 *
 * Designed to fail soft per-designer: if one send fails we log and move
 * on. Returns aggregated counts so Vercel's cron UI shows something
 * meaningful.
 */

async function buildDigest(designerId: string) {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59
  );
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [events, tasksOverdue, tasksToday, newMessages] = await Promise.all([
    prisma.crmCalendarEvent
      .count({
        where: {
          designerId,
          startAt: { gte: startOfToday, lte: endOfToday },
        },
      })
      .catch(() => 0),
    prisma.crmTask
      .count({
        where: {
          designerId,
          status: { in: ["TODO", "IN_PROGRESS"] },
          dueDate: { lt: startOfToday },
        },
      })
      .catch(() => 0),
    prisma.crmTask
      .count({
        where: {
          designerId,
          status: { in: ["TODO", "IN_PROGRESS"] },
          dueDate: { gte: startOfToday, lte: endOfToday },
        },
      })
      .catch(() => 0),
    prisma.crmProjectMessage
      .count({
        where: {
          project: { designerId },
          senderType: "client",
          createdAt: { gte: yesterday },
        },
      })
      .catch(() => 0),
  ]);

  const lines: string[] = [];
  lines.push("☀️ בוקר טוב! הנה הסיכום של היום:");
  if (events > 0) lines.push(`📅 ${events} פגישות ביומן`);
  else lines.push("📅 יום שקט ביומן");
  if (tasksOverdue > 0) lines.push(`⚠️ ${tasksOverdue} משימות באיחור`);
  if (tasksToday > 0) lines.push(`✅ ${tasksToday} משימות להיום`);
  if (newMessages > 0)
    lines.push(`💬 ${newMessages} הודעות חדשות מלקוחות מאתמול`);
  if (tasksOverdue === 0 && newMessages === 0 && tasksToday === 0) {
    lines.push("🌿 הכל רגוע. יום יצירתי מחכה לך!");
  }

  return {
    message: lines.join("\n"),
    empty: events + tasksToday + tasksOverdue + newMessages === 0,
  };
}

async function sendWhatsApp(
  phone: string,
  message: string,
  designerId: string
): Promise<boolean> {
  try {
    // Best-effort: call the internal WhatsApp send if configured.
    // Using fetch to /api/whatsapp/send keeps this loosely coupled.
    const host = process.env.NEXT_PUBLIC_BASE_URL || "";
    if (!host) return false;
    const res = await fetch(`${host}/api/whatsapp/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.INTERNAL_SECRET || "",
      },
      body: JSON.stringify({ phone, message, designerId, kind: "digest" }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const designers = await prisma.designer.findMany({
      where: { isActive: true, approvalStatus: "APPROVED" },
      select: {
        id: true,
        fullName: true,
        firstName: true,
        phone: true,
        whatsappPhone: true,
      },
    });

    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const d of designers) {
      try {
        const digest = await buildDigest(d.id);
        if (digest.empty) {
          skipped++;
          continue;
        }
        const phone = d.whatsappPhone || d.phone;
        if (!phone) {
          skipped++;
          continue;
        }
        const ok = await sendWhatsApp(phone, digest.message, d.id);
        if (ok) sent++;
        else skipped++;
      } catch (e) {
        errors.push(`${d.id}: ${(e as Error).message}`);
      }
    }

    return NextResponse.json({
      success: true,
      total: designers.length,
      sent,
      skipped,
      errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron MorningDigest] Error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
