// POST   /api/events/[id]/register — designer registers for an event
// DELETE /api/events/[id]/register — designer cancels her registration
//
// On register:
//   1. EventRegistration row is created (idempotent — duplicates ignored).
//   2. A CrmCalendarEvent is added to the designer's calendar with the
//      event details, the supplier's name + logo (if the admin attached
//      a supplier when creating the event), and a back-pointer to the
//      source event so the entry can be cleaned up on cancel.
//
// On cancel: the EventRegistration is removed and any auto-synced
// CrmCalendarEvent rows pointing at this event are removed too.

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, DESIGNER_ONLY } from "@/lib/api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Default duration we use for the calendar entry when the admin event is a
// single point-in-time (which is how Event currently models it). Two hours
// matches typical community meetups.
const DEFAULT_DURATION_HOURS = 2;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireRole(req, DESIGNER_ONLY);
  if (!auth.ok) return auth.response;
  const designerId = auth.userId;

  const { id: eventId } = await params;
  if (!eventId) return NextResponse.json({ error: "חסר מזהה אירוע" }, { status: 400 });

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      supplier: { select: { id: true, name: true, logo: true } },
      _count: { select: { registrations: true } },
    },
  });
  if (!event) return NextResponse.json({ error: "אירוע לא נמצא" }, { status: 404 });
  if (event.status !== "OPEN") {
    return NextResponse.json({ error: "ההרשמה לאירוע סגורה" }, { status: 400 });
  }
  if (event.maxAttendees && event._count.registrations >= event.maxAttendees) {
    return NextResponse.json({ error: "האירוע מלא" }, { status: 400 });
  }
  if (event.registrationDeadline && event.registrationDeadline < new Date()) {
    return NextResponse.json({ error: "ההרשמה לאירוע נסגרה" }, { status: 400 });
  }

  // Idempotent: if she's already registered, return 200 without creating
  // duplicate calendar rows.
  const existing = await prisma.eventRegistration.findUnique({
    where: { eventId_designerId: { eventId, designerId } },
  });
  if (existing) {
    return NextResponse.json({ ok: true, alreadyRegistered: true });
  }

  const startAt = new Date(event.date);
  const endAt = new Date(startAt.getTime() + DEFAULT_DURATION_HOURS * 60 * 60 * 1000);

  // Compose a description that surfaces the supplier in the calendar entry
  // body so it shows up in Google-Calendar exports too.
  const descParts: string[] = [];
  if (event.description) descParts.push(event.description);
  if (event.supplier?.name) descParts.push(`ספק מארח: ${event.supplier.name}`);
  const description = descParts.length > 0 ? descParts.join("\n\n") : null;

  await prisma.$transaction(async (tx) => {
    await tx.eventRegistration.create({
      data: {
        eventId,
        designerId,
        paymentStatus: event.isPaid ? "PENDING" : "FREE",
      },
    });

    await tx.crmCalendarEvent.create({
      data: {
        designerId,
        title: event.title,
        description,
        startAt,
        endAt,
        location: event.location,
        isAllDay: false,
        color: "#C9A84C", // brand gold to mark community events
        eventType: "event",
        sourceEventId: event.id,
        supplierId: event.supplier?.id ?? null,
        supplierName: event.supplier?.name ?? null,
        supplierLogoSnapshot: event.supplier?.logo ?? null,
      },
    });
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireRole(req, DESIGNER_ONLY);
  if (!auth.ok) return auth.response;
  const designerId = auth.userId;

  const { id: eventId } = await params;
  if (!eventId) return NextResponse.json({ error: "חסר מזהה אירוע" }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    // Best-effort: ignore "not found" so a user clicking cancel twice doesn't 500.
    await tx.eventRegistration
      .delete({ where: { eventId_designerId: { eventId, designerId } } })
      .catch(() => null);

    await tx.crmCalendarEvent.deleteMany({
      where: { designerId, sourceEventId: eventId },
    });
  });

  return NextResponse.json({ ok: true });
}
