import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const SETTING_KEY = "admin_automations";

interface AutomationRule {
  id: string;
  trigger: string;
  conditionValue: number | null;
  action: string;
  actionDetail: string;
  enabled: boolean;
  executions: number;
}

// GET /api/admin/automations — list all admin automation rules
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: SETTING_KEY },
    });
    const rules: AutomationRule[] = setting
      ? (setting.value as unknown as AutomationRule[])
      : [];
    return NextResponse.json(rules);
  } catch (error) {
    console.error("Admin automations fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת אוטומציות" }, { status: 500 });
  }
}

// POST /api/admin/automations — create a new rule
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    const { trigger, conditionValue, action, actionDetail } = body;
    if (!trigger || !action) {
      return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
    }
    const newRule: AutomationRule = {
      id: crypto.randomUUID(),
      trigger,
      conditionValue: conditionValue ?? null,
      action,
      actionDetail: actionDetail || "",
      enabled: true,
      executions: 0,
    };
    const setting = await prisma.systemSetting.findUnique({ where: { key: SETTING_KEY } });
    const existing: AutomationRule[] = setting ? (setting.value as unknown as AutomationRule[]) : [];
    const updated = [...existing, newRule];
    await prisma.systemSetting.upsert({
      where: { key: SETTING_KEY },
      create: { key: SETTING_KEY, value: updated as unknown as Prisma.InputJsonValue },
      update: { value: updated as unknown as Prisma.InputJsonValue },
    });
    return NextResponse.json({ success: true, rule: newRule }, { status: 201 });
  } catch (error) {
    console.error("Admin automation create error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת אוטומציה" }, { status: 500 });
  }
}

// PATCH /api/admin/automations — update rule (toggle, edit, delete)
export async function PATCH(req: NextRequest) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    const { id, action: patchAction, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
    }
    const setting = await prisma.systemSetting.findUnique({ where: { key: SETTING_KEY } });
    let rules: AutomationRule[] = setting ? (setting.value as unknown as AutomationRule[]) : [];

    if (patchAction === "delete") {
      rules = rules.filter((r) => r.id !== id);
    } else if (patchAction === "toggle") {
      rules = rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    } else {
      // General update
      rules = rules.map((r) => (r.id === id ? { ...r, ...updates } : r));
    }

    await prisma.systemSetting.upsert({
      where: { key: SETTING_KEY },
      create: { key: SETTING_KEY, value: rules as unknown as Prisma.InputJsonValue },
      update: { value: rules as unknown as Prisma.InputJsonValue },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin automation update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון אוטומציה" }, { status: 500 });
  }
}
