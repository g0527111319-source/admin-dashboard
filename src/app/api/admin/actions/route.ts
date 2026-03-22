import { txt } from "@/content/siteText";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
export const dynamic = "force-dynamic";
// GET /api/admin/actions — פריטים דורשי טיפול
export async function GET() {
    try {
        const now = new Date();
        const actions = [];
        // ספקים באיחור תשלום
        const overdueSuppliers = await prisma.supplier.findMany({
            where: { paymentStatus: "OVERDUE", isActive: true },
            select: { id: true, name: true, lastPaymentDate: true },
        });
        for (const s of overdueSuppliers) {
            const daysOverdue = s.lastPaymentDate
                ? Math.floor((now.getTime() - s.lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24))
                : 0;
            actions.push({
                id: `overdue-${s.id}`,
                type: "payment",
                title: `תשלום באיחור — ${s.name}`,
                description: `${daysOverdue} ימי איחור בתשלום חודשי`,
                urgency: daysOverdue > 30 ? "high" : "medium",
                link: "/admin/suppliers",
            });
        }
        // פרסומים ממתינים
        const pendingPostsCount = await prisma.post.count({ where: { status: "PENDING" } });
        if (pendingPostsCount > 0) {
            actions.push({
                id: "pending-posts",
                type: "post",
                title: `${pendingPostsCount} פרסומים ממתינים לאישור`,
                description: txt("src/app/api/admin/actions/route.ts::001", "\u05D9\u05E9 \u05DC\u05D0\u05E9\u05E8 \u05D0\u05D5 \u05DC\u05D3\u05D7\u05D5\u05EA \u05E4\u05E8\u05E1\u05D5\u05DE\u05D9\u05DD"),
                urgency: "high" as const,
                link: "/admin/posts",
            });
        }
        // ספקים ללא פרסום 14+ ימים
        const inactiveSuppliers = await prisma.supplier.count({
            where: {
                isActive: true,
                postsThisMonth: 0,
            },
        });
        if (inactiveSuppliers > 0) {
            actions.push({
                id: "inactive-suppliers",
                type: "inactive",
                title: txt("src/app/api/admin/actions/route.ts::002", "\u05E1\u05E4\u05E7\u05D9\u05DD \u05DC\u05D0 \u05E4\u05E2\u05D9\u05DC\u05D9\u05DD"),
                description: `${inactiveSuppliers} ספקים ללא פרסום החודש`,
                urgency: "medium" as const,
                link: "/admin/suppliers",
            });
        }
        // חוזים שמסתיימים בקרוב
        const expiringSuppliers = await prisma.supplier.findMany({
            where: {
                isActive: true,
                subscriptionEnd: {
                    gte: now,
                    lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
                },
            },
            select: { id: true, name: true, subscriptionEnd: true },
        });
        for (const s of expiringSuppliers) {
            const daysLeft = Math.ceil((s.subscriptionEnd!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            actions.push({
                id: `expiring-${s.id}`,
                type: "payment",
                title: `חוזה מסתיים בקרוב — ${s.name}`,
                description: `עוד ${daysLeft} ימים לתום החוזה`,
                urgency: daysLeft <= 7 ? "high" : "medium",
                link: "/admin/suppliers",
            });
        }
        // מיון לפי דחיפות
        const urgencyOrder = { high: 0, medium: 1, low: 2 };
        actions.sort((a, b) => urgencyOrder[a.urgency as keyof typeof urgencyOrder] - urgencyOrder[b.urgency as keyof typeof urgencyOrder]);
        return NextResponse.json(actions);
    }
    catch (error) {
        console.error("Admin actions error:", error);
        return NextResponse.json({ error: txt("src/app/api/admin/actions/route.ts::003", "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD") }, { status: 500 });
    }
}
