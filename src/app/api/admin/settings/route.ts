// ==========================================
// Admin Settings API
// ==========================================
// GET:  Fetch all admin settings
// PATCH: Update admin settings (partial merge)

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit-logger";
import { clearIcountConfigCache } from "@/lib/icount-config";

const SETTINGS_KEY = "admin_settings";

export interface AdminSettings {
  categories: string[];
  daySlots: Array<{ dayOfWeek: number; times: string[] }>;
  reminderDays: number[];
  icount: {
    apiKey: string;
    companyId: string;
    user: string;
    pass: string;
  };
  security: {
    adminEmail: string;
  };
  permissions: Record<string, Record<string, boolean>>;
  banners: Array<{
    id: number;
    title: string;
    body: string;
    type: "info" | "warning" | "promo";
    scheduleFrom: string;
    scheduleTo: string;
    audience: "all" | "designers" | "suppliers";
    active: boolean;
  }>;
  tips: string[];
}

const DEFAULT_SETTINGS: AdminSettings = {
  categories: [
    "ריצוף וחיפוי", "תאורה", "ריהוט", "מטבחים", "אמבטיה",
    "חוץ ונוף", "דלתות וחלונות", "אביזרי עיצוב", "חומרי גמר",
    "שירותי בנייה", "אחר",
  ],
  daySlots: [
    { dayOfWeek: 0, times: ["10:30", "13:30", "20:30"] },
    { dayOfWeek: 1, times: ["10:30", "13:30", "20:30"] },
    { dayOfWeek: 2, times: ["10:30", "13:30", "20:30"] },
    { dayOfWeek: 3, times: ["10:30", "13:30", "20:30"] },
    { dayOfWeek: 4, times: ["10:30", "13:30", "20:30"] },
    { dayOfWeek: 5, times: ["10:30"] },
    { dayOfWeek: 6, times: [] },
  ],
  reminderDays: [7, 14, 21],
  icount: {
    apiKey: "",
    companyId: "",
    user: "",
    pass: "",
  },
  security: {
    adminEmail: "z.adrichalut@gmail.com",
  },
  permissions: {},
  banners: [],
  tips: [
    "ניתן לסנן ספקים לפי קטגוריה בעזרת תפריט הסינון בראש הדף",
    "לחצו על כפתור הלב כדי לשמור ספקים למועדפים",
    "ניתן לצפות בדוחות פעילות חודשיים באזור הניהול",
    "שתפו פוסטים ישירות מהפיד לקבוצות העיצוב שלכם",
    "עדכנו את הפרופיל שלכם כדי לקבל המלצות מותאמות אישית",
  ],
};

export async function GET() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: SETTINGS_KEY },
    });

    if (!setting) {
      // Return defaults but mask the API key
      return NextResponse.json({
        ...DEFAULT_SETTINGS,
        icount: { ...DEFAULT_SETTINGS.icount, apiKey: "" },
      });
    }

    const stored = setting.value as unknown as Partial<AdminSettings>;
    const merged: AdminSettings = {
      ...DEFAULT_SETTINGS,
      ...stored,
      icount: {
        ...DEFAULT_SETTINGS.icount,
        ...(stored.icount || {}),
      },
      security: {
        ...DEFAULT_SETTINGS.security,
        ...(stored.security || {}),
      },
    };

    // Mask secrets for GET — show last 4 chars only
    const maskedKey = merged.icount.apiKey
      ? "••••••••" + merged.icount.apiKey.slice(-4)
      : "";
    const maskedPass = merged.icount.pass
      ? "••••••••" + merged.icount.pass.slice(-4)
      : "";

    return NextResponse.json({
      ...merged,
      icount: { ...merged.icount, apiKey: maskedKey, pass: maskedPass },
      _hasApiKey: !!merged.icount.apiKey,
      _hasAllIcount: !!(merged.icount.apiKey && merged.icount.companyId && merged.icount.user && merged.icount.pass),
    });
  } catch (error) {
    console.error("[Admin Settings API] GET error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת הגדרות" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    // Fetch existing settings
    const existing = await prisma.systemSetting.findUnique({
      where: { key: SETTINGS_KEY },
    });

    const currentSettings = existing
      ? (existing.value as unknown as AdminSettings)
      : DEFAULT_SETTINGS;

    // Deep merge
    const updated: AdminSettings = {
      ...currentSettings,
      ...body,
      icount: {
        ...currentSettings.icount,
        ...(body.icount || {}),
      },
      security: {
        ...currentSettings.security,
        ...(body.security || {}),
      },
    };

    // If the client sent masked values, keep the existing ones
    if (updated.icount.apiKey && updated.icount.apiKey.startsWith("••••")) {
      updated.icount.apiKey = currentSettings.icount.apiKey;
    }
    if (updated.icount.pass && updated.icount.pass.startsWith("••••")) {
      updated.icount.pass = currentSettings.icount.pass;
    }

    // Upsert into DB
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jsonValue = JSON.parse(JSON.stringify(updated));
    await prisma.systemSetting.upsert({
      where: { key: SETTINGS_KEY },
      update: { value: jsonValue },
      create: {
        key: SETTINGS_KEY,
        value: jsonValue,
      },
    });

    // Clear iCount config cache so new credentials take effect immediately
    if (body.icount) {
      clearIcountConfigCache();
    }

    // Audit log
    const userId =
      request.headers.get("x-user-id") || "unknown";
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    logAuditEvent("ADMIN_SETTINGS_CHANGE", userId, {
      setting: SETTINGS_KEY,
      changedFields: Object.keys(body),
    }, ip);

    // Mask secrets in response
    const maskedKey = updated.icount.apiKey
      ? "••••••••" + updated.icount.apiKey.slice(-4)
      : "";
    const maskedPass = updated.icount.pass
      ? "••••••••" + updated.icount.pass.slice(-4)
      : "";

    return NextResponse.json({
      success: true,
      settings: {
        ...updated,
        icount: { ...updated.icount, apiKey: maskedKey, pass: maskedPass },
        _hasApiKey: !!updated.icount.apiKey,
        _hasAllIcount: !!(updated.icount.apiKey && updated.icount.companyId && updated.icount.user && updated.icount.pass),
      },
    });
  } catch (error) {
    console.error("[Admin Settings API] PATCH error:", error);
    return NextResponse.json(
      { error: "שגיאה בשמירת הגדרות" },
      { status: 500 }
    );
  }
}
