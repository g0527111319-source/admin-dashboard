export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { canAccessFeature, Feature } from "@/lib/subscription-gate";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

const VALID_FEATURES: Feature[] = [
  "crm",
  "businessCard",
  "contracts",
  "events",
  "suppliers",
  "raffles",
  "portfolio",
  "messages",
];

// GET /api/designer/check-feature?feature=crm&designerId=xxx
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const { searchParams } = new URL(req.url);
    const feature = searchParams.get("feature") as Feature | null;
    const designerId =
      searchParams.get("designerId") || auth.userId;

    if (!feature || !VALID_FEATURES.includes(feature)) {
      return NextResponse.json(
        { error: "תכונה לא חוקית", hasAccess: false },
        { status: 400 }
      );
    }
    if (!designerId) {
      return NextResponse.json(
        { error: "חסר מזהה מעצבת", hasAccess: false },
        { status: 400 }
      );
    }

    const hasAccess = await canAccessFeature(designerId, feature);
    return NextResponse.json({ hasAccess, feature });
  } catch (error) {
    console.error("check-feature error:", error);
    return NextResponse.json(
      { error: "שגיאה בבדיקת הרשאה", hasAccess: false },
      { status: 500 }
    );
  }
}
