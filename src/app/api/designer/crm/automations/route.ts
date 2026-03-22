import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const DEFAULT_RULES = [
  { ruleType: "phase_complete_notify", config: { emailTemplate: "", includeNextPhase: true } },
  { ruleType: "weekly_summary", config: { dayOfWeek: 0, hour: 9 } },
  { ruleType: "office_hours", config: { days: [0, 1, 2, 3, 4], start: "10:00", end: "17:00" } },
  { ruleType: "pending_reminder", config: { hoursBeforeFirst: 48, hoursBeforeSecond: 120 } },
  { ruleType: "countdown_alerts", config: { daysBeforeDeadline: [7, 3, 1] } },
  { ruleType: "smart_alerts", config: { trackViews: true, inactivityDays: 14 } },
  { ruleType: "auto_report", config: { includeTimeline: true, includePhotos: true } },
  { ruleType: "auto_recommendation", config: { minSurveyScore: 4 } },
];

// GET /api/designer/crm/automations — כללי אוטומציה
export async function GET(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    let rules = await prisma.crmAutomationRule.findMany({
      where: { designerId },
      orderBy: { createdAt: "asc" },
    });

    // Create default rules on first access
    if (rules.length === 0) {
      await prisma.crmAutomationRule.createMany({
        data: DEFAULT_RULES.map((rule) => ({
          designerId,
          ruleType: rule.ruleType,
          config: rule.config,
        })),
      });

      rules = await prisma.crmAutomationRule.findMany({
        where: { designerId },
        orderBy: { createdAt: "asc" },
      });
    }

    return NextResponse.json(rules);
  } catch (error) {
    console.error("CRM automations fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת כללי אוטומציה" }, { status: 500 });
  }
}
