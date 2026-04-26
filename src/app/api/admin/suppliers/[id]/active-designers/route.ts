// GET /api/admin/suppliers/[id]/active-designers
// Drill-down for the "עבודות פעילות" tab — returns the list of distinct
// designers currently using this community supplier on at least one of
// their (non-deleted) clients, with the count of clients each designer
// has the supplier attached to.

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "חסר מזהה ספק" }, { status: 400 });

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      select: { id: true, name: true, logo: true, category: true, city: true },
    });
    if (!supplier) {
      return NextResponse.json({ error: "ספק לא נמצא" }, { status: 404 });
    }

    const links = await prisma.crmClientSupplier.findMany({
      where: {
        communitySupplierId: id,
        deletedAt: null,
        client: { deletedAt: null },
      },
      select: {
        clientId: true,
        client: {
          select: { id: true, name: true, firstName: true, lastName: true, city: true },
        },
        designer: {
          select: {
            id: true,
            fullName: true,
            city: true,
            email: true,
            phone: true,
            isActive: true,
          },
        },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Group by designer, keep the list of clients each designer attached the
    // supplier on so admin can see "designer X is using this supplier on 2
    // clients".
    const byDesigner = new Map<string, {
      id: string;
      fullName: string;
      city: string | null;
      email: string | null;
      phone: string;
      isActive: boolean;
      clients: { id: string; name: string; city: string | null; addedAt: string }[];
    }>();
    for (const l of links) {
      const d = l.designer;
      if (!byDesigner.has(d.id)) {
        byDesigner.set(d.id, {
          id: d.id,
          fullName: d.fullName,
          city: d.city,
          email: d.email,
          phone: d.phone,
          isActive: d.isActive,
          clients: [],
        });
      }
      byDesigner.get(d.id)!.clients.push({
        id: l.client.id,
        // CrmClient.name is auto-computed; fall back to first/last for legacy.
        name: l.client.name || [l.client.firstName, l.client.lastName].filter(Boolean).join(" ") || "—",
        city: l.client.city,
        addedAt: l.createdAt.toISOString(),
      });
    }

    const designers = Array.from(byDesigner.values()).sort(
      (a, b) => b.clients.length - a.clients.length || a.fullName.localeCompare(b.fullName),
    );

    return NextResponse.json({ supplier, designers });
  } catch (error) {
    console.error("admin/suppliers/[id]/active-designers error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת מעצבות פעילות" }, { status: 500 });
  }
}
