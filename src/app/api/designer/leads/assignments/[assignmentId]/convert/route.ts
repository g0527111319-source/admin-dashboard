// POST — designer converts an assigned lead to a CrmClient.
//
// Pre-fills the CrmClient with the lead's structured data. The designer can
// later edit anything. We also:
//   - set Lead.status = CONVERTED + convertedByDesignerId
//   - record LeadAssignment.convertedToClientId + convertedAt
//   - email admins so the 8% commission can be tracked

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notifyAdminsConversion } from "@/lib/leads";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ assignmentId: string }> }) {
  const role = req.headers.get("x-user-role");
  const designerId = req.headers.get("x-user-id");
  if (role !== "designer" || !designerId) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 403 });
  }
  const { assignmentId } = await params;

  const assignment = await prisma.leadAssignment.findUnique({
    where: { id: assignmentId },
    include: { lead: true, designer: { select: { id: true, fullName: true } } },
  });
  if (!assignment || assignment.designerId !== designerId) {
    return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  }
  if (assignment.convertedAt) {
    return NextResponse.json({ error: "הליד כבר הומר ללקוח" }, { status: 400 });
  }

  const lead = assignment.lead;

  // Copy lead fields into a new CrmClient
  const client = await prisma.crmClient.create({
    data: {
      designerId,
      name: `${lead.firstName} ${lead.lastName}`.trim(),
      firstName: lead.firstName,
      lastName: lead.lastName,
      phone: lead.phone,
      email: lead.email,
      address: lead.address,
      city: lead.city,
      // Renovation block
      renovationCity: lead.city,
      renovationDetails: lead.scope,
      estimatedBudget: lead.renovationBudget ? String(lead.renovationBudget) : null,
      notes: [
        `נוצר אוטומטית מליד קהילה #${lead.id}`,
        lead.additionalNotes ? `דגש מהלקוח: ${lead.additionalNotes}` : null,
        lead.startTiming ? `תזמון: ${lead.startTiming}` : null,
        lead.stylePreference ? `סגנון: ${lead.stylePreference}` : null,
        lead.designerBudget ? `תקציב למעצבת: ₪${lead.designerBudget.toLocaleString("he-IL")}` : null,
      ].filter(Boolean).join("\n"),
    },
  });

  const now = new Date();
  await prisma.$transaction([
    prisma.leadAssignment.update({
      where: { id: assignmentId },
      data: { convertedAt: now, convertedToClientId: client.id },
    }),
    prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: "CONVERTED",
        convertedAt: now,
        convertedByDesignerId: designerId,
        convertedToClientId: client.id,
      },
    }),
  ]);

  // Admin notification (best-effort)
  await notifyAdminsConversion({
    leadId: lead.id,
    leadName: `${lead.firstName} ${lead.lastName}`.trim(),
    designerName: assignment.designer.fullName,
    designerId,
    clientId: client.id,
  });

  return NextResponse.json({ ok: true, clientId: client.id });
}
