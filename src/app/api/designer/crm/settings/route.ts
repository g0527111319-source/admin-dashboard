export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/designer/crm/settings
export async function GET(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

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
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
    }

    const body = await req.json();
    const {
      companyName,
      logoUrl,
      primaryColor,
      secondaryColor,
      tagline,
      defaultPhases,
      welcomeMessage,
      completionMessage,
      notifications,
    } = body;

    const settings = await prisma.designerCrmSettings.upsert({
      where: { designerId },
      create: {
        designerId,
        ...(companyName !== undefined && { companyName }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(primaryColor !== undefined && { primaryColor }),
        ...(secondaryColor !== undefined && { secondaryColor }),
        ...(tagline !== undefined && { tagline }),
        ...(defaultPhases !== undefined && { defaultPhases }),
        ...(welcomeMessage !== undefined && { welcomeMessage }),
        ...(completionMessage !== undefined && { completionMessage }),
        ...(notifications !== undefined && { notifications }),
      },
      update: {
        ...(companyName !== undefined && { companyName }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(primaryColor !== undefined && { primaryColor }),
        ...(secondaryColor !== undefined && { secondaryColor }),
        ...(tagline !== undefined && { tagline }),
        ...(defaultPhases !== undefined && { defaultPhases }),
        ...(welcomeMessage !== undefined && { welcomeMessage }),
        ...(completionMessage !== undefined && { completionMessage }),
        ...(notifications !== undefined && { notifications }),
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("CRM settings update error:", error);
    return NextResponse.json({ error: "שגיאה בעדכון הגדרות" }, { status: 500 });
  }
}
