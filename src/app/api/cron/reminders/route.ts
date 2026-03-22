import { txt } from "@/content/siteText";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
export const dynamic = "force-dynamic";
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
                // TODO: שליחת הודעה לתמר
            }
            else if (daysSincePost >= 14) {
                // 14+ ימים — תזכורת שנייה + עדכון לתמר
                reminders.push({
                    supplierId: supplier.id,
                    name: supplier.name,
                    daysSincePost,
                    level: "warning",
                });
                // TODO: שליחת תזכורת שנייה לספק
            }
            else if (daysSincePost >= 7) {
                // 7+ ימים — תזכורת עדינה
                reminders.push({
                    supplierId: supplier.id,
                    name: supplier.name,
                    daysSincePost,
                    level: "gentle",
                });
                // TODO: שליחת תזכורת לספק
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
