import { txt } from "@/content/siteText";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth";
export const dynamic = "force-dynamic";
// GET /api/admin/stats — סטטיסטיקות דשבורד
export async function GET(req: NextRequest) {
    const auth = requireRole(req, ADMIN_ONLY);
    if (!auth.ok) return auth.response;
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        // ספירות בסיסיות
        const [activeSuppliers, totalDesigners, pendingPosts, monthlyDeals, overdueSuppliers, upcomingEvents,] = await Promise.all([
            prisma.supplier.count({ where: { isActive: true } }),
            prisma.designer.count({ where: { isActive: true } }),
            prisma.post.count({ where: { status: "PENDING" } }),
            prisma.deal.count({
                where: { reportedAt: { gte: startOfMonth } },
            }),
            prisma.supplier.count({
                where: { paymentStatus: "OVERDUE", isActive: true },
            }),
            prisma.event.count({
                where: { date: { gte: now }, status: "OPEN" },
            }),
        ]);
        // סכום עסקאות החודש
        const monthlyDealsAgg = await prisma.deal.aggregate({
            where: { reportedAt: { gte: startOfMonth } },
            _sum: { amount: true },
        });
        // הכנסות חודשיות מספקים
        const monthlyRevenueAgg = await prisma.supplier.aggregate({
            where: { isActive: true, paymentStatus: "PAID" },
            _sum: { monthlyFee: true },
        });
        // חוזים שמסתיימים בקרוב (30 יום)
        const expiringIn30 = await prisma.supplier.count({
            where: {
                isActive: true,
                subscriptionEnd: {
                    gte: now,
                    lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
                },
            },
        });
        return NextResponse.json({
            activeSuppliers,
            totalDesigners,
            pendingPosts,
            monthlyDeals,
            monthlyDealAmount: monthlyDealsAgg._sum.amount || 0,
            overdueSuppliers,
            upcomingEvents,
            expiringSubscriptions: expiringIn30,
            monthlyRevenue: monthlyRevenueAgg._sum.monthlyFee || 0,
        });
    }
    catch (error) {
        console.error("Admin stats error:", error);
        return NextResponse.json({ error: txt("src/app/api/admin/stats/route.ts::001", "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05E1\u05D8\u05D8\u05D9\u05E1\u05D8\u05D9\u05E7\u05D5\u05EA") }, { status: 500 });
    }
}
