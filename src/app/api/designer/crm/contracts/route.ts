import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// GET /api/designer/crm/contracts — list all contracts
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = { designerId };
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;

    const contracts = await prisma.crmContract.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            client: { select: { id: true, name: true, email: true, phone: true, address: true } },
          },
        },
        template: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(contracts);
  } catch (error) {
    console.error("Contracts fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת חוזים" }, { status: 500 });
  }
}

// POST /api/designer/crm/contracts — create contract
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const body = await req.json();
    const { projectId, templateId, title, totalAmount, pdfUrl, notesInternal, clientName, clientEmail, clientPhone, designerFieldValues, clientFieldValues } = body;

    if (!projectId || !title?.trim()) {
      return NextResponse.json({ error: "פרויקט וכותרת הם שדות חובה" }, { status: 400 });
    }

    // Verify project ownership and get client data
    const project = await prisma.crmProject.findFirst({
      where: { id: projectId, designerId, deletedAt: null },
      include: { client: { select: { id: true, name: true, email: true, phone: true, address: true } } },
    });
    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    // Auto-populate client details from saved client if not provided
    const resolvedClientName = clientName?.trim() || project.client?.name || null;
    const resolvedClientEmail = clientEmail?.trim() || project.client?.email || null;
    const resolvedClientPhone = clientPhone?.trim() || project.client?.phone || null;

    // Auto contract number
    const contractCount = await prisma.crmContract.count({ where: { designerId } });
    const contractNumber = `CTR-${String(contractCount + 1).padStart(4, "0")}`;

    // Pull the template-level designer signature (if any) so the designer
    // signs ONCE on the template and we auto-apply it to every contract
    // created from that template. Storing in template.styling.designerSignature
    // avoids a schema migration. If the template has no signature, we leave
    // the contract's designerSignatureData null — the designer can still sign
    // the specific contract directly.
    let preSignedData: unknown = null;
    let preSignedAt: Date | null = null;
    if (templateId) {
      const template = await prisma.crmContractTemplate.findFirst({
        where: { id: templateId, designerId },
        select: { styling: true },
      });
      const styling = (template?.styling ?? {}) as Record<string, unknown>;
      const sig = styling.designerSignature as { dataUrl?: string; signedAt?: string } | undefined;
      if (sig?.dataUrl) {
        preSignedData = sig.dataUrl;
        // Prefer the template-level timestamp but fall back to "now" if absent.
        preSignedAt = sig.signedAt ? new Date(sig.signedAt) : new Date();
      }
    }

    const contract = await prisma.crmContract.create({
      data: {
        projectId,
        designerId,
        templateId: templateId || null,
        title: title.trim(),
        totalAmount: totalAmount || 0,
        contractNumber,
        pdfUrl: pdfUrl?.trim() || null,
        notesInternal: notesInternal?.trim() || null,
        clientName: resolvedClientName,
        clientEmail: resolvedClientEmail,
        clientPhone: resolvedClientPhone,
        designerFieldValues: designerFieldValues || {},
        clientFieldValues: clientFieldValues || {},
        // Apply the template's reusable signature if present — the designer
        // signed the template, so every contract from it inherits that signature.
        ...(preSignedData ? {
          designerSignatureData: preSignedData as object,
          designerSignedAt: preSignedAt,
        } : {}),
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            client: { select: { id: true, name: true, email: true, phone: true, address: true } },
          },
        },
        template: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(contract, { status: 201 });
  } catch (error) {
    console.error("Contract create error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת חוזה" }, { status: 500 });
  }
}
