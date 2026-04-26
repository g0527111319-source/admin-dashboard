export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

// GET /api/designer/crm/settings
export async function GET(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    let settings = await prisma.designerCrmSettings.findUnique({
      where: { designerId },
    });

    // Auto-create settings if not exists
    if (!settings) {
      settings = await prisma.designerCrmSettings.create({
        data: { designerId },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("CRM settings fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת הגדרות" }, { status: 500 });
  }
}

// PATCH /api/designer/crm/settings
export async function PATCH(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

    const body = await req.json();
    const {
      companyName,
      logoUrl,
      portfolioHeroImageUrl,
      primaryColor,
      secondaryColor,
      tagline,
      defaultPhases,
      welcomeMessage,
      completionMessage,
      notifications,
      processDurations,
    } = body;

    const baseFields = {
      ...(companyName !== undefined && { companyName }),
      ...(logoUrl !== undefined && { logoUrl }),
      ...(portfolioHeroImageUrl !== undefined && { portfolioHeroImageUrl }),
      ...(primaryColor !== undefined && { primaryColor }),
      ...(secondaryColor !== undefined && { secondaryColor }),
      ...(tagline !== undefined && { tagline }),
      ...(defaultPhases !== undefined && { defaultPhases }),
      ...(welcomeMessage !== undefined && { welcomeMessage }),
      ...(completionMessage !== undefined && { completionMessage }),
      ...(notifications !== undefined && { notifications }),
    };

    let settings;
    try {
      settings = await prisma.designerCrmSettings.upsert({
        where: { designerId },
        create: {
          designerId,
          ...baseFields,
          ...(processDurations !== undefined && { processDurations }),
        },
        update: {
          ...baseFields,
          ...(processDurations !== undefined && { processDurations }),
        },
      });
    } catch {
      // processDurations column may not exist yet — fall back without it
      settings = await prisma.designerCrmSettings.upsert({
        where: { designerId },
        create: { designerId, ...baseFields },
        update: baseFields,
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("CRM settings update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון הגדרות" }, { status: 500 });
  }
}
