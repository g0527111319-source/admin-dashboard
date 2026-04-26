import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const HEBREW_MONTHS = ["ינו׳","פבר׳","מרץ","אפר׳","מאי","יוני","יולי","אוג׳","ספט׳","אוק׳","נוב׳","דצמ׳"];

// GET /api/admin/reports — aggregated report data for charts
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const lastYear = currentYear - 1;
    const startOfYear = new Date(currentYear, 0, 1);
    const startOfLastYear = new Date(lastYear, 0, 1);
    const endOfLastYear = new Date(currentYear, 0, 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // 1. Deals grouped by month (current year)
    const allDealsThisYear = await prisma.deal.findMany({
      where: { reportedAt: { gte: startOfYear } },
      select: { amount: true, reportedAt: true, rating: true },
    });

    const dealsMonthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: HEBREW_MONTHS[i],
      deals: 0,
      revenue: 0,
    }));
    for (const deal of allDealsThisYear) {
      const m = new Date(deal.reportedAt).getMonth();
      dealsMonthlyData[m].deals += 1;
      dealsMonthlyData[m].revenue += deal.amount || 0;
    }

    // Deals last year for YoY
    const allDealsLastYear = await prisma.deal.findMany({
      where: { reportedAt: { gte: startOfLastYear, lt: endOfLastYear } },
      select: { amount: true, reportedAt: true },
    });
    const lastYearDeals = Array.from({ length: 12 }, (_, i) => ({
      month: HEBREW_MONTHS[i],
      deals: 0,
      revenue: 0,
    }));
    for (const deal of allDealsLastYear) {
      const m = new Date(deal.reportedAt).getMonth();
      lastYearDeals[m].deals += 1;
      lastYearDeals[m].revenue += deal.amount || 0;
    }

    // 2. Deals by supplier category
    const dealsWithSupplier = await prisma.deal.findMany({
      where: { reportedAt: { gte: startOfYear } },
      select: { amount: true, supplier: { select: { category: true } } },
    });
    const categoryMap: Record<string, number> = {};
    for (const d of dealsWithSupplier) {
      const cat = d.supplier?.category || "אחר";
      categoryMap[cat] = (categoryMap[cat] || 0) + (d.amount || 0);
    }
    const dealsByCategoryData = Object.entries(categoryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // 3. Posts grouped by month (last 6 months)
    const allPostsRecent = await prisma.post.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { status: true, createdAt: true },
    });
    const postsMonthlyMap: Record<string, { published: number; pending: number; rejected: number }> = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      postsMonthlyMap[key] = { published: 0, pending: 0, rejected: 0 };
    }
    for (const post of allPostsRecent) {
      const d = new Date(post.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (postsMonthlyMap[key]) {
        if (post.status === "PUBLISHED") postsMonthlyMap[key].published += 1;
        else if (post.status === "PENDING") postsMonthlyMap[key].pending += 1;
        else if (post.status === "REJECTED") postsMonthlyMap[key].rejected += 1;
        else if (post.status === "APPROVED") postsMonthlyMap[key].published += 1;
      }
    }
    const postsMonthlyData = Object.entries(postsMonthlyMap).map(([key, val]) => {
      const [, monthIdx] = key.split("-").map(Number);
      return { month: HEBREW_MONTHS[monthIdx], ...val };
    });

    // 4. Payments by month (supplier revenue) - last 6 months
    const activeSuppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      select: { monthlyFee: true, paymentStatus: true, lastPaymentDate: true },
    });
    const paymentsMonthlyData = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      let paid = 0, overdue = 0, pending = 0;
      for (const s of activeSuppliers) {
        const fee = s.monthlyFee || 0;
        if (s.paymentStatus === "PAID") paid += fee;
        else if (s.paymentStatus === "OVERDUE") overdue += fee;
        else pending += fee;
      }
      paymentsMonthlyData.push({
        month: HEBREW_MONTHS[d.getMonth()],
        paid: Math.round(paid),
        overdue: Math.round(overdue),
        pending: Math.round(pending),
      });
    }

    // 5. Rating distribution
    const ratingDistData = [
      { rating: "5", count: 0 },
      { rating: "4", count: 0 },
      { rating: "3", count: 0 },
      { rating: "2", count: 0 },
      { rating: "1", count: 0 },
    ];
    for (const deal of allDealsThisYear) {
      if (deal.rating && deal.rating >= 1 && deal.rating <= 5) {
        ratingDistData[5 - deal.rating].count += 1;
      }
    }

    // 6. Pending deals (not confirmed by supplier)
    const pendingDealsRaw = await prisma.deal.findMany({
      where: { supplierConfirmed: false },
      include: {
        designer: { select: { fullName: true } },
        supplier: { select: { name: true, category: true } },
      },
      orderBy: { reportedAt: "desc" },
      take: 20,
    });
    const pendingDeals = pendingDealsRaw.map((d) => ({
      id: d.id,
      designerName: d.designer?.fullName || "",
      supplierName: d.supplier?.name || "",
      amount: d.amount,
      category: d.supplier?.category || "",
      date: d.reportedAt ? new Date(d.reportedAt).toISOString().split("T")[0] : "",
      description: d.description || "",
      flags: d.amount > 50000 ? ["סכום חריג — מעל 50K ש״ח"] : [],
    }));

    // 7. Top 5 suppliers and designers
    const topSuppliers = await prisma.deal.groupBy({
      by: ["supplierId"],
      where: { reportedAt: { gte: startOfYear } },
      _count: { id: true },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    });
    const supplierIds = topSuppliers.map((s) => s.supplierId);
    const supplierNames = await prisma.supplier.findMany({
      where: { id: { in: supplierIds } },
      select: { id: true, name: true },
    });
    const supplierNameMap = Object.fromEntries(supplierNames.map((s) => [s.id, s.name]));
    const top5Suppliers = topSuppliers.map((s) => ({
      name: supplierNameMap[s.supplierId] || "",
      deals: s._count.id,
      amount: s._sum.amount || 0,
    }));

    const topDesigners = await prisma.deal.groupBy({
      by: ["designerId"],
      where: { reportedAt: { gte: startOfYear } },
      _count: { id: true },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    });
    const designerIds = topDesigners.map((d) => d.designerId);
    const designerNames = await prisma.designer.findMany({
      where: { id: { in: designerIds } },
      select: { id: true, fullName: true },
    });
    const designerNameMap = Object.fromEntries(designerNames.map((d) => [d.id, d.fullName]));
    const top5Designers = topDesigners.map((d) => ({
      name: designerNameMap[d.designerId] || "",
      deals: d._count.id,
      amount: d._sum.amount || 0,
    }));

    // 8. Overdue suppliers
    const overdueSuppliers = await prisma.supplier.findMany({
      where: { paymentStatus: "OVERDUE", isActive: true },
      select: { name: true, monthlyFee: true, lastPaymentDate: true },
      take: 10,
    });
    const overdueList = overdueSuppliers.map((s) => {
      const daysSincePayment = s.lastPaymentDate
        ? Math.floor((now.getTime() - new Date(s.lastPaymentDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      return {
        name: s.name,
        debt: s.monthlyFee || 0,
        days: daysSincePayment,
        lastPayment: s.lastPaymentDate
          ? new Date(s.lastPaymentDate).toLocaleDateString("he-IL")
          : "",
      };
    });

    // Summary KPIs
    const totalDeals = allDealsThisYear.length;
    const totalRevenue = allDealsThisYear.reduce((s, d) => s + (d.amount || 0), 0);
    const currentMonthDeals = allDealsThisYear.filter(
      (d) => new Date(d.reportedAt) >= startOfMonth
    );
    const monthDeals = currentMonthDeals.length;
    const monthRevenue = currentMonthDeals.reduce((s, d) => s + (d.amount || 0), 0);
    const avgDeal = totalDeals > 0 ? Math.round(totalRevenue / totalDeals) : 0;
    const totalDealsLastYear = allDealsLastYear.length;
    const totalRevenueLastYear = allDealsLastYear.reduce((s, d) => s + (d.amount || 0), 0);
    const dealGrowth = totalDealsLastYear > 0
      ? Math.round(((totalDeals - totalDealsLastYear) / totalDealsLastYear) * 100)
      : 0;
    const revenueGrowth = totalRevenueLastYear > 0
      ? Math.round(((totalRevenue - totalRevenueLastYear) / totalRevenueLastYear) * 100)
      : 0;

    // Post KPIs
    const totalPostsPublished = await prisma.post.count({
      where: { status: { in: ["PUBLISHED", "APPROVED"] }, createdAt: { gte: startOfYear } },
    });
    const pendingPostsCount = await prisma.post.count({ where: { status: "PENDING" } });
    const rejectedPostsCount = await prisma.post.count({
      where: { status: "REJECTED", createdAt: { gte: startOfYear } },
    });
    const postsThisMonth = await prisma.post.count({
      where: { status: { in: ["PUBLISHED", "APPROVED"] }, createdAt: { gte: startOfMonth } },
    });
    const totalPostsAll = totalPostsPublished + rejectedPostsCount + pendingPostsCount;
    const approvalRate = totalPostsAll > 0
      ? Math.round((totalPostsPublished / totalPostsAll) * 100)
      : 0;

    // Top posting suppliers
    const topPostingSuppliers = await prisma.post.groupBy({
      by: ["supplierId"],
      where: { createdAt: { gte: startOfYear } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    });
    const postSupplierIds = topPostingSuppliers.map((s) => s.supplierId);
    const postSupplierInfo = await prisma.supplier.findMany({
      where: { id: { in: postSupplierIds } },
      select: { id: true, name: true },
    });
    const postSupplierNameMap = Object.fromEntries(postSupplierInfo.map((s) => [s.id, s.name]));

    // Approval rate per supplier (approximate)
    const topPostingWithApproval = [];
    for (const ts of topPostingSuppliers) {
      const approvedCount = await prisma.post.count({
        where: { supplierId: ts.supplierId, status: { in: ["PUBLISHED", "APPROVED"] }, createdAt: { gte: startOfYear } },
      });
      const totalCount = ts._count.id;
      topPostingWithApproval.push({
        name: postSupplierNameMap[ts.supplierId] || "",
        posts: totalCount,
        approval: totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0,
      });
    }

    // Monthly revenue from supplier fees
    const monthlyFeeRevenue = await prisma.supplier.aggregate({
      where: { isActive: true, paymentStatus: "PAID" },
      _sum: { monthlyFee: true },
    });

    return NextResponse.json({
      dealsMonthlyData,
      lastYearDeals,
      dealsByCategoryData,
      postsMonthlyData,
      paymentsMonthlyData,
      ratingDistData: ratingDistData.map((r) => ({
        ...r,
        rating: `${"*".repeat(Number(r.rating))} ${r.rating}`,
      })),
      pendingDeals,
      top5Suppliers,
      top5Designers,
      overdueList,
      kpi: {
        totalDeals,
        totalRevenue,
        monthDeals,
        monthRevenue,
        avgDeal,
        dealGrowth,
        revenueGrowth,
      },
      postKpi: {
        totalPostsPublished,
        pendingPostsCount,
        postsThisMonth,
        approvalRate,
      },
      topPostingSuppliers: topPostingWithApproval,
      paymentKpi: {
        monthlyRevenue: monthlyFeeRevenue._sum.monthlyFee || 0,
        paidCount: activeSuppliers.filter((s) => s.paymentStatus === "PAID").length,
        overdueCount: activeSuppliers.filter((s) => s.paymentStatus === "OVERDUE").length,
      },
    });
  } catch (error) {
    console.error("Admin reports error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת נתוני דוחות" },
      { status: 500 }
    );
  }
}
