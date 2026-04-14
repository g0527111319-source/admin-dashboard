import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/public/suppliers
 *
 * Returns a public, safe subset of suppliers for the marketing/showcase pages.
 * Only active + approved + non-hidden suppliers are listed, and only public
 * fields are returned (no phone/email/payment status/internal notes).
 *
 * Optional filters:
 *   ?category=קטגוריה
 *   ?limit=12
 *   ?featured=true  // only suppliers with gallery images + logo
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const featured = searchParams.get("featured") === "true";
    const limit = Math.min(Number(searchParams.get("limit") ?? 24), 48);

    const suppliers = await prisma.supplier.findMany({
      where: {
        isActive: true,
        isHidden: false,
        approvalStatus: "APPROVED",
        ...(category && { category }),
      },
      orderBy: [
        { averageRating: "desc" },
        { totalDeals: "desc" },
      ],
      take: limit * 2, // take extra for post-filter
      select: {
        id: true,
        name: true,
        category: true,
        city: true,
        area: true,
        description: true,
        logo: true,
        gallery: true,
        averageRating: true,
        ratingCount: true,
        totalDeals: true,
      },
    });

    const mapped = suppliers
      .filter((s) => {
        if (!featured) return true;
        return (s.logo || (s.gallery && s.gallery.length > 0));
      })
      .slice(0, limit)
      .map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        city: s.city ?? null,
        area: s.area ?? null,
        description: s.description ?? null,
        logoUrl: s.logo ?? null,
        coverImageUrl: s.gallery?.[0] ?? null,
        gallery: s.gallery ?? [],
        isCommunity: true,
        isVerified: s.ratingCount >= 3 || s.totalDeals >= 1,
        dealsCount: s.totalDeals,
        averageRating: s.averageRating,
      }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Public suppliers list error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת ספקים" },
      { status: 500 }
    );
  }
}
