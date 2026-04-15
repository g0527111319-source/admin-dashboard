import { txt } from "@/content/siteText";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendMessage } from "@/lib/whatsapp/green-api";
import { templates } from "@/lib/whatsapp";
import { clientMeetingReminderEmail, sendEmail } from "@/lib/email";
export const dynamic = "force-dynamic";

const ADMIN_PHONES = (process.env.ADMIN_WHATSAPP_PHONES || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

// ─────────────────────────────────────────────────────────────────────────────
// Client meeting reminders
// -----------------------------------------------------------------------------
// When a designer creates a calendar event with `clientReminderHours` set, we
// schedule a client-facing reminder email to be sent that many hours before
// the meeting. This function scans for events whose reminder window has
// arrived and haven't been sent yet, and emails the client.
//
// PRIVACY: every row already carries `designerId` + `clientId`; we use the
// stored designerId to fetch the correct designer name and client. No cross-
// tenant mixing — the cron is scoped by individual event.
//
// IDEMPOTENCY: `clientReminderSentAt` is stamped immediately after a
// successful send so a retry of the same cron run never double-sends.
// ─────────────────────────────────────────────────────────────────────────────
async function runClientMeetingReminders(now: Date) {
    const results = {
        scanned: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
    };

    let events: Array<{
        id: string;
        designerId: string;
        clientId: string | null;
        title: string;
        description: string | null;
        startAt: Date;
        endAt: Date;
        location: string | null;
        clientReminderHours: number | null;
    }> = [];
    try {
        // Only look at future events (startAt > now) that still need a reminder.
        // Upper bound on startAt (now + 48h) keeps the scan cheap even as the
        // events table grows — we don't need to consider events months away.
        const rawEvents = await prisma.crmCalendarEvent.findMany({
            where: {
                clientId: { not: null },
                clientReminderHours: { not: null },
                clientReminderSentAt: null,
                startAt: {
                    gt: now,
                    lte: new Date(now.getTime() + 48 * 60 * 60 * 1000),
                },
            },
            select: {
                id: true, designerId: true, clientId: true, title: true,
                description: true, startAt: true, endAt: true, location: true,
                clientReminderHours: true,
            },
        });
        events = rawEvents as typeof events;
    } catch (err) {
        // New columns aren't in the DB yet — skip silently.
        console.warn("Calendar reminder scan failed (columns may be unmigrated):", err);
        return results;
    }

    results.scanned = events.length;

    for (const event of events) {
        if (!event.clientId || !event.clientReminderHours) {
            results.skipped++;
            continue;
        }

        // Has the reminder window arrived?
        // We want: startAt - clientReminderHours*3600s <= now
        const reminderAt = new Date(
            event.startAt.getTime() - event.clientReminderHours * 60 * 60 * 1000
        );
        if (reminderAt > now) {
            results.skipped++;
            continue;
        }

        // Load client scoped to this designer (privacy: never cross tenants).
        const client = await prisma.crmClient.findFirst({
            where: { id: event.clientId, designerId: event.designerId, deletedAt: null },
        });
        if (!client) {
            // Client was deleted or reassigned — skip without retry.
            try {
                await prisma.crmCalendarEvent.update({
                    where: { id: event.id },
                    data: { clientReminderSentAt: now },
                });
            } catch { /* noop */ }
            results.skipped++;
            continue;
        }

        const toEmail = client.email || client.partner1Email;
        if (!toEmail) {
            // No inbox to send to — mark as sent so we don't keep trying.
            try {
                await prisma.crmCalendarEvent.update({
                    where: { id: event.id },
                    data: { clientReminderSentAt: now },
                });
            } catch { /* noop */ }
            results.skipped++;
            continue;
        }

        const designer = await prisma.designer.findUnique({
            where: { id: event.designerId },
            select: { fullName: true, firstName: true },
        });
        const designerName = designer?.fullName || designer?.firstName || "Designer";
        const language = (client as unknown as { language?: string | null }).language || "he";

        const tmpl = clientMeetingReminderEmail({
            clientName: client.name,
            designerName,
            language,
            title: event.title,
            startAt: event.startAt,
            endAt: event.endAt,
            location: event.location,
            description: event.description,
            hoursBefore: event.clientReminderHours,
        });

        try {
            const res = await sendEmail({ to: toEmail, subject: tmpl.subject, html: tmpl.html });
            if (res.success) {
                await prisma.crmCalendarEvent.update({
                    where: { id: event.id },
                    data: { clientReminderSentAt: now },
                });
                results.sent++;
            } else {
                results.failed++;
            }
        } catch (err) {
            console.error(`Client meeting reminder send failed for event ${event.id}:`, err);
            results.failed++;
        }
    }

    return results;
}

// GET /api/cron/reminders — תזכורות יומיות לספקים + תזכורות פגישה ללקוחות
// Cron Job: כל יום בצהריים
export async function GET(req: NextRequest) {
    try {
        // בדיקת אבטחה
        const authHeader = req.headers.get("authorization");
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }
        const now = new Date();

        // New: client-facing meeting reminders (email).
        const meetingReminderStats = await runClientMeetingReminders(now);

        const suppliers = await prisma.supplier.findMany({
            where: { isActive: true },
            include: {
                posts: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            },
        });
        const reminders: {
            supplierId: string;
            name: string;
            daysSincePost: number;
            level: string;
        }[] = [];
        for (const supplier of suppliers) {
            const lastPost = supplier.posts[0];
            if (!lastPost)
                continue;
            const daysSincePost = Math.floor((now.getTime() - lastPost.createdAt.getTime()) / (1000 * 60 * 60 * 24));
            if (daysSincePost >= 21) {
                // 21+ ימים — התראה לתמר
                reminders.push({
                    supplierId: supplier.id,
                    name: supplier.name,
                    daysSincePost,
                    level: "critical",
                });
                // Send WhatsApp alert to admin about inactive suppliers
                try {
                    for (const adminPhone of ADMIN_PHONES) {
                        await sendMessage(
                            adminPhone,
                            `🚨 *התראת ספק לא פעיל*\n\nספק *${supplier.name}* לא פרסם כבר ${daysSincePost} ימים.\nנדרשת בדיקה.`
                        );
                    }
                } catch (err) {
                    console.error(`Failed to send admin alert for supplier ${supplier.name}:`, err);
                }
            }
            else if (daysSincePost >= 14) {
                // 14+ ימים — תזכורת שנייה + עדכון לתמר
                reminders.push({
                    supplierId: supplier.id,
                    name: supplier.name,
                    daysSincePost,
                    level: "warning",
                });
                // Send second reminder to supplier
                if (supplier.phone) {
                    try {
                        await sendMessage(supplier.phone, templates.postReminder(daysSincePost));
                    } catch (err) {
                        console.error(`Failed to send second reminder to supplier ${supplier.name}:`, err);
                    }
                }
            }
            else if (daysSincePost >= 7) {
                // 7+ ימים — תזכורת עדינה
                reminders.push({
                    supplierId: supplier.id,
                    name: supplier.name,
                    daysSincePost,
                    level: "gentle",
                });
                // Send gentle reminder to supplier
                if (supplier.phone) {
                    try {
                        await sendMessage(supplier.phone, templates.postReminder(daysSincePost));
                    } catch (err) {
                        console.error(`Failed to send reminder to supplier ${supplier.name}:`, err);
                    }
                }
            }
        }
        return NextResponse.json({
            success: true,
            remindersCount: reminders.length,
            reminders,
            meetingReminders: meetingReminderStats,
        });
    }
    catch (error) {
        console.error("Cron reminders error:", error);
        return NextResponse.json({ error: txt("src/app/api/cron/reminders/route.ts::001", "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05EA\u05D6\u05DB\u05D5\u05E8\u05D5\u05EA") }, { status: 500 });
    }
}
