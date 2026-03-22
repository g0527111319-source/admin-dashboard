import { txt } from "@/content/siteText";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
export const dynamic = "force-dynamic";
// GET /api/events — רשימת אירועים
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");
        const where: Record<string, unknown> = {};
        if (status)
            where.status = status;
        const events = await prisma.event.findMany({
            where,
            include: {
                _count: { select: { registrations: true } },
                registrations: {
                    select: { paymentStatus: true },
                },
            },
            orderBy: { date: "desc" },
        });
        // Add computed fields
        const eventsWithCounts = events.map((e) => ({
            ...e,
            registered: e._count.registrations,
            paid: e.registrations.filter((r) => r.paymentStatus === "PAID").length,
            registrations: undefined,
            _count: undefined,
        }));
        return NextResponse.json(eventsWithCounts);
    }
    catch (error) {
        console.error("Events fetch error:", error);
        return NextResponse.json({ error: txt("src/app/api/events/route.ts::001", "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05D0\u05D9\u05E8\u05D5\u05E2\u05D9\u05DD") }, { status: 500 });
    }
}
// POST /api/events — יצירת אירוע חדש
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { title, description, date, location, isPaid, price, maxAttendees, registrationDeadline, } = body;
        if (!title || !date) {
            return NextResponse.json({ error: txt("src/app/api/events/route.ts::002", "\u05D7\u05E1\u05E8\u05D9\u05DD \u05E9\u05D3\u05D5\u05EA \u05D7\u05D5\u05D1\u05D4") }, { status: 400 });
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
            },
        });
        return NextResponse.json({ success: true, event }, { status: 201 });
    }
    catch (error) {
        console.error("Event create error:", error);
        return NextResponse.json({ error: txt("src/app/api/events/route.ts::003", "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D9\u05E6\u05D9\u05E8\u05EA \u05D0\u05D9\u05E8\u05D5\u05E2") }, { status: 500 });
    }
}
