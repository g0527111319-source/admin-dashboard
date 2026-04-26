export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth";

// GET /api/admin/dashboard — comprehensive dashboard data
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    // Basic counts
    const [
      activeSuppliers,
      totalDesigners,
      pendingPosts,
      monthlyDeals,
      overdueSuppliers,
      upcomingEvents,
      newDesignersThisMonth,
    ] = await Promise.all([
      prisma.supplier.count({ where: { isActive: true } }),
      prisma.designer.count({ where: { isActive: true } }),
      prisma.post.count({ where: { status: "PENDING" } }),
      prisma.deal.count({ where: { reportedAt: { gte: startOfMonth } } }),
      prisma.supplier.count({ where: { paymentStatus: "OVERDUE", isActive: true } }),
      prisma.event.count({ where: { date: { gte: now }, status: "OPEN" } }),
      prisma.designer.count({ where: { createdAt: { gte: startOfMonth }, isActive: true } }),
    ]);

    // Monthly deal amount
    const monthlyDealsAgg = await prisma.deal.aggregate({
      where: { reportedAt: { gte: startOfMonth } },
      _sum: { amount: true },
    });

    // Monthly revenue from suppliers
    const monthlyRevenueAgg = await prisma.supplier.aggregate({
      where: { isActive: true, paymentStatus: "PAID" },
      _sum: { monthlyFee: true },
    });

    // This week stats
    const [thisWeekDeals, thisWeekNewDesigners, thisWeekPosts, thisWeekEventRegs] = await Promise.all([
      prisma.deal.count({ where: { reportedAt: { gte: startOfWeek } } }),
      prisma.designer.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.post.count({ where: { status: "PUBLISHED", publishedAt: { gte: startOfWeek } } }),
      prisma.eventRegistration.count({ where: { registeredAt: { gte: startOfWeek } } }),
    ]);

    const thisWeekDealsAgg = await prisma.deal.aggregate({
      where: { reportedAt: { gte: startOfWeek } },
      _sum: { amount: true },
    });

    // Last week stats
    const [lastWeekDeals, lastWeekNewDesigners, lastWeekPosts, lastWeekEventRegs] = await Promise.all([
      prisma.deal.count({ where: { reportedAt: { gte: startOfLastWeek, lt: startOfWeek } } }),
      prisma.designer.count({ where: { createdAt: { gte: startOfLastWeek, lt: startOfWeek } } }),
      prisma.post.count({ where: { status: "PUBLISHED", publishedAt: { gte: startOfLastWeek, lt: startOfWeek } } }),
      prisma.eventRegistration.count({ where: { registeredAt: { gte: startOfLastWeek, lt: startOfWeek } } }),
    ]);

    const lastWeekDealsAgg = await prisma.deal.aggregate({
      where: { reportedAt: { gte: startOfLastWeek, lt: startOfWeek } },
      _sum: { amount: true },
    });

    // Revenue history (last 12 months) — using deal amounts per month
    const revenueHistory: { month: string; revenue: number }[] = [];
    const hebrewMonths = ["ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יוני", "יולי", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳"];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const agg = await prisma.deal.aggregate({
        where: { reportedAt: { gte: d, lt: dEnd } },
        _sum: { amount: true },
      });
      revenueHistory.push({
        month: hebrewMonths[d.getMonth()],
        revenue: agg._sum.amount || 0,
      });
    }

    // Recent deals for activity feed
    const recentDeals = await prisma.deal.findMany({
      take: 5,
      orderBy: { reportedAt: "desc" },
      include: {
        designer: { select: { fullName: true } },
        supplier: { select: { name: true } },
      },
    });

    // Recent posts
    const recentPosts = await prisma.post.findMany({
      take: 3,
      orderBy: { createdAt: "desc" },
      include: {
        supplier: { select: { name: true } },
      },
    });

    // Recent events
    const recentEvents = await prisma.event.findMany({
      where: { date: { gte: now }, status: "OPEN" },
      take: 3,
      orderBy: { date: "asc" },
      include: {
        _count: { select: { registrations: true } },
      },
    });

    // Low-rated suppliers
    const lowRatedSuppliers = await prisma.supplier.findMany({
      where: { isActive: true, averageRating: { lt: 3 }, ratingCount: { gt: 0 } },
      select: { name: true, averageRating: true, ratingCount: true },
      take: 3,
    });

    // Inactive suppliers (no posts in last 14 days)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const inactiveSuppliers = await prisma.supplier.findMany({
      where: {
        isActive: true,
        posts: { none: { createdAt: { gte: fourteenDaysAgo } } },
      },
      select: { name: true },
      take: 5,
    });

    // Build activity feed
    const recentActivity = recentDeals.map((d) => ({
      color: "bg-emerald-400",
      name: d.designer.fullName.split(" ").map((p) => p[0] + ".").join(""),
      text: `דיווחה עסקה עם ${d.supplier.name}`,
      time: formatRelativeTime(d.reportedAt),
    }));

    // Build dynamic alerts
    const alerts = [];
    if (pendingPosts > 0) {
      alerts.push({
        id: "pending-posts",
        type: "post_pending",
        title: `${pendingPosts} פרסומים ממתינים לאישור`,
        description: "דורשים סקירה",
        priority: "warning",
        time: "עכשיו",
        link: "/admin/posts",
      });
    }
    if (overdueSuppliers > 0) {
      alerts.push({
        id: "overdue",
        type: "payment",
        title: `${overdueSuppliers} ספקים עם תשלום באיחור`,
        description: "דורש טיפול",
        priority: "critical",
        time: "עכשיו",
        link: "/admin/suppliers",
      });
    }
    if (lowRatedSuppliers.length > 0) {
      for (const s of lowRatedSuppliers) {
        alerts.push({
          id: `low-rating-${s.name}`,
          type: "low_rating",
          title: `דירוג נמוך — ${s.name}`,
          description: `דירוג ${s.averageRating.toFixed(1)} מ-${s.ratingCount} מעצבות`,
          priority: "critical",
          time: "",
          link: "/admin/ratings",
        });
      }
    }
    if (inactiveSuppliers.length > 0) {
      alerts.push({
        id: "inactive",
        type: "inactive",
        title: `${inactiveSuppliers.length} ספקים לא פעילים 14+ ימים`,
        description: inactiveSuppliers.map((s) => s.name).join(", "),
        priority: "warning",
        time: "",
        link: "/admin/suppliers",
      });
    }
    if (newDesignersThisMonth > 0) {
      alerts.push({
        id: "new-designers",
        type: "milestone",
        title: `${totalDesigners.toLocaleString("he-IL")} מעצבות בקהילה`,
        description: `${newDesignersThisMonth} הצטרפו החודש`,
        priority: "success",
        time: "",
        link: "/admin/designers",
      });
    }

    // Upcoming events for sidebar
    const upcomingEventsData = recentEvents.map((e) => ({
      name: e.title,
      reg: `${e._count.registrations}/${e.maxAttendees || "?"}`,
      date: new Date(e.date).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" }),
      time: new Date(e.date).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }),
      full: e.maxAttendees ? e._count.registrations >= e.maxAttendees : false,
    }));

    return NextResponse.json({
      stats: {
        activeSuppliers,
        expiredSubscriptions: overdueSuppliers,
        pendingPosts,
        monthlyDeals,
        monthlyDealAmount: monthlyDealsAgg._sum.amount || 0,
        totalDesigners,
        upcomingEvents,
        monthlyRevenue: monthlyRevenueAgg._sum.monthlyFee || 0,
        activeThisWeek: thisWeekDeals + thisWeekNewDesigners + thisWeekPosts,
        newDesignersThisMonth,
      },
      revenueData: revenueHistory,
      thisWeek: {
        newDesigners: thisWeekNewDesigners,
        dealsCount: thisWeekDeals,
        revenue: thisWeekDealsAgg._sum.amount || 0,
        postsPublished: thisWeekPosts,
        eventRegistrations: thisWeekEventRegs,
        activeUsers: thisWeekDeals + thisWeekNewDesigners + thisWeekPosts,
      },
      lastWeek: {
        newDesigners: lastWeekNewDesigners,
        dealsCount: lastWeekDeals,
        revenue: lastWeekDealsAgg._sum.amount || 0,
        postsPublished: lastWeekPosts,
        eventRegistrations: lastWeekEventRegs,
        activeUsers: lastWeekDeals + lastWeekNewDesigners + lastWeekPosts,
      },
      alerts,
      recentActivity,
      upcomingEventsData,
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת נתוני דשבורד" }, { status: 500 });
  }
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `לפני ${diffMin} דקות`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `לפני ${diffHr} שעות`;
  const diffDays = Math.floor(diffHr / 24);
  return `לפני ${diffDays} ימים`;
}
