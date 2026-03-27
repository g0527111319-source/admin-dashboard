// ==========================================
// Cron: Daily Summary — Admin Report
// ==========================================
// Triggered once daily (20:00) by Vercel Cron or manually via GET.
// Generates a Hebrew summary of platform activity and sends to admin.

import { NextRequest, NextResponse } from "next/server";
import { generateDailySummary } from "@/lib/whatsapp/daily-summary";

export const dynamic = "force-dynamic";

// ==========================================
// GET — Manual trigger + cron endpoint
// ==========================================
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret (skip for local dev)
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const result = await generateDailySummary();

    return NextResponse.json({
      success: true,
      sentTo: result.sentTo,
      errors: result.errors,
      message: result.message,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron DailySummary] Error:", error);
    return NextResponse.json(
      {
        error: "שגיאה ביצירת סיכום יומי",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
