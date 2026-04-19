// POST — admin assigns the lead to up to 3 designers.
//
// Body: { designerIds: string[] }  // 1-3 ids
//
// Creates LeadAssignment rows, moves lead to DISTRIBUTED, emails designers.
// Idempotent per (lead, designer) pair — @@unique protects duplicates.

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notifyDesignerAssignment } from "@/lib/leads";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  if (req.headers.get("x-user-role") !== "admin") {
    return NextResponse.json({ error: "לא מורשה" }, { status: 403 });
  }
  const { leadId } = await params;
  const body = await req.json().catch(() => ({})) as { designerIds?: string[] };
  const ids = Array.isArray(body.designerIds) ? body.designerIds.filter((x) => typeof x === "string" && x).slice(0, 3) : [];
  if (ids.length === 0 || ids.length > 3) {
    return NextResponse.json({ error: "יש לבחור בין מעצבת אחת לשלוש" }, { status: 400 });
  }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  if (lead.status === "CONVERTED" || lead.status === "ARCHIVED") {
    return NextResponse.json({ error: "הליד סגור — לא ניתן להקצות" }, { status: 400 });
  }

  const designers = await prisma.designer.findMany({
    where: { id: { in: ids } },
    select: { id: true, fullName: true, firstName: true, email: true },
  });
  if (designers.length === 0) {
    return NextResponse.json({ error: "לא נמצאו מעצבות מהרשימה" }, { status: 400 });
  }

  // Create assignments — skip duplicates via @@unique. Use Promise.all so
  // individual duplicates don't trip the whole request.
  const nowStr = new Date();
  const created = await Promise.all(
    designers.map((d) =>
      prisma.leadAssignment
        .upsert({
          where: { leadId_designerId: { leadId, designerId: d.id } },
          create: { leadId, designerId: d.id, assignedAt: nowStr },
          update: {},
        })
        .catch((err) => {
          console.error("[leads] upsert assignment failed", { leadId, designerId: d.id, err });
          return null;
        })
    )
  );

  await prisma.lead.update({
    where: { id: leadId },
    data: { status: "DISTRIBUTED", distributedAt: nowStr },
  });

  // Fire emails (best-effort)
  const leadName = `${lead.firstName} ${lead.lastName}`.trim();
  await Promise.allSettled(
    designers.map((d) =>
      notifyDesignerAssignment({
        designerEmail: d.email,
        designerFirstName: d.firstName || d.fullName.split(" ")[0] || "מעצבת",
        designerId: d.id,
        leadName,
        leadCity: lead.city,
        leadId: lead.id,
      })
    )
  );

  return NextResponse.json({ ok: true, assignedCount: created.filter(Boolean).length });
}
