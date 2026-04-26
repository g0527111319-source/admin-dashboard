export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

// GET /api/designer/crm/recommendations/[token] — קבלת בקשת המלצה (ציבורי)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const { token } = await params;

    const recommendation = await prisma.crmClientRecommendation.findUnique({
      where: { token },
      include: {
        client: { select: { id: true, name: true } },
        designer: { select: { id: true, fullName: true } },
      },
    });

    if (!recommendation) {
      return NextResponse.json({ error: "קישור לא תקין" }, { status: 404 });
    }

    return NextResponse.json(recommendation);
  } catch (error) {
    console.error("CRM recommendation fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת בקשת המלצה" }, { status: 500 });
  }
}

// POST /api/designer/crm/recommendations/[token] — שליחת המלצה (ציבורי)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const { token } = await params;

    const recommendation = await prisma.crmClientRecommendation.findUnique({
      where: { token },
    });

    if (!recommendation) {
      return NextResponse.json({ error: "קישור לא תקין" }, { status: 404 });
    }

    if (recommendation.completedAt) {
      return NextResponse.json({ error: "המלצה כבר נשלחה" }, { status: 400 });
    }

    const body = await req.json();
    const { rating, text } = body;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "דירוג חייב להיות בין 1 ל-5" }, { status: 400 });
    }

    if (!text?.trim()) {
      return NextResponse.json({ error: "טקסט המלצה הוא שדה חובה" }, { status: 400 });
    }

    const updated = await prisma.crmClientRecommendation.update({
      where: { token },
      data: {
        rating,
        text: text.trim(),
        completedAt: new Date(),
        isPublic: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("CRM recommendation submit error:", error);
    return NextResponse.json({ error: "שגיאה בשליחת המלצה" }, { status: 500 });
  }
}
