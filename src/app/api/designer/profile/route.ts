import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/designer/profile?id=<designerId>
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const designerId = searchParams.get("id");
    if (!designerId) {
      return NextResponse.json({ error: "חסר מזהה מעצב/ת" }, { status: 400 });
    }

    // Security: designers can only view their own profile, admins can view any
    const authenticatedUserId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    if (userRole !== "admin" && authenticatedUserId && designerId !== authenticatedUserId) {
      return NextResponse.json({ error: "אין הרשאה לצפות בפרופיל של מעצב/ת אחר/ת" }, { status: 403 });
    }

    const designer = await prisma.designer.findUnique({
      where: { id: designerId },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        city: true,
        area: true,
        specialization: true,
        yearsExperience: true,
        instagram: true,
        website: true,
        joinDate: true,
        totalDealsReported: true,
        totalDealAmount: true,
        lotteryEntriesTotal: true,
        lotteryWinsTotal: true,
        eventsAttended: true,
      },
    });

    if (!designer) {
      return NextResponse.json({ error: "מעצב/ת לא נמצא/ה" }, { status: 404 });
    }

    // Rank - count how many designers have more deals
    const betterRank = await prisma.designer.count({
      where: {
        isActive: true,
        totalDealAmount: { gt: designer.totalDealAmount },
      },
    });
    const rank = betterRank + 1;

    // Deal history
    const deals = await prisma.deal.findMany({
      where: { designerId },
      include: {
        supplier: { select: { name: true } },
      },
      orderBy: { reportedAt: "desc" },
      take: 20,
    });
    const dealHistory = deals.map((d) => ({
      id: d.id,
      supplier: d.supplier?.name || "",
      amount: d.amount,
      date: d.reportedAt
        ? new Date(d.reportedAt).toLocaleDateString("he-IL")
        : "",
      status: d.supplierConfirmed ? "confirmed" : "pending",
      rating: d.rating,
    }));

    // Suppliers the designer has worked with (from deals)
    const supplierDeals = await prisma.deal.findMany({
      where: { designerId },
      select: { supplierId: true },
      distinct: ["supplierId"],
    });
    const workedWithIds = new Set(supplierDeals.map((d) => d.supplierId));

    // Get community suppliers (active)
    // Try with approvalStatus filter first; fall back if column not yet migrated
    let suppliers;
    try {
      suppliers = await prisma.supplier.findMany({
        where: { isActive: true, approvalStatus: "APPROVED" },
        select: {
          id: true,
          name: true,
          category: true,
          city: true,
          area: true,
          description: true,
          phone: true,
          email: true,
          contactName: true,
          averageRating: true,
          ratingCount: true,
          totalDeals: true,
          logo: true,
        },
        take: 50,
      });
    } catch {
      // approvalStatus column may not exist yet — fall back to isActive only
      suppliers = await prisma.supplier.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          category: true,
          city: true,
          area: true,
          description: true,
          phone: true,
          email: true,
          contactName: true,
          averageRating: true,
          ratingCount: true,
          totalDeals: true,
          logo: true,
        },
        take: 50,
      });
    }

    // Count recommendations per supplier
    const recCounts = await prisma.recommendation.groupBy({
      by: ["supplierId"],
      _count: { id: true },
    });
    const recCountMap = Object.fromEntries(
      recCounts.map((r) => [r.supplierId, r._count.id])
    );

    const supplierList = suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      city: s.city || "",
      area: s.area || "",
      description: s.description || "",
      phone: s.phone || "",
      email: s.email || "",
      contactPerson: s.contactName || "",
      address: "",
      areas: s.area ? [s.area] : [],
      averageRating: s.averageRating,
      ratingCount: s.ratingCount,
      recommendationCount: recCountMap[s.id] || 0,
      dealsCount: s.totalDeals,
      workedWithMe: workedWithIds.has(s.id),
      isCommunity: true,
      isVerified: true,
      logo: s.logo || "",
    }));

    // Format designer profile
    const profile = {
      designerLogo: "",
      fullName: designer.fullName,
      city: designer.city || "",
      area: designer.area || "",
      specialization: designer.specialization || "",
      yearsExperience: designer.yearsExperience || 0,
      instagram: designer.instagram || "",
      email: designer.email || "",
      phone: designer.phone || "",
      totalDeals: designer.totalDealsReported,
      totalDealAmount: designer.totalDealAmount,
      lotteryEntries: designer.lotteryEntriesTotal,
      lotteryWins: designer.lotteryWinsTotal,
      eventsAttended: designer.eventsAttended,
      joinDate: designer.joinDate
        ? new Date(designer.joinDate).toLocaleDateString("he-IL")
        : "",
      rank,
    };

    return NextResponse.json({
      profile,
      suppliers: supplierList,
      dealHistory,
    });
  } catch (error) {
    console.error("Designer profile error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת פרופיל" },
      { status: 500 }
    );
  }
}
