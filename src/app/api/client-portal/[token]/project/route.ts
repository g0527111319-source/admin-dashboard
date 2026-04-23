export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/client-portal/[token]/project
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find active portal token. Include the owning designer so we can surface
    // their logo + display name in the client dashboard header.
    const portalToken = await prisma.clientPortalToken.findUnique({
      where: { token },
      include: {
        client: {
          include: {
            designer: {
              select: {
                id: true,
                fullName: true,
                logoUrl: true,
                crmSettings: { select: { logoUrl: true, companyName: true } },
              },
            },
          },
        },
      },
    });

    if (!portalToken || !portalToken.isActive) {
      return NextResponse.json({ error: "קישור לא תקין או לא פעיל" }, { status: 404 });
    }

    if (portalToken.client.deletedAt) {
      return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 404 });
    }

    // Get active projects for this client with phases and visible docs/photos
    const projects = await prisma.crmProject.findMany({
      where: {
        clientId: portalToken.clientId,
        deletedAt: null,
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        projectType: true,
        status: true,
        address: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        updatedAt: true,
        // notes excluded — internal only
        phases: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            sortOrder: true,
            isCurrent: true,
            isCompleted: true,
            startedAt: true,
            completedAt: true,
          },
        },
        documents: {
          where: { isVisibleToClient: true },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            fileSize: true,
            title: true,
            description: true,
            category: true,
            createdAt: true,
          },
        },
        photos: {
          where: { isVisibleToClient: true },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            imageUrl: true,
            caption: true,
            phaseName: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Update last used timestamp
    await prisma.clientPortalToken.update({
      where: { id: portalToken.id },
      data: { lastUsedAt: new Date() },
    });

    const designer = portalToken.client.designer;
    const designerLogo = designer?.logoUrl || designer?.crmSettings?.logoUrl || null;
    const designerName = designer?.crmSettings?.companyName || designer?.fullName || null;

    return NextResponse.json({
      client: {
        id: portalToken.client.id,
        name: portalToken.client.name,
      },
      designer: designer
        ? { id: designer.id, name: designerName, logoUrl: designerLogo }
        : null,
      projects,
    });
  } catch (error) {
    console.error("Portal project fetch error:", error);
    return NextResponse.json({ error: "שגיאה בטעינת פרטי פרויקט" }, { status: 500 });
  }
}
