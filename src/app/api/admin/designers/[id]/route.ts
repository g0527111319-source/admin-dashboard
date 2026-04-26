import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// DELETE /api/admin/designers/[id]
//   default: soft delete (isActive=false) — designer hidden, all data kept.
//   ?hard=true: permanent delete — designer row + all dependent data removed.
//     Caller must also send {confirmName: "<exact full name>"} in the body
//     to prevent accidental nukes.
//
// The schema only has ON DELETE CASCADE for DesignerProject, DesignerSubscription,
// LeadInterest and LeadAssignment. Every other designer-owned table (all CRM
// data, deals, recommendations, whatsapp config) has no cascade rule and would
// block prisma.designer.delete() with a foreign-key error. So we explicitly
// remove children inside one transaction.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "חסר מזהה מעצבת" }, { status: 400 });

    const url = new URL(req.url);
    const isHard = url.searchParams.get("hard") === "true";

    if (!isHard) {
      // Soft delete
      const updated = await prisma.designer.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json(updated);
    }

    // Hard delete — verify confirmName matches the designer's full name first.
    const body = await req.json().catch(() => ({})) as { confirmName?: string };
    const confirmName = (body.confirmName || "").trim();
    if (!confirmName) {
      return NextResponse.json(
        { error: "מחיקה לצמיתות דורשת אישור עם שם המעצבת" },
        { status: 400 },
      );
    }

    const designer = await prisma.designer.findUnique({
      where: { id },
      select: { id: true, fullName: true },
    });
    if (!designer) {
      return NextResponse.json({ error: "מעצבת לא נמצאה" }, { status: 404 });
    }
    if (designer.fullName.trim() !== confirmName) {
      return NextResponse.json(
        { error: "שם המעצבת לאישור אינו תואם" },
        { status: 400 },
      );
    }

    // Cascade-delete dependent rows that don't have ON DELETE CASCADE in the
    // schema. The four tables that DO cascade automatically (DesignerProject,
    // DesignerSubscription, LeadInterest, LeadAssignment) are skipped.
    const result = await prisma.$transaction(
      async (tx) => {
        const counts: Record<string, number> = {};

        // CRM data
        counts.crmTasks = (await tx.crmTask.deleteMany({ where: { designerId: id } })).count;
        counts.crmActivityLogs = (await tx.crmActivityLog.deleteMany({ where: { designerId: id } })).count;
        counts.crmAutomationRules = (await tx.crmAutomationRule.deleteMany({ where: { designerId: id } })).count;
        counts.crmCalendarEvents = (await tx.crmCalendarEvent.deleteMany({ where: { designerId: id } })).count;
        counts.crmClientRecommendations = (await tx.crmClientRecommendation.deleteMany({ where: { designerId: id } })).count;
        counts.crmClients = (await tx.crmClient.deleteMany({ where: { designerId: id } })).count;
        counts.crmContractTemplates = (await tx.crmContractTemplate.deleteMany({ where: { designerId: id } })).count;
        counts.crmMessageTemplates = (await tx.crmMessageTemplate.deleteMany({ where: { designerId: id } })).count;
        counts.crmOnboardingTemplates = (await tx.crmOnboardingTemplate.deleteMany({ where: { designerId: id } })).count;
        counts.crmQuoteTemplates = (await tx.crmQuoteTemplate.deleteMany({ where: { designerId: id } })).count;
        counts.crmStyleQuizTemplates = (await tx.crmStyleQuizTemplate.deleteMany({ where: { designerId: id } })).count;
        counts.crmSuppliers = (await tx.crmSupplier.deleteMany({ where: { designerId: id } })).count;
        counts.crmWebhookEndpoints = (await tx.crmWebhookEndpoint.deleteMany({ where: { designerId: id } })).count;
        counts.crmWorkflowTemplates = (await tx.crmWorkflowTemplate.deleteMany({ where: { designerId: id } })).count;

        // Designer-specific
        counts.designerCrmSettings = (await tx.designerCrmSettings.deleteMany({ where: { designerId: id } })).count;
        counts.designerGoogleCalendar = (await tx.designerGoogleCalendar.deleteMany({ where: { designerId: id } })).count;

        // Cross-domain references
        counts.deals = (await tx.deal.deleteMany({ where: { designerId: id } })).count;
        counts.recommendations = (await tx.recommendation.deleteMany({ where: { designerId: id } })).count;
        counts.whatsAppConfigs = (await tx.whatsAppConfig.deleteMany({ where: { designerId: id } })).count;
        counts.whatsAppMessages = (await tx.whatsAppMessage.deleteMany({ where: { designerId: id } })).count;

        // Finally the designer (cascades remaining: DesignerProject,
        // DesignerSubscription, LeadInterest, LeadAssignment).
        await tx.designer.delete({ where: { id } });
        return counts;
      },
      { timeout: 20000 },
    );

    return NextResponse.json({
      success: true,
      message: `${designer.fullName} נמחקה לצמיתות`,
      deleted: result,
    });
  } catch (error) {
    console.error("Admin designer delete error:", error);
    return NextResponse.json({ error: "שגיאה במחיקת מעצבת" }, { status: 500 });
  }
}
