export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/supplier/insights?supplierId=... (optional; otherwise from header)
 *
 * Lightweight "how am I doing" dashboard for suppliers. Everything is
 * computed server-side from data the supplier already owns:
 *  - Posts: counts by status in the last 30d vs prior 30d
 *  - Deals: total deals + confirmed + avg amount
 *  - Rating: average + how many rated
 *  - Best performing time-slots (most approvals per slot in last 90d)
 *  - Next scheduled posts (upcoming 7 days)
 *
 * No cross-supplier leakage: every query filters by supplierId.
 */

export async function GET(req: NextRequest) {
  try {
    const headerSupplier = req.headers.get("x-supplier-id");
    const querySupplier = new URL(req.url).searchParams.get("supplierId");
    const supplierId = headerSupplier || querySupplier;
    if (!supplierId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const now = new Date();
    const thirtyAgo = new Date(now.getTime() - 30 * 86400_000);
    const sixtyAgo = new Date(now.getTime() - 60 * 86400_000);
    const ninetyAgo = new Date(now.getTime() - 90 * 86400_000);
    const sevenAhead = new Date(now.getTime() + 7 * 86400_000);

    const [
      supplier,
      postsLast30,
      postsPrev30,
      dealsLast30,
      avgDeal,
      deals,
      upcomingPosts,
      topSlots,
    ] = await Promise.all([
      prisma.supplier.findUnique({
        where: { id: supplierId },
        select: {
          id: true,
          name: true,
          averageRating: true,
          ratingCount: true,
          totalPosts: true,
          totalDeals: true,
          totalDealAmount: true,
        },
      }),
      prisma.post.groupBy({
        by: ["status"],
        where: { supplierId, createdAt: { gte: thirtyAgo } },
        _count: { _all: true },
      }),
      prisma.post.groupBy({
        by: ["status"],
        where: {
          supplierId,
          createdAt: { gte: sixtyAgo, lt: thirtyAgo },
        },
        _count: { _all: true },
      }),
      prisma.deal.count({
        where: { supplierId, reportedAt: { gte: thirtyAgo } },
      }),
      prisma.deal.aggregate({
        where: { supplierId, reportedAt: { gte: thirtyAgo } },
        _avg: { amount: true },
      }),
      prisma.deal.findMany({
        where: { supplierId, reportedAt: { gte: thirtyAgo } },
        orderBy: { reportedAt: "desc" },
        take: 10,
        select: {
          id: true,
          amount: true,
          rating: true,
          dealDate: true,
          reportedAt: true,
          supplierConfirmed: true,
        },
      }),
      prisma.post.findMany({
        where: {
          supplierId,
          status: { in: ["APPROVED", "PENDING"] },
          scheduledDate: { gte: now, lte: sevenAhead },
        },
        orderBy: { scheduledDate: "asc" },
        take: 10,
        select: {
          id: true,
          status: true,
          scheduledDate: true,
          scheduledTime: true,
          caption: true,
          imageUrl: true,
        },
      }),
      prisma.post.groupBy({
        by: ["scheduledTime"],
        where: {
          supplierId,
          status: "APPROVED",
          scheduledDate: { gte: ninetyAgo },
        },
        _count: { _all: true },
      }),
    ]);

    if (!supplier) {
      return NextResponse.json({ error: "ספק לא נמצא" }, { status: 404 });
    }

    const sumGroup = (
      g: Array<{ status: string; _count: { _all: number } }>
    ) => g.reduce((a, x) => a + x._count._all, 0);
    const byStatus = (
      g: Array<{ status: string; _count: { _all: number } }>
    ) =>
      g.reduce(
        (acc, x) => {
          acc[x.status] = x._count._all;
          return acc;
        },
        {} as Record<string, number>
      );

    const last30Total = sumGroup(postsLast30);
    const prev30Total = sumGroup(postsPrev30);
    const last30Status = byStatus(postsLast30);
    const prev30Status = byStatus(postsPrev30);

    const approvalRate =
      last30Total > 0
        ? Math.round(((last30Status.APPROVED ?? 0) / last30Total) * 100)
        : 0;
    const prevApprovalRate =
      prev30Total > 0
        ? Math.round(((prev30Status.APPROVED ?? 0) / prev30Total) * 100)
        : 0;

    const topSlot = topSlots
      .filter((s) => s.scheduledTime)
      .sort((a, b) => b._count._all - a._count._all)[0];

    // Simple tips derived from the data
    const tips: string[] = [];
    if (approvalRate < 50 && last30Total > 0) {
      tips.push(
        "שיעור האישור שלך ב-30 הימים האחרונים נמוך מ-50%. מומלץ לצרף תמונות איכותיות ולוודא כיתוב ברור."
      );
    }
    if (last30Total < prev30Total * 0.7 && prev30Total > 2) {
      tips.push(
        "פחות פוסטים מהחודש הקודם — שקלי להשתמש בתזמון מרובה כדי לשמור על רציפות."
      );
    }
    if (supplier.averageRating < 4 && supplier.ratingCount >= 3) {
      tips.push(
        "הדירוג הממוצע מתחת ל-4. בקשי מלקוחות מרוצים להשאיר דירוג חיובי."
      );
    }
    if (topSlot && topSlots.length > 1) {
      tips.push(
        `השעה ${topSlot.scheduledTime} מניבה את שיעור האישור הגבוה ביותר — כדאי להעדיף אותה.`
      );
    }

    return NextResponse.json({
      supplier: {
        id: supplier.id,
        name: supplier.name,
        averageRating: supplier.averageRating,
        ratingCount: supplier.ratingCount,
      },
      posts: {
        last30: { total: last30Total, ...last30Status },
        prev30: { total: prev30Total, ...prev30Status },
        approvalRate,
        prevApprovalRate,
        approvalDiff: approvalRate - prevApprovalRate,
      },
      deals: {
        last30Count: dealsLast30,
        last30AvgAmount: avgDeal._avg.amount || 0,
        totalAmount: supplier.totalDealAmount,
        recent: deals,
      },
      topSlot: topSlot
        ? { time: topSlot.scheduledTime, approvals: topSlot._count._all }
        : null,
      upcomingPosts,
      tips,
    });
  } catch (error) {
    console.error("supplier insights error:", error);
    return NextResponse.json({ error: "שגיאת טעינה" }, { status: 500 });
  }
}
