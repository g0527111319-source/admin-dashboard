import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Map city names to region IDs
const CITY_TO_REGION: Record<string, string> = {};
const AREA_TO_REGION: Record<string, string> = {
  "צפון": "north",
  "חיפה": "haifa",
  "שרון": "sharon",
  "תל אביב": "tel-aviv",
  "מרכז": "center",
  "שפלה": "shfela",
  "ירושלים": "jerusalem",
  "דרום": "south",
};

function resolveRegion(city?: string | null, area?: string | null): string {
  if (area && AREA_TO_REGION[area]) return AREA_TO_REGION[area];
  if (city && CITY_TO_REGION[city]) return CITY_TO_REGION[city];
  // Fallback heuristics for common cities
  if (city) {
    const c = city.trim();
    if (["תל אביב", "רמת גן", "גבעתיים", "בני ברק", "חולון", "בת ים"].includes(c)) return "tel-aviv";
    if (["חיפה", "קריות", "נשר", "טירת כרמל"].includes(c)) return "haifa";
    if (["הרצליה", "נתניה", "כפר סבא", "רעננה", "הוד השרון", "רמת השרון"].includes(c)) return "sharon";
    if (["ירושלים", "בית שמש", "מעלה אדומים", "מודיעין"].includes(c)) return "jerusalem";
    if (["ראשון לציון", "פתח תקווה", "לוד", "רמלה", "יהוד", "אור יהודה"].includes(c)) return "center";
    if (["אשקלון", "אשדוד", "רחובות", "נס ציונה", "גדרה"].includes(c)) return "shfela";
    if (["באר שבע", "אילת", "דימונה", "ערד"].includes(c)) return "south";
    if (["צפת", "טבריה", "עפולה", "נצרת", "כרמיאל", "עכו", "נהריה"].includes(c)) return "north";
  }
  return "center"; // default
}

function determineActivityLevel(totalDeals: number): "high" | "medium" | "low" {
  if (totalDeals >= 10) return "high";
  if (totalDeals >= 5) return "medium";
  return "low";
}

// GET /api/admin/map — designers with region mapping
export async function GET() {
  try {
    const rawDesigners = await prisma.designer.findMany({
      where: { isActive: true },
      select: {
        id: true,
        fullName: true,
        city: true,
        area: true,
        totalDealsReported: true,
        totalDealAmount: true,
      },
    });

    // Get average rating per designer from deals
    const dealRatings = await prisma.deal.groupBy({
      by: ["designerId"],
      _avg: { rating: true },
    });
    const ratingMap = Object.fromEntries(
      dealRatings.map((d) => [d.designerId, d._avg.rating ?? 0])
    );

    const designers = rawDesigners.map((d, idx) => ({
      id: idx + 1,
      dbId: d.id,
      name: d.fullName,
      region: resolveRegion(d.city, d.area),
      deals: d.totalDealsReported,
      dealAmount: d.totalDealAmount,
      rating: Math.round((ratingMap[d.id] || 0) * 10) / 10,
      activityLevel: determineActivityLevel(d.totalDealsReported),
    }));

    return NextResponse.json(designers);
  } catch (error) {
    console.error("Admin map error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת נתוני מפה" },
      { status: 500 }
    );
  }
}
