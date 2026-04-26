// PATCH / DELETE for a single CrmClientSupplier row.
// Designer can edit any of the snapshot fields (name, category, phone, …)
// and can hide/show the entry from the client portal. DELETE is a soft
// delete so the row stays around for audit (matches CrmClient pattern).

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const EDITABLE_STRING_FIELDS = [
  "name",
  "category",
  "contactName",
  "phone",
  "email",
  "website",
  "logo",
  "notes",
] as const;

type EditableBody = Partial<
  Record<(typeof EDITABLE_STRING_FIELDS)[number] | "showToClient", unknown>
>;

async function loadOwnedLink(linkId: string, clientId: string, designerId: string) {
  return prisma.crmClientSupplier.findFirst({
    where: { id: linkId, clientId, designerId, deletedAt: null },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string; supplierLinkId: string }> },
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  const { clientId, supplierLinkId } = await params;

  const existing = await loadOwnedLink(supplierLinkId, clientId, auth.userId);
  if (!existing) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as EditableBody;

  const data: Record<string, unknown> = {};
  for (const key of EDITABLE_STRING_FIELDS) {
    if (key in body) {
      const v = body[key];
      if (v === null || v === "") {
        // "name" is required — don't let it be cleared.
        if (key === "name") continue;
        data[key] = null;
      } else if (typeof v === "string") {
        data[key] = v.trim();
      }
    }
  }
  if ("showToClient" in body) data.showToClient = !!body.showToClient;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "אין שינוי לשמור" }, { status: 400 });
  }

  const updated = await prisma.crmClientSupplier.update({
    where: { id: supplierLinkId },
    data,
  });
  return NextResponse.json({ supplier: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string; supplierLinkId: string }> },
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  const { clientId, supplierLinkId } = await params;

  const existing = await loadOwnedLink(supplierLinkId, clientId, auth.userId);
  if (!existing) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

  await prisma.crmClientSupplier.update({
    where: { id: supplierLinkId },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
