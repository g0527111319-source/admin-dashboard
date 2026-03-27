export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// PATCH /api/designer/crm/onboarding/[clientId]/[itemId] — עדכון סטטוס פריט כניסה
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string; itemId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { clientId, itemId } = await params;
    const body = await req.json();

    // Verify designer owns client
    const client = await prisma.crmClient.findFirst({
      where: { id: clientId, designerId, deletedAt: null },
    });
    if (!client) {
      return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });
    }

    const existing = await prisma.crmOnboardingItem.findFirst({
      where: { id: itemId, clientId },
    });
    if (!existing) {
      return NextResponse.json({ error: "פריט לא נמצא" }, { status: 404 });
    }

    const { isCompleted, completedBy } = body;

    const item = await prisma.crmOnboardingItem.update({
      where: { id: itemId },
      data: {
        ...(isCompleted !== undefined && {
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
        }),
        ...(completedBy !== undefined && { completedBy }),
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("CRM onboarding item update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון פריט כניסה" }, { status: 500 });
  }
}

// DELETE /api/designer/crm/onboarding/[clientId]/[itemId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string; itemId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const { clientId, itemId } = await params;

    // Verify designer owns client
    const client = await prisma.crmClient.findFirst({
      where: { id: clientId, designerId, deletedAt: null },
    });
    if (!client) {
      return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });
    }

    const existing = await prisma.crmOnboardingItem.findFirst({
      where: { id: itemId, clientId },
    });
    if (!existing) {
      return NextResponse.json({ error: "פריט לא נמצא" }, { status: 404 });
    }

    await prisma.crmOnboardingItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CRM onboarding item delete error:", error);
    return NextResponse.json({ error: "שגיאה במחיקת פריט כניסה" }, { status: 500 });
  }
}
