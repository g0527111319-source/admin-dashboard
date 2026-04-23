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
        gender: true,
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
        firstName: true,
        lastName: true,
        idNumber: true,
        birthDate: true,
        hebrewBirthDate: true,
        whatsappPhone: true,
        callOnlyPhone: true,
        neighborhood: true,
        street: true,
        buildingNumber: true,
        apartmentNumber: true,
        floor: true,
        employmentType: true,
        yearsAsIndependent: true,
        workTypes: true,
        logoUrl: true,
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
        supplier: { select: { name: true, logo: true } },
      },
      orderBy: { reportedAt: "desc" },
      take: 20,
    });
    const dealHistory = deals.map((d) => ({
      id: d.id,
      supplier: d.supplier?.name || "",
      supplierLogo: d.supplier?.logo || null,
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
      designerLogo: designer.logoUrl || "",
      fullName: designer.fullName,
      gender: designer.gender || "female",
      city: designer.city || "",
      area: designer.area || "",
      specialization: designer.specialization || "",
      yearsExperience: designer.yearsExperience || 0,
      instagram: designer.instagram || "",
      email: designer.email || "",
      phone: designer.phone || "",
      firstName: designer.firstName || "",
      lastName: designer.lastName || "",
      idNumber: designer.idNumber || "",
      birthDate: designer.birthDate ? designer.birthDate.toISOString().split("T")[0] : "",
      hebrewBirthDate: designer.hebrewBirthDate || "",
      whatsappPhone: designer.whatsappPhone || "",
      callOnlyPhone: designer.callOnlyPhone || "",
      neighborhood: designer.neighborhood || "",
      street: designer.street || "",
      buildingNumber: designer.buildingNumber || "",
      apartmentNumber: designer.apartmentNumber || "",
      floor: designer.floor || "",
      employmentType: designer.employmentType || "FREELANCE",
      yearsAsIndependent: designer.yearsAsIndependent || 0,
      workTypes: designer.workTypes || [],
      website: designer.website || "",
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

// PUT /api/designer/profile
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "חסר מזהה מעצב/ת" }, { status: 400 });
    }

    // Build the update object - only include provided fields
    const update: Record<string, unknown> = {};

    // Personal
    if (updateData.firstName !== undefined) update.firstName = updateData.firstName;
    if (updateData.lastName !== undefined) update.lastName = updateData.lastName;
    if (updateData.firstName !== undefined && updateData.lastName !== undefined) {
      update.fullName = `${updateData.firstName} ${updateData.lastName}`.trim();
    }
    if (updateData.gender !== undefined) update.gender = updateData.gender;
    if (updateData.phone !== undefined) update.phone = updateData.phone;
    if (updateData.email !== undefined) update.email = updateData.email;
    if (updateData.idNumber !== undefined) update.idNumber = updateData.idNumber;
    if (updateData.birthDate !== undefined) {
      update.birthDate = updateData.birthDate ? new Date(updateData.birthDate) : null;
    }
    if (updateData.hebrewBirthDate !== undefined) update.hebrewBirthDate = updateData.hebrewBirthDate;
    if (updateData.whatsappPhone !== undefined) update.whatsappPhone = updateData.whatsappPhone;
    if (updateData.callOnlyPhone !== undefined) update.callOnlyPhone = updateData.callOnlyPhone;

    // Address
    if (updateData.city !== undefined) update.city = updateData.city;
    if (updateData.neighborhood !== undefined) update.neighborhood = updateData.neighborhood;
    if (updateData.street !== undefined) update.street = updateData.street;
    if (updateData.buildingNumber !== undefined) update.buildingNumber = updateData.buildingNumber;
    if (updateData.apartmentNumber !== undefined) update.apartmentNumber = updateData.apartmentNumber;
    if (updateData.floor !== undefined) update.floor = updateData.floor;

    // Professional
    if (updateData.specialization !== undefined) update.specialization = updateData.specialization;
    if (updateData.employmentType !== undefined) update.employmentType = updateData.employmentType;
    if (updateData.yearsExperience !== undefined) update.yearsExperience = updateData.yearsExperience ? parseInt(updateData.yearsExperience) : null;
    if (updateData.yearsAsIndependent !== undefined) update.yearsAsIndependent = updateData.yearsAsIndependent ? parseInt(updateData.yearsAsIndependent) : null;
    if (updateData.workTypes !== undefined) update.workTypes = updateData.workTypes;

    // Social
    if (updateData.instagram !== undefined) update.instagram = updateData.instagram;
    if (updateData.website !== undefined) update.website = updateData.website;
    if (updateData.area !== undefined) update.area = updateData.area;

    // Logo / sticker — empty string treated as clearing (null)
    if (updateData.logoUrl !== undefined) {
      update.logoUrl = updateData.logoUrl === "" ? null : updateData.logoUrl;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "לא התקבלו שדות לעדכון" }, { status: 400 });
    }

    const designer = await prisma.designer.update({
      where: { id },
      data: update,
      select: { id: true, fullName: true, gender: true },
    });

    return NextResponse.json({ success: true, designer });
  } catch (error: unknown) {
    console.error("Profile update error:", error);
    const msg = error instanceof Error && error.message.includes("Unique constraint")
      ? "כתובת המייל כבר קיימת במערכת"
      : "שגיאה בעדכון הפרופיל";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
