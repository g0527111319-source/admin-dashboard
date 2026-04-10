import { txt } from "@/content/siteText";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendMessage } from "@/lib/whatsapp/green-api";
import { templates } from "@/lib/whatsapp";
export const dynamic = "force-dynamic";

const ADMIN_PHONES = (process.env.ADMIN_WHATSAPP_PHONES || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
// GET /api/cron/reminders — תזכורות יומיות לספקים
// Cron Job: כל יום בצהריים
export async function GET(req: NextRequest) {
    try {
        // בדיקת אבטחה
        const authHeader = req.headers.get("authorization");
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }
        const now = new Date();
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
        });
    }
    catch (error) {
        console.error("Cron reminders error:", error);
        return NextResponse.json({ error: txt("src/app/api/cron/reminders/route.ts::001", "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05EA\u05D6\u05DB\u05D5\u05E8\u05D5\u05EA") }, { status: 500 });
    }
}
