// ==========================================
// Cron — Execute Scheduled WhatsApp Tasks
// ==========================================
// Called periodically (e.g., every minute by Vercel Cron or external scheduler)
// to execute due scheduled tasks.

import { NextRequest, NextResponse } from "next/server";
import { executeScheduledTasks } from "@/lib/whatsapp/scheduled-tasks";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 401 });
  }
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const executedCount = await executeScheduledTasks();

    return NextResponse.json({
      status: "ok",
      executed: executedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] WhatsApp tasks error:", error);
    return NextResponse.json(
      { error: "Failed to execute tasks" },
      { status: 500 }
    );
  }
}
