import { txt } from "@/content/siteText";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
export const dynamic = "force-dynamic";
// GET /api/ratings — דירוגים אנונימיים
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const supplierId = searchParams.get("supplierId");
        const where: Record<string, unknown> = {};
        if (supplierId)
            where.supplierId = supplierId;
        // כל הדירוגים (מעסקאות)
        const deals = await prisma.deal.findMany({
            where: {
                ...where,
                rating: { not: null },
            },
            include: {
                supplier: { select: { name: true } },
                designer: { select: { fullName: true } },
            },
            orderBy: { reportedAt: "desc" },
        });
        // ממוצע דירוג לכל ספק
        const supplierAverages = await prisma.supplier.findMany({
            where: { isActive: true, ratingCount: { gt: 0 } },
            select: {
                id: true,
                name: true,
                averageRating: true,
                ratingCount: true,
            },
            orderBy: { averageRating: "desc" },
        });
        // המרה לפורמט אנונימי
        const anonymizedRatings = deals.map((d) => {
            const nameParts = d.designer.fullName.split(" ");
            const initials = nameParts
                .map((p) => p[0] + ".")
                .join("");
            return {
                id: d.id,
                supplierName: d.supplier.name,
                designerInitials: initials,
                rating: d.rating,
                text: d.ratingText,
                date: d.reportedAt,
                dealAmount: d.amount,
            };
        });
        return NextResponse.json({
            ratings: anonymizedRatings,
            supplierAverages,
        });
    }
    catch (error) {
        console.error("Ratings fetch error:", error);
        return NextResponse.json({ error: txt("src/app/api/ratings/route.ts::001", "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05D3\u05D9\u05E8\u05D5\u05D2\u05D9\u05DD") }, { status: 500 });
    }
}
