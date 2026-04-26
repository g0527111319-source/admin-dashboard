// CRUD for the per-client supplier list (CrmClientSupplier).
//   GET  /api/designer/crm/clients/[clientId]/suppliers
//   POST /api/designer/crm/clients/[clientId]/suppliers
//
// The list always belongs to a single client owned by the requesting
// designer; cross-tenant reads / writes are blocked.

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

/** Resolve the client only if it belongs to this designer + isn't soft-deleted. */
async function loadOwnedClient(clientId: string, designerId: string) {
  return prisma.crmClient.findFirst({
    where: { id: clientId, designerId, deletedAt: null },
    select: { id: true },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  const { clientId } = await params;
  const owned = await loadOwnedClient(clientId, auth.userId);
  if (!owned) return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });

  const suppliers = await prisma.crmClientSupplier.findMany({
    where: { clientId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ suppliers });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  const { clientId } = await params;
  const owned = await loadOwnedClient(clientId, auth.userId);
  if (!owned) return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as {
    source?: "community" | "personal" | "custom";
    communitySupplierId?: string;
    crmSupplierId?: string;
    // Optional override fields. For community/personal these default from
    // the source row's data; for "custom" they are required.
    name?: string;
    category?: string;
    contactName?: string;
    phone?: string;
    email?: string;
    website?: string;
    notes?: string;
    showToClient?: boolean;
  };

  const designerId = auth.userId;
  let resolved: {
    name: string;
    category: string | null;
    contactName: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    logo: string | null;
    communitySupplierId: string | null;
    crmSupplierId: string | null;
  } | null = null;

  if (body.source === "community" && body.communitySupplierId) {
    const s = await prisma.supplier.findFirst({
      where: { id: body.communitySupplierId, approvalStatus: "APPROVED" },
      select: { id: true, name: true, category: true, contactName: true, phone: true, email: true, website: true, logo: true },
    });
    if (!s) return NextResponse.json({ error: "ספק קהילה לא נמצא או לא מאושר" }, { status: 400 });
    resolved = {
      name: body.name?.trim() || s.name,
      category: body.category?.trim() || s.category,
      contactName: body.contactName?.trim() || s.contactName,
      phone: body.phone?.trim() || s.phone,
      email: body.email?.trim() || s.email,
      website: body.website?.trim() || s.website,
      logo: s.logo,
      communitySupplierId: s.id,
      crmSupplierId: null,
    };
  } else if (body.source === "personal" && body.crmSupplierId) {
    const cs = await prisma.crmSupplier.findFirst({
      where: { id: body.crmSupplierId, designerId, deletedAt: null },
      select: { id: true, name: true, category: true, contactName: true, phone: true, email: true, website: true },
    });
    if (!cs) return NextResponse.json({ error: "ספק אישי לא נמצא" }, { status: 400 });
    resolved = {
      name: body.name?.trim() || cs.name,
      category: body.category?.trim() || cs.category,
      contactName: body.contactName?.trim() || cs.contactName,
      phone: body.phone?.trim() || cs.phone,
      email: body.email?.trim() || cs.email,
      website: body.website?.trim() || cs.website,
      logo: null,
      communitySupplierId: null,
      crmSupplierId: cs.id,
    };
  } else {
    // Custom — ad-hoc entry typed by the designer; no source row exists.
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json(
        { error: "שם הספק חובה כשמוסיפים ידנית" },
        { status: 400 },
      );
    }
    resolved = {
      name,
      category: body.category?.trim() || null,
      contactName: body.contactName?.trim() || null,
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
      website: body.website?.trim() || null,
      logo: null,
      communitySupplierId: null,
      crmSupplierId: null,
    };
  }

  const created = await prisma.crmClientSupplier.create({
    data: {
      designerId,
      clientId,
      ...resolved,
      notes: body.notes?.trim() || null,
      showToClient: body.showToClient ?? true,
    },
  });
  return NextResponse.json({ supplier: created }, { status: 201 });
}
