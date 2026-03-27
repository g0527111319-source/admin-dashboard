export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/client-portal/[token]/intake
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const portalToken = await prisma.clientPortalToken.findUnique({
      where: { token },
      include: { client: true },
    });

    if (!portalToken || !portalToken.isActive || portalToken.client.deletedAt) {
      return NextResponse.json({ error: "קישור לא תקין" }, { status: 404 });
    }

    // Get the first active project for this client
    const project = await prisma.crmProject.findFirst({
      where: {
        clientId: portalToken.clientId,
        deletedAt: null,
        status: "ACTIVE",
      },
      include: {
        projectSettings: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!project) {
      return NextResponse.json({ intake: {} });
    }

    // Get intake data from projectSettings.customConfig
    const customConfig = (project.projectSettings?.customConfig as Record<string, unknown>) || {};
    const intake = (customConfig.intake as Record<string, unknown>) || {};

    return NextResponse.json({
      intake: {
        propertyAddress: project.address || "",
        city: (intake.city as string) || "",
        renovationDetails: (intake.renovationDetails as string) || "",
        renovationPurpose: (intake.renovationPurpose as string) || "",
        estimatedBudget: project.estimatedBudget || "",
        ...intake,
      },
      projectId: project.id,
    });
  } catch (error) {
    console.error("Client intake fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת נתונים" }, { status: 500 });
  }
}

// PATCH /api/client-portal/[token]/intake
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const portalToken = await prisma.clientPortalToken.findUnique({
      where: { token },
      include: { client: true },
    });

    if (!portalToken || !portalToken.isActive || portalToken.client.deletedAt) {
      return NextResponse.json({ error: "קישור לא תקין" }, { status: 404 });
    }

    const body = await req.json();
    const { propertyAddress, city, renovationDetails, renovationPurpose, estimatedBudget, projectId } = body;

    // Find the target project
    const project = await prisma.crmProject.findFirst({
      where: {
        id: projectId || undefined,
        clientId: portalToken.clientId,
        deletedAt: null,
      },
      include: { projectSettings: true },
    });

    if (!project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    // Update project-level fields (address, estimatedBudget)
    await prisma.crmProject.update({
      where: { id: project.id },
      data: {
        ...(propertyAddress !== undefined && { address: propertyAddress }),
        ...(estimatedBudget !== undefined && { estimatedBudget: estimatedBudget ? parseFloat(estimatedBudget) : null }),
      },
    });

    // Store additional intake data in projectSettings.customConfig
    const existingConfig = (project.projectSettings?.customConfig as Record<string, unknown>) || {};
    const intakeData = {
      ...(existingConfig.intake as Record<string, unknown> || {}),
      city,
      renovationDetails,
      renovationPurpose,
      updatedAt: new Date().toISOString(),
    };

    await prisma.crmProjectSettings.upsert({
      where: { projectId: project.id },
      create: {
        projectId: project.id,
        customConfig: { ...existingConfig, intake: intakeData },
      },
      update: {
        customConfig: { ...existingConfig, intake: intakeData },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Client intake update error:", error);
    return NextResponse.json({ error: "שגיאה בשמירת נתונים" }, { status: 500 });
  }
}
