import { txt } from "@/content/siteText";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
export const dynamic = "force-dynamic";
// GET /api/deals — רשימת עסקאות
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const supplierId = searchParams.get("supplierId");
        const designerId = searchParams.get("designerId");
        const month = searchParams.get("month");
        const where: Record<string, unknown> = {};
        if (supplierId)
            where.supplierId = supplierId;
        if (designerId)
            where.designerId = designerId;
        if (month) {
            const [year, m] = month.split("-");
            where.reportedAt = {
                gte: new Date(`${year}-${m}-01`),
                lt: new Date(Number(m) === 12
                    ? `${Number(year) + 1}-01-01`
                    : `${year}-${String(Number(m) + 1).padStart(2, "0")}-01`),
            };
        }
        const deals = await prisma.deal.findMany({
            where,
            include: {
                supplier: { select: { name: true } },
                designer: { select: { fullName: true } },
            },
            orderBy: { reportedAt: "desc" },
        });
        return NextResponse.json(deals);
    }
    catch (error) {
        console.error("Deals fetch error:", error);
        return NextResponse.json({ error: txt("src/app/api/deals/route.ts::001", "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05E2\u05E1\u05E7\u05D0\u05D5\u05EA") }, { status: 500 });
    }
}
// POST /api/deals — דיווח עסקה חדשה
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { designerId, supplierId, amount, description, dealDate, rating, ratingText } = body;
        if (!designerId || !supplierId || !amount) {
            return NextResponse.json({ error: txt("src/app/api/deals/route.ts::002", "\u05D7\u05E1\u05E8\u05D9\u05DD \u05E9\u05D3\u05D5\u05EA \u05D7\u05D5\u05D1\u05D4") }, { status: 400 });
        }
        const deal = await prisma.deal.create({
            data: {
                designerId,
                supplierId,
                amount: Number(amount),
                description,
                dealDate: dealDate ? new Date(dealDate) : new Date(),
                rating: rating ? Number(rating) : null,
                ratingText: ratingText || null,
            },
        });
        // עדכון סטטיסטיקות מעצבת
        await prisma.designer.update({
            where: { id: designerId },
            data: {
                totalDealsReported: { increment: 1 },
                totalDealAmount: { increment: Number(amount) },
            },
        });
        // TODO: שליחת הודעת אישור לספק
        // const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
        // await sendMessage(supplier.phone, templates.dealConfirmation(designerName, amount));
        return NextResponse.json({ success: true, deal }, { status: 201 });
    }
    catch (error) {
        console.error("Deal create error:", error);
        return NextResponse.json({ error: txt("src/app/api/deals/route.ts::003", "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D9\u05E6\u05D9\u05E8\u05EA \u05E2\u05E1\u05E7\u05D4") }, { status: 500 });
    }
}
