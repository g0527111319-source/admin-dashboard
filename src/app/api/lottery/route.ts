import { txt } from "@/content/siteText";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
export const dynamic = "force-dynamic";

// GET /api/lottery — רשימת הגרלות
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");
        const where: Record<string, unknown> = {};
        if (status)
            where.status = status;
        const lotteries = await prisma.lottery.findMany({
            where,
            include: {
                winners: {
                    include: {
                        designer: { select: { fullName: true } },
                    },
                    orderBy: { rank: "asc" },
                },
            },
            orderBy: { month: "desc" },
        });
        return NextResponse.json(lotteries);
    }
    catch (error) {
        console.error("Lottery fetch error:", error);
        return NextResponse.json({ error: txt("src/app/api/lottery/route.ts::001", "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05D4\u05D2\u05E8\u05DC\u05D5\u05EA") }, { status: 500 });
    }
}

// POST /api/lottery — יצירת הגרלה חדשה
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { month, prize, prizeValue, minDealAmount, minDealCount } = body;
        if (!month || !prize) {
            return NextResponse.json({ error: txt("src/app/api/lottery/route.ts::002", "\u05D7\u05E1\u05E8\u05D9\u05DD \u05E9\u05D3\u05D5\u05EA \u05D7\u05D5\u05D1\u05D4") }, { status: 400 });
        }
        // חישוב מעצבות זכאיות
        const [year, m] = month.split("-");
        const startOfMonth = new Date(`${year}-${m}-01`);
        const endOfMonth = new Date(Number(m) === 12
            ? `${Number(year) + 1}-01-01`
            : `${year}-${String(Number(m) + 1).padStart(2, "0")}-01`);
        const eligibleDesigners = await prisma.designer.findMany({
            where: {
                isActive: true,
                deals: {
                    some: {
                        reportedAt: { gte: startOfMonth, lt: endOfMonth },
                        ...(minDealAmount ? { amount: { gte: Number(minDealAmount) } } : {}),
                    },
                },
            },
            select: { id: true },
        });
        const lottery = await prisma.lottery.create({
            data: {
                month,
                prize,
                prizeValue: prizeValue ? Number(prizeValue) : null,
                minDealAmount: minDealAmount ? Number(minDealAmount) : null,
                minDealCount: minDealCount ? Number(minDealCount) : null,
                eligibleDesigners: eligibleDesigners.map((d) => d.id),
                status: "PREPARING",
            },
        });
        return NextResponse.json({ success: true, lottery }, { status: 201 });
    }
    catch (error) {
        console.error("Lottery create error:", error);
        return NextResponse.json({ error: txt("src/app/api/lottery/route.ts::003", "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D9\u05E6\u05D9\u05E8\u05EA \u05D4\u05D2\u05E8\u05DC\u05D4") }, { status: 500 });
    }
}

// PATCH /api/lottery — ביצוע הגרלה
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, action, winnerId } = body;
        if (!id || !action) {
            return NextResponse.json({ error: txt("src/app/api/lottery/route.ts::004", "\u05D7\u05E1\u05E8\u05D9\u05DD \u05E9\u05D3\u05D5\u05EA \u05D7\u05D5\u05D1\u05D4") }, { status: 400 });
        }
        if (action === "draw") {
            const lottery = await prisma.lottery.findUnique({ where: { id } });
            if (!lottery) {
                return NextResponse.json({ error: txt("src/app/api/lottery/route.ts::005", "\u05D4\u05D2\u05E8\u05DC\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4") }, { status: 404 });
            }
            // בחירת זוכה אקראי
            const eligible = lottery.eligibleDesigners;
            if (eligible.length === 0) {
                return NextResponse.json({ error: txt("src/app/api/lottery/route.ts::006", "\u05D0\u05D9\u05DF \u05DE\u05E2\u05E6\u05D1\u05D5\u05EA \u05D6\u05DB\u05D0\u05D9\u05D5\u05EA") }, { status: 400 });
            }
            const selectedWinnerId = winnerId || eligible[Math.floor(Math.random() * eligible.length)];

            // יצירת רשומת זוכה + עדכון סטטוס ההגרלה
            await prisma.$transaction([
                prisma.lotteryWinner.create({
                    data: {
                        lotteryId: id,
                        designerId: selectedWinnerId,
                        rank: 1,
                    },
                }),
                prisma.lottery.update({
                    where: { id },
                    data: {
                        drawnAt: new Date(),
                        status: "DRAWN",
                    },
                }),
                prisma.designer.update({
                    where: { id: selectedWinnerId },
                    data: {
                        lotteryWinsTotal: { increment: 1 },
                    },
                }),
            ]);

            const winner = await prisma.designer.findUnique({
                where: { id: selectedWinnerId },
                select: { fullName: true, phone: true },
            });
            return NextResponse.json({
                success: true,
                winner: winner?.fullName,
                phone: winner?.phone,
            });
        }
        return NextResponse.json({ error: txt("src/app/api/lottery/route.ts::007", "\u05E4\u05E2\u05D5\u05DC\u05D4 \u05DC\u05D0 \u05DE\u05D6\u05D5\u05D4\u05D4") }, { status: 400 });
    }
    catch (error) {
        console.error("Lottery update error:", error);
        return NextResponse.json({ error: txt("src/app/api/lottery/route.ts::008", "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E2\u05D3\u05DB\u05D5\u05DF \u05D4\u05D4\u05D2\u05E8\u05DC\u05D4") }, { status: 500 });
    }
}
