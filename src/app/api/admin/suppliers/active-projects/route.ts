// GET /api/admin/suppliers/active-projects
// For the "עבודות פעילות" tab in /admin/suppliers — returns every approved
// active community supplier together with the number of distinct designers
// that have him on a CrmClientSupplier row right now (i.e. are using him on
// at least one of their non-deleted clients' projects). Suppliers with zero
// active designers are still returned with count=0 so admin can see the
// full picture, but the UI sorts by count desc.

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    // Pull the supplier list + every active link in one query, then aggregate
    // in JS. The dataset is small (dozens of suppliers, low hundreds of links)
    // so this beats a raw GROUP BY for readability.
    const suppliers = await prisma.supplier.findMany({
      where: { approvalStatus: "APPROVED", isActive: true },
      select: {
        id: true,
        name: true,
        logo: true,
        category: true,
        city: true,
        clientLinks: {
          where: {
            deletedAt: null,
            client: { deletedAt: null },
          },
          select: { designerId: true, clientId: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const result = suppliers.map((s) => {
      const designerIds = new Set<string>();
      const clientIds = new Set<string>();
      for (const l of s.clientLinks) {
        designerIds.add(l.designerId);
        clientIds.add(l.clientId);
      }
      return {
        id: s.id,
        name: s.name,
        logo: s.logo,
        category: s.category,
        city: s.city,
        activeDesigners: designerIds.size,
        activeClients: clientIds.size,
      };
    });

    // Suppliers with the most active designers first; ties broken by name.
    result.sort((a, b) => b.activeDesigners - a.activeDesigners || a.name.localeCompare(b.name));

    return NextResponse.json({ suppliers: result });
  } catch (error) {
    console.error("admin/suppliers/active-projects error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת עבודות פעילות" }, { status: 500 });
  }
}
