// GET / PATCH / DELETE a single lead. Admin only.
//   PATCH accepts:
//     - status: "REVIEWING" | "ARCHIVED" (moves lead through the simple transitions)
//     - adminNotes: string
//     - restore: true (un-archive)
//   DELETE permanently removes the lead + all interests/assignments (cascade).

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  if (req.headers.get("x-user-role") !== "admin") {
    return NextResponse.json({ error: "לא מורשה" }, { status: 403 });
  }
  const { leadId } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      interests: {
        include: {
          designer: {
            select: {
              id: true,
              fullName: true,
              city: true,
              specialization: true,
              yearsExperience: true,
              totalDealsReported: true,
              totalDealAmount: true,
              subscription: {
                select: {
                  status: true,
                  plan: { select: { slug: true, name: true, price: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      assignments: {
        include: {
          designer: {
            select: {
              id: true,
              fullName: true,
              city: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { assignedAt: "asc" },
      },
    },
  });

  if (!lead) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  return NextResponse.json({ lead });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  if (req.headers.get("x-user-role") !== "admin") {
    return NextResponse.json({ error: "לא מורשה" }, { status: 403 });
  }
  const { leadId } = await params;
  const body = await req.json().catch(() => ({})) as {
    status?: string;
    adminNotes?: string;
    restore?: boolean;
  };

  const data: Record<string, unknown> = {};
  if (typeof body.adminNotes === "string") data.adminNotes = body.adminNotes.slice(0, 2000);
  if (body.status === "REVIEWING") data.status = "REVIEWING";
  if (body.status === "ARCHIVED") {
    data.status = "ARCHIVED";
    data.archivedAt = new Date();
  }
  if (body.restore === true) {
    data.status = "NEW";
    data.archivedAt = null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "אין שינוי לשמור" }, { status: 400 });
  }

  const lead = await prisma.lead.update({ where: { id: leadId }, data });
  return NextResponse.json({ lead });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  if (req.headers.get("x-user-role") !== "admin") {
    return NextResponse.json({ error: "לא מורשה" }, { status: 403 });
  }
  const { leadId } = await params;
  await prisma.lead.delete({ where: { id: leadId } });
  return NextResponse.json({ ok: true });
}
