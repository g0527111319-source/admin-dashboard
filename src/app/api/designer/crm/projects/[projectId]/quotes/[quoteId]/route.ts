export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

// PATCH /api/designer/crm/projects/[projectId]/quotes/[quoteId] — עדכון הצעת מחיר
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; quoteId: string }> }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const { projectId, quoteId } = await params;

    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    const body = await req.json();
    const { title, services, totalAmount, paymentTerms, validUntil, status, notesInternal } = body;

    const quote = await prisma.crmQuote.update({
      where: { id: quoteId },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(services !== undefined && { services }),
        ...(totalAmount !== undefined && { totalAmount }),
        ...(paymentTerms !== undefined && { paymentTerms: paymentTerms?.trim() ?? null }),
        ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null }),
        ...(status !== undefined && { status }),
        ...(notesInternal !== undefined && { notesInternal: notesInternal?.trim() ?? null }),
      },
    });

    return NextResponse.json(quote);
  } catch (error) {
    console.error("CRM quote update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון הצעת מחיר" }, { status: 500 });
  }
}

// DELETE /api/designer/crm/projects/[projectId]/quotes/[quoteId] — מחיקת הצעת מחיר
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; quoteId: string }> }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const { projectId, quoteId } = await params;

    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    await prisma.crmQuote.delete({ where: { id: quoteId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CRM quote delete error:", error);
    return NextResponse.json({ error: "שגיאה במחיקת הצעת מחיר" }, { status: 500 });
  }
}
