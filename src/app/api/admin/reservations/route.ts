export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth";

// GET /api/admin/reservations — fetch reservations (optionally filtered by week)
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const { searchParams } = new URL(req.url);
    const weekStart = searchParams.get("weekStart"); // YYYY-MM-DD

    const where: Record<string, unknown> = {};

    if (weekStart) {
      const start = new Date(weekStart + "T00:00:00.000Z");
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      where.date = {
        gte: start,
        lt: end,
      };
    }

    const reservations = await prisma.supplierReservation.findMany({
      where,
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { date: "asc" },
    });

    const mapped = reservations.map((r) => ({
      id: r.id,
      supplierId: r.supplierId,
      supplierName: r.supplier.name,
      date: r.date.toISOString().split("T")[0], // YYYY-MM-DD
      time: r.time,
      notes: r.notes,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Reservations GET error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת שריונים" },
      { status: 500 }
    );
  }
}

// POST /api/admin/reservations — create a new reservation
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    const { supplierId, date, time, notes } = body || {};

    if (!supplierId || !date || !time) {
      return NextResponse.json(
        { error: "חסרים שדות חובה: ספק, תאריך ושעה" },
        { status: 400 }
      );
    }

    // Check for duplicate (same supplier + date + time)
    const dateAsDateTime = new Date(date + "T00:00:00.000Z");

    const existing = await prisma.supplierReservation.findUnique({
      where: {
        supplierId_date_time: {
          supplierId,
          date: dateAsDateTime,
          time,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "כבר קיים שריון לספק זה באותו תאריך ושעה" },
        { status: 409 }
      );
    }

    const reservation = await prisma.supplierReservation.create({
      data: {
        supplierId,
        date: dateAsDateTime,
        time,
        notes: notes || null,
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: reservation.id,
      supplierId: reservation.supplierId,
      supplierName: reservation.supplier.name,
      date: reservation.date.toISOString().split("T")[0],
      time: reservation.time,
      notes: reservation.notes,
    });
  } catch (error) {
    console.error("Reservation POST error:", error);
    return NextResponse.json(
      { error: "שגיאה ביצירת שריון" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/reservations?id=xxx — delete a reservation
export async function DELETE(req: NextRequest) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "חסר מזהה שריון" },
        { status: 400 }
      );
    }

    const existing = await prisma.supplierReservation.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "שריון לא נמצא" },
        { status: 404 }
      );
    }

    await prisma.supplierReservation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reservation DELETE error:", error);
    return NextResponse.json(
      { error: "שגיאה במחיקת שריון" },
      { status: 500 }
    );
  }
}
