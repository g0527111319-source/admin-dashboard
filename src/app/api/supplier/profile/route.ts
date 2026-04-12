import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/supplier/profile?id=<supplierId>
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get("id");
    if (!supplierId) {
      return NextResponse.json({ error: "חסר מזהה ספק" }, { status: 400 });
    }

    // Security: suppliers can only view their own profile, admins can view any
    const authenticatedUserId = req.headers.get("x-user-id");
    const userRole = req.headers.get("x-user-role");
    if (userRole !== "admin" && authenticatedUserId && supplierId !== authenticatedUserId) {
      return NextResponse.json({ error: "אין הרשאה לצפות בפרופיל של ספק אחר" }, { status: 403 });
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) {
      return NextResponse.json({ error: "ספק לא נמצא" }, { status: 404 });
    }

    // Calculate days left
    const now = new Date();
    const daysLeft = supplier.subscriptionEnd
      ? Math.max(0, Math.floor((new Date(supplier.subscriptionEnd).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    // Posts last month count
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const postsLastMonth = await prisma.post.count({
      where: {
        supplierId,
        createdAt: { gte: startOfLastMonth, lt: startOfMonth },
      },
    });

    const supplierData = {
      name: supplier.name,
      contactName: supplier.contactName,
      phone: supplier.phone,
      email: supplier.email || "",
      website: supplier.website || "",
      city: supplier.city || "",
      category: supplier.category,
      description: supplier.description || "",
      subscriptionEnd: supplier.subscriptionEnd
        ? new Date(supplier.subscriptionEnd).toISOString().split("T")[0]
        : "",
      daysLeft,
      paymentStatus: supplier.paymentStatus,
      postsThisMonth: supplier.postsThisMonth,
      postsLastMonth,
      totalDeals: supplier.totalDeals,
      totalDealAmount: supplier.totalDealAmount,
      averageRating: supplier.averageRating,
      ratingCount: supplier.ratingCount,
      supplierLogo: supplier.logo || "",
      isVerified: supplier.approvalStatus === "APPROVED",
    };

    // Recent posts
    const posts = await prisma.post.findMany({
      where: { supplierId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    const recentPosts = posts.map((p) => ({
      id: p.id,
      caption: p.caption || "",
      status: p.status,
      date: p.createdAt
        ? new Date(p.createdAt).toLocaleDateString("he-IL")
        : "",
      time: p.scheduledTime || "",
      imageUrl: p.imageUrl || null,
      rejectionReason: p.rejectionReason || undefined,
    }));

    // Recent deals
    const deals = await prisma.deal.findMany({
      where: { supplierId },
      include: {
        designer: { select: { fullName: true } },
      },
      orderBy: { reportedAt: "desc" },
      take: 10,
    });
    const recentDeals = deals.map((d) => {
      // Create initials from designer name
      const parts = (d.designer?.fullName || "").split(" ");
      const initials = parts.length >= 2
        ? `${parts[0][0]}. ${parts[1][0]}.`
        : parts[0]?.[0] ? `${parts[0][0]}.` : "";
      return {
        id: d.id,
        designerInitial: initials,
        amount: d.amount,
        date: d.reportedAt
          ? new Date(d.reportedAt).toLocaleDateString("he-IL")
          : "",
        confirmed: d.supplierConfirmed,
      };
    });

    // Recommenders
    const recommenders = await prisma.supplierRecommender.findMany({
      where: { supplierId },
      select: { id: true, name: true, phone: true },
    });

    return NextResponse.json({
      supplierData,
      recentPosts,
      recentDeals,
      recommenders,
    });
  } catch (error) {
    console.error("Supplier profile error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת פרופיל ספק" },
      { status: 500 }
    );
  }
}
