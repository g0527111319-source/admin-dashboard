import { txt } from "@/content/siteText";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
export const dynamic = "force-dynamic";
// GET /api/posts — רשימת פרסומים
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");
        const supplierId = searchParams.get("supplierId");
        const where: Record<string, unknown> = {};
        if (status && !["ALL", "__ALL__", "all", txt("src/app/api/posts/route.ts::001", "\u05D4\u05DB\u05DC")].includes(status))
            where.status = status;
        if (supplierId)
            where.supplierId = supplierId;
        const posts = await prisma.post.findMany({
            where,
            include: {
                supplier: {
                    select: { name: true, logo: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(posts);
    }
    catch (error) {
        console.error("Posts fetch error:", error);
        return NextResponse.json({ error: txt("src/app/api/posts/route.ts::002", "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05E4\u05E8\u05E1\u05D5\u05DE\u05D9\u05DD") }, { status: 500 });
    }
}
// PATCH /api/posts — עדכון סטטוס פרסום (אישור/דחייה)
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, action, rejectionReason, approvedBy } = body;
        if (!id || !action) {
            return NextResponse.json({ error: txt("src/app/api/posts/route.ts::003", "\u05D7\u05E1\u05E8\u05D9\u05DD \u05E9\u05D3\u05D5\u05EA \u05D7\u05D5\u05D1\u05D4") }, { status: 400 });
        }
        const post = await prisma.post.findUnique({
            where: { id },
            include: { supplier: true },
        });
        if (!post) {
            return NextResponse.json({ error: txt("src/app/api/posts/route.ts::004", "\u05E4\u05E8\u05E1\u05D5\u05DD \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0") }, { status: 404 });
        }
        if (action === "approve") {
            await prisma.post.update({
                where: { id },
                data: {
                    status: "APPROVED",
                    approvedBy: approvedBy || txt("src/app/api/posts/route.ts::005", "\u05EA\u05DE\u05E8"),
                },
            });
            // עדכון מספר פרסומים של הספק
            await prisma.supplier.update({
                where: { id: post.supplierId },
                data: {
                    postsThisMonth: { increment: 1 },
                    totalPosts: { increment: 1 },
                },
            });
            // TODO: שלח WhatsApp לספק
        }
        else if (action === "reject") {
            await prisma.post.update({
                where: { id },
                data: {
                    status: "REJECTED",
                    rejectionReason: rejectionReason || null,
                },
            });
            // TODO: שלח WhatsApp לספק עם סיבת הדחייה
        }
        else if (action === "publish") {
            await prisma.post.update({
                where: { id },
                data: {
                    status: "PUBLISHED",
                    publishedAt: new Date(),
                },
            });
        }
        return NextResponse.json({ success: true });
    }
    catch (error) {
        console.error("Post update error:", error);
        return NextResponse.json({ error: txt("src/app/api/posts/route.ts::006", "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E2\u05D3\u05DB\u05D5\u05DF \u05D4\u05E4\u05E8\u05E1\u05D5\u05DD") }, { status: 500 });
    }
}
