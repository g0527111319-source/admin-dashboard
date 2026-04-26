export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_SUPPLIER } from "@/lib/api-auth";

/**
 * POST /api/supplier/posts/batch-schedule
 *
 * Body:
 *  {
 *    supplierId: string,
 *    posts: Array<{
 *      caption?: string;
 *      images?: string[];
 *      imageUrl?: string;
 *    }>,
 *    startDate: string (ISO),         // e.g. next Monday
 *    cadence: "daily" | "weekdays" | "every-other-day" | "weekly",
 *    timeSlot: string,                // "10:30" | "13:30" | "20:30"
 *  }
 *
 * Creates one Post per item with scheduledDate spaced by cadence, all in
 * PENDING status for admin approval. Useful when a supplier wants to queue
 * a week of content in one go instead of submitting one-by-one.
 *
 * Auth: requires the request to come from the supplier themselves (matched
 * via login token header) OR from the admin (x-admin-id). For this SaaS the
 * supplier sets their session via `x-supplier-id`.
 */

type Cadence = "daily" | "weekdays" | "every-other-day" | "weekly";

function advanceDate(current: Date, cadence: Cadence): Date {
  const next = new Date(current);
  switch (cadence) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "every-other-day":
      next.setDate(next.getDate() + 2);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "weekdays":
      do {
        next.setDate(next.getDate() + 1);
      } while (next.getDay() === 5 || next.getDay() === 6); // skip Fri/Sat (IL weekend)
      break;
  }
  return next;
}

export async function POST(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_SUPPLIER);
  if (!auth.ok) return auth.response;
  try {
    const supplierId =
      req.headers.get("x-supplier-id") || req.headers.get("x-user-id");
    if (!supplierId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const targetSupplierId: string = body?.supplierId || supplierId;
    if (targetSupplierId !== supplierId) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const posts: Array<{
      caption?: string;
      images?: string[];
      imageUrl?: string;
    }> = Array.isArray(body?.posts) ? body.posts : [];
    if (posts.length === 0) {
      return NextResponse.json(
        { error: "רשימת פוסטים ריקה" },
        { status: 400 }
      );
    }
    if (posts.length > 30) {
      return NextResponse.json(
        { error: "עד 30 פוסטים בבאצ' אחד" },
        { status: 400 }
      );
    }

    const startDate = body?.startDate
      ? new Date(body.startDate)
      : new Date();
    if (isNaN(startDate.getTime())) {
      return NextResponse.json({ error: "תאריך לא תקין" }, { status: 400 });
    }
    const cadence: Cadence =
      body?.cadence === "weekly"
        ? "weekly"
        : body?.cadence === "every-other-day"
          ? "every-other-day"
          : body?.cadence === "weekdays"
            ? "weekdays"
            : "daily";
    const timeSlot: string =
      typeof body?.timeSlot === "string" && body.timeSlot.match(/^\d{2}:\d{2}$/)
        ? body.timeSlot
        : "10:30";

    // Verify supplier exists
    const supplier = await prisma.supplier.findUnique({
      where: { id: targetSupplierId },
      select: { id: true, approvalStatus: true, isActive: true },
    });
    if (!supplier || !supplier.isActive) {
      return NextResponse.json({ error: "ספק לא פעיל" }, { status: 403 });
    }

    // Build rows
    let cursor = new Date(startDate);
    const rows = posts.map((p) => {
      const scheduledDate = new Date(cursor);
      cursor = advanceDate(cursor, cadence);
      return {
        supplierId: targetSupplierId,
        status: "PENDING" as const,
        scheduledDate,
        scheduledTime: timeSlot,
        caption: p.caption?.trim() || null,
        images: Array.isArray(p.images) ? p.images.slice(0, 20) : [],
        imageUrl: p.imageUrl || p.images?.[0] || null,
      };
    });

    const created = await prisma.post.createMany({ data: rows });

    return NextResponse.json({
      ok: true,
      created: created.count,
      spanStart: rows[0]?.scheduledDate,
      spanEnd: rows[rows.length - 1]?.scheduledDate,
    });
  } catch (error) {
    console.error("batch-schedule error:", error);
    return NextResponse.json(
      { error: "שגיאה בתזמון פוסטים" },
      { status: 500 }
    );
  }
}
