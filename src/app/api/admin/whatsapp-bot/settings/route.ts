// ==========================================
// WhatsApp Bot Settings API
// ==========================================
// GET:  Fetch current bot settings
// PATCH: Update bot settings (partial)

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { logAuditEvent } from "@/lib/audit-logger";

const SETTINGS_KEY = "whatsapp_bot_config";

export interface WhatsAppBotSettings {
  generalInstructions: string;
  roleInstructions: {
    designer: string;
    supplier: string;
    admin: string;
  };
  preparedResponses: Array<{
    id: string;
    trigger: string;
    response: string;
  }>;
  blockedWords: string;
  general: {
    botActive: boolean;
    maxMessagesPerDay: number;
    responseLanguage: string;
    botName: string;
    dailyCostLimit: number;
  };
}

const DEFAULT_SETTINGS: WhatsAppBotSettings = {
  generalInstructions:
    "את עוזרת דיגיטלית מקצועית של זירת האדריכלות. דברי בעברית, בצורה חמה ומקצועית. השתמשי באימוג'ים במידה. ענה בתמציתיות.",
  roleInstructions: {
    designer:
      "עזרי למעצבות בשאלות על האתר, דיווח עסקאות, דירוג ספקים, ואישור הגעה לאירועים. אל תחשפי מידע על מעצבות אחרות.",
    supplier:
      "עזרי לספקים באישור עסקאות, תיאום פרסומים, ובדיקת דרישות פרסום. אל תחשפי מידע על ספקים אחרים.",
    admin:
      "תני למנהלת גישה מלאה לכל המידע. בצעי פקודות, שלחי דוחות, וענה על כל שאלה.",
  },
  preparedResponses: [],
  blockedWords: "",
  general: {
    botActive: true,
    maxMessagesPerDay: 100,
    responseLanguage: "עברית",
    botName: "זירת האדריכלות",
    dailyCostLimit: 5,
  },
};

export async function GET() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: SETTINGS_KEY },
    });

    if (!setting) {
      return NextResponse.json(DEFAULT_SETTINGS);
    }

    // Merge with defaults to ensure all fields exist
    const stored = setting.value as unknown as Partial<WhatsAppBotSettings>;
    const merged: WhatsAppBotSettings = {
      ...DEFAULT_SETTINGS,
      ...stored,
      roleInstructions: {
        ...DEFAULT_SETTINGS.roleInstructions,
        ...(stored.roleInstructions || {}),
      },
      general: {
        ...DEFAULT_SETTINGS.general,
        ...(stored.general || {}),
      },
    };

    return NextResponse.json(merged);
  } catch (error) {
    console.error("[Bot Settings API] GET error");
    return NextResponse.json(
      { error: "Failed to fetch bot settings" },
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
      ? (existing.value as unknown as WhatsAppBotSettings)
      : DEFAULT_SETTINGS;

    // Deep merge the updates
    const updated: WhatsAppBotSettings = {
      ...currentSettings,
      ...body,
      roleInstructions: {
        ...currentSettings.roleInstructions,
        ...(body.roleInstructions || {}),
      },
      general: {
        ...currentSettings.general,
        ...(body.general || {}),
      },
    };

    // Upsert into DB
    await prisma.systemSetting.upsert({
      where: { key: SETTINGS_KEY },
      update: { value: updated as unknown as Prisma.InputJsonValue },
      create: {
        key: SETTINGS_KEY,
        value: updated as unknown as Prisma.InputJsonValue,
      },
    });

    const userId = request.headers.get("x-user-id") || "unknown";
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";
    logAuditEvent("ADMIN_SETTINGS_CHANGE", userId, {
      setting: SETTINGS_KEY,
      changedFields: Object.keys(body),
    }, ip);

    return NextResponse.json({ success: true, settings: updated });
  } catch (error) {
    console.error("[Bot Settings API] PATCH error");
    return NextResponse.json(
      { error: "Failed to update bot settings" },
      { status: 500 }
    );
  }
}
