// GET / PATCH / DELETE a single lead. Admin only.
//   PATCH accepts:
//     - status: "REVIEWING" | "ARCHIVED" (moves lead through the simple transitions)
//     - adminNotes: string
//     - restore: true (un-archive)
//   DELETE permanently removes the lead + all interests/assignments (cascade).

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
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

const EDITABLE_STRING_FIELDS = [
  "firstName",
  "lastName",
  "phone",
  "email",
  "city",
  "scope",
] as const;

const EDITABLE_NULLABLE_STRING_FIELDS = [
  "address",
  "startTiming",
  "stylePreference",
  "additionalNotes",
] as const;

const EDITABLE_NULLABLE_NUMBER_FIELDS = [
  "sizeSqm",
  "renovationBudget",
  "designerBudget",
] as const;

type EditableBody = Partial<Record<
  (typeof EDITABLE_STRING_FIELDS)[number]
  | (typeof EDITABLE_NULLABLE_STRING_FIELDS)[number]
  | (typeof EDITABLE_NULLABLE_NUMBER_FIELDS)[number],
  unknown
>>;

function bodyHasEditableFields(body: EditableBody): boolean {
  for (const k of EDITABLE_STRING_FIELDS) if (k in body) return true;
  for (const k of EDITABLE_NULLABLE_STRING_FIELDS) if (k in body) return true;
  for (const k of EDITABLE_NULLABLE_NUMBER_FIELDS) if (k in body) return true;
  return false;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  const { leadId } = await params;
  const body = await req.json().catch(() => ({})) as {
    status?: string;
    adminNotes?: string;
    restore?: boolean;
  } & EditableBody;

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

  if (bodyHasEditableFields(body)) {
    const existing = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { status: true },
    });
    if (!existing) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
    if (existing.status !== "NEW" && existing.status !== "REVIEWING") {
      return NextResponse.json(
        { error: "לא ניתן לערוך ליד שכבר פורסם או הוקצה" },
        { status: 400 },
      );
    }

    for (const key of EDITABLE_STRING_FIELDS) {
      if (key in body) {
        const v = body[key];
        if (typeof v !== "string" || !v.trim()) {
          return NextResponse.json({ error: `שדה חובה ריק: ${key}` }, { status: 400 });
        }
        data[key] = v.trim();
      }
    }
    for (const key of EDITABLE_NULLABLE_STRING_FIELDS) {
      if (key in body) {
        const v = body[key];
        if (v == null || v === "") data[key] = null;
        else if (typeof v === "string") data[key] = v.trim();
      }
    }
    for (const key of EDITABLE_NULLABLE_NUMBER_FIELDS) {
      if (key in body) {
        const v = body[key];
        if (v == null || v === "") data[key] = null;
        else {
          const n = Number(v);
          if (!Number.isFinite(n) || n < 0) {
            return NextResponse.json({ error: `ערך לא תקין: ${key}` }, { status: 400 });
          }
          data[key] = n;
        }
      }
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "אין שינוי לשמור" }, { status: 400 });
  }

  const lead = await prisma.lead.update({ where: { id: leadId }, data });
  return NextResponse.json({ lead });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  const { leadId } = await params;
  await prisma.lead.delete({ where: { id: leadId } });
  return NextResponse.json({ ok: true });
}
