import { txt } from "@/content/siteText";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/events — רשימת אירועים
// Returns each event with the linked community supplier (id + name + logo)
// when one is set, so the designer-facing event card can render the supplier
// without an extra request.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const events = await prisma.event.findMany({
      where,
      include: {
        _count: { select: { registrations: true } },
        registrations: { select: { paymentStatus: true, designerId: true } },
        supplier: { select: { id: true, name: true, logo: true, category: true } },
      },
      orderBy: { date: "desc" },
    });

    const eventsWithCounts = events.map((e) => ({
      ...e,
      registered: e._count.registrations,
      paid: e.registrations.filter((r) => r.paymentStatus === "PAID").length,
      registrations: undefined,
      _count: undefined,
    }));
    return NextResponse.json(eventsWithCounts);
  } catch (error) {
    console.error("Events fetch error:", error);
    return NextResponse.json(
      {
        error: txt(
          "src/app/api/events/route.ts::001",
          "שגיאה בטעינת אירועים",
        ),
      },
      { status: 500 },
    );
  }
}

// POST /api/events — יצירת אירוע חדש
// Accepts optional supplierId for community-supplier-led events. The supplier
// is validated to exist + be APPROVED before being attached.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      description,
      date,
      location,
      isPaid,
      price,
      maxAttendees,
      registrationDeadline,
      supplierId,
    } = body;

    if (!title || !date) {
      return NextResponse.json(
        {
          error: txt(
            "src/app/api/events/route.ts::002",
            "חסרים שדות חובה",
          ),
        },
        { status: 400 },
      );
    }

    // Validate supplier link if supplied. Silently drop invalid ids rather
    // than 500ing on FK violation.
    let safeSupplierId: string | null = null;
    if (supplierId) {
      const s = await prisma.supplier.findFirst({
        where: { id: supplierId, approvalStatus: "APPROVED" },
        select: { id: true },
      });
      if (s) safeSupplierId = s.id;
    }

    const event = await prisma.event.create({
      data: {
        title,
        description,
        date: new Date(date),
        location,
        isPaid: isPaid || false,
        price: price ? Number(price) : null,
        maxAttendees: maxAttendees ? Number(maxAttendees) : null,
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
        status: "OPEN",
        supplierId: safeSupplierId,
      },
    });
    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (error) {
    console.error("Event create error:", error);
    return NextResponse.json(
      {
        error: txt(
          "src/app/api/events/route.ts::003",
          "שגיאה ביצירת אירוע",
        ),
      },
      { status: 500 },
    );
  }
}
