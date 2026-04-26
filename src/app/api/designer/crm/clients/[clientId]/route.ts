export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

// GET /api/designer/crm/clients/[clientId]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const { clientId } = await params;

    const client = await prisma.crmClient.findFirst({
      where: { id: clientId, designerId, deletedAt: null },
      include: {
        projects: {
          where: { deletedAt: null },
          include: {
            phases: { orderBy: { sortOrder: "asc" } },
            _count: { select: { messages: true, documents: true, photos: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error("CRM client get error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת לקוח" }, { status: 500 });
  }
}

// PATCH /api/designer/crm/clients/[clientId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const { clientId } = await params;
    const body = await req.json();

    // Verify ownership — use select to avoid crashing on missing columns
    let existing;
    try {
      existing = await prisma.crmClient.findFirst({
        where: { id: clientId, designerId, deletedAt: null },
      });
    } catch {
      // New columns may not exist yet — fall back to core fields
      existing = await prisma.crmClient.findFirst({
        where: { id: clientId, designerId, deletedAt: null },
        select: { id: true, name: true, email: true, phone: true, address: true, notes: true,
                  designerId: true, createdAt: true, updatedAt: true, deletedAt: true },
      });
    }
    if (!existing) {
      return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });
    }

    const {
      firstName, lastName, phone, email,
      partner1FirstName, partner1LastName, partner1Phone, partner1Email,
      street, floor, apartment, neighborhood, city,
      renovationSameAddress, renovationStreet, renovationFloor,
      renovationApartment, renovationNeighborhood, renovationCity,
      renovationDetails, renovationPurpose, estimatedBudget,
      accessInstructions, notes,
      name: legacyName,
      language,
    } = body;

    // Auto-compute name from structured fields if provided
    const updateData: Record<string, unknown> = {};

    if (firstName !== undefined) updateData.firstName = firstName?.trim() || null;
    if (lastName !== undefined) updateData.lastName = lastName?.trim() || null;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (email !== undefined) updateData.email = email?.trim() || null;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;
    if (partner1FirstName !== undefined) updateData.partner1FirstName = partner1FirstName?.trim() || null;
    if (partner1LastName !== undefined) updateData.partner1LastName = partner1LastName?.trim() || null;
    if (partner1Phone !== undefined) updateData.partner1Phone = partner1Phone?.trim() || null;
    if (partner1Email !== undefined) updateData.partner1Email = partner1Email?.trim() || null;
    if (street !== undefined) updateData.street = street?.trim() || null;
    if (floor !== undefined) updateData.floor = floor?.trim() || null;
    if (apartment !== undefined) updateData.apartment = apartment?.trim() || null;
    if (neighborhood !== undefined) updateData.neighborhood = neighborhood?.trim() || null;
    if (city !== undefined) updateData.city = city?.trim() || null;
    if (renovationSameAddress !== undefined) updateData.renovationSameAddress = renovationSameAddress === true;
    if (renovationStreet !== undefined) updateData.renovationStreet = renovationStreet?.trim() || null;
    if (renovationFloor !== undefined) updateData.renovationFloor = renovationFloor?.trim() || null;
    if (renovationApartment !== undefined) updateData.renovationApartment = renovationApartment?.trim() || null;
    if (renovationNeighborhood !== undefined) updateData.renovationNeighborhood = renovationNeighborhood?.trim() || null;
    if (renovationCity !== undefined) updateData.renovationCity = renovationCity?.trim() || null;
    if (renovationDetails !== undefined) updateData.renovationDetails = renovationDetails?.trim() || null;
    if (renovationPurpose !== undefined) updateData.renovationPurpose = renovationPurpose?.trim() || null;
    if (estimatedBudget !== undefined) updateData.estimatedBudget = estimatedBudget?.toString()?.trim() || null;
    if (accessInstructions !== undefined) updateData.accessInstructions = accessInstructions?.trim() || null;
    // Only accept language values we actually support — otherwise drop the key
    // and keep the existing value.
    if (language !== undefined && (language === "he" || language === "en")) {
      updateData.language = language;
    }

    // Auto-compute name for backwards compatibility
    // Use safe access since existing may lack new fields if DB not migrated
    const ex = existing as Record<string, unknown>;
    const fn = firstName !== undefined ? firstName?.trim() : (ex.firstName as string | undefined);
    const ln = lastName !== undefined ? lastName?.trim() : (ex.lastName as string | undefined);
    const p1fn = partner1FirstName !== undefined ? partner1FirstName?.trim() : (ex.partner1FirstName as string | undefined);
    const p1ln = partner1LastName !== undefined ? partner1LastName?.trim() : (ex.partner1LastName as string | undefined);

    if (fn) {
      let computedName = `${fn} ${(ln || "").trim()}`.trim();
      if (p1fn) {
        const partnerName = `${p1fn} ${(p1ln || "").trim()}`.trim();
        computedName = `${computedName} ו${partnerName}`;
      }
      updateData.name = computedName;
    } else if (legacyName !== undefined) {
      updateData.name = legacyName.trim();
    }

    // Build legacy address from structured fields
    const st = street !== undefined ? street?.trim() : (ex.street as string | undefined);
    const ct = city !== undefined ? city?.trim() : (ex.city as string | undefined);
    const addrParts = [st, ct].filter(Boolean);
    if (addrParts.length > 0) {
      updateData.address = addrParts.join(", ");
    }

    let client;
    try {
      client = await prisma.crmClient.update({
        where: { id: clientId },
        data: updateData,
      });
    } catch (updateError) {
      // Fallback: new columns may not exist — update only core fields
      console.warn("CRM client update with new fields failed, falling back:", updateError);
      const coreData: Record<string, unknown> = {};
      if (updateData.name !== undefined) coreData.name = updateData.name;
      if (updateData.phone !== undefined) coreData.phone = updateData.phone;
      if (updateData.email !== undefined) coreData.email = updateData.email;
      if (updateData.address !== undefined) coreData.address = updateData.address;
      if (updateData.notes !== undefined) coreData.notes = updateData.notes;
      client = await prisma.crmClient.update({
        where: { id: clientId },
        data: coreData,
      });
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error("CRM client update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון לקוח" }, { status: 500 });
  }
}

// DELETE /api/designer/crm/clients/[clientId] — soft delete
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const { clientId } = await params;

    const existing = await prisma.crmClient.findFirst({
      where: { id: clientId, designerId, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });
    }

    await prisma.crmClient.update({
      where: { id: clientId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CRM client delete error:", error);
    return NextResponse.json({ error: "שגיאה במחיקת לקוח" }, { status: 500 });
  }
}
