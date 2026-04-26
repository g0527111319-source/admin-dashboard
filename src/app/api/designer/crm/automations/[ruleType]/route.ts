export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

// PATCH /api/designer/crm/automations/[ruleType] — עדכון כלל אוטומציה
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ ruleType: string }> }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

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
