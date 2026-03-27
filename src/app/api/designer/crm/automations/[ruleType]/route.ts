export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// PATCH /api/designer/crm/automations/[ruleType] — עדכון כלל אוטומציה
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ ruleType: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { ruleType } = await params;

    const body = await req.json();
    const { isEnabled, config } = body;

    const data = {
      ...(isEnabled !== undefined && { isEnabled }),
      ...(config !== undefined && { config }),
    };

    const rule = await prisma.crmAutomationRule.upsert({
      where: {
        designerId_ruleType: { designerId, ruleType },
      },
      update: data,
      create: {
        designerId,
        ruleType,
        ...data,
      },
    });

    return NextResponse.json(rule);
  } catch (error) {
    console.error("CRM automation rule update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון כלל אוטומציה" }, { status: 500 });
  }
}
