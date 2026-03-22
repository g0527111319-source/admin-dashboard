import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/designer/crm/calendar
export async function GET(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    const where: Record<string, unknown> = { designerId };

    if (start || end) {
      where.startAt = {};
      if (start) {
        (where.startAt as Record<string, unknown>).gte = new Date(start);
      }
      if (end) {
        (where.startAt as Record<string, unknown>).lte = new Date(end);
      }
    }

    const events = await prisma.crmCalendarEvent.findMany({
      where,
      orderBy: { startAt: "asc" },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("CRM calendar events fetch error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת אירועי יומן" },
      { status: 500 }
    );
  }
}

// POST /api/designer/crm/calendar
export async function POST(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      description,
      startAt,
      endAt,
      location,
      isAllDay,
      color,
      projectId,
      clientId,
      reminderMin,
    } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { error: "כותרת היא שדה חובה" },
        { status: 400 }
      );
    }

    if (!startAt || !endAt) {
      return NextResponse.json(
        { error: "זמן התחלה וסיום הם שדות חובה" },
        { status: 400 }
      );
    }

    const event = await prisma.crmCalendarEvent.create({
      data: {
        designerId,
        title: title.trim(),
        description: description?.trim() || null,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        location: location?.trim() || null,
        isAllDay: isAllDay ?? false,
        color: color || null,
        projectId: projectId || null,
        clientId: clientId || null,
        reminderMin: reminderMin ?? null,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("CRM calendar event create error:", error);
    return NextResponse.json(
      { error: "שגיאה ביצירת אירוע יומן" },
      { status: 500 }
    );
  }
}
