export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

// ==========================================
// Designer annotations list (inbox view)
// GET /api/designer/crm/annotations?modelId=X   → annotations on one model
// GET /api/designer/crm/annotations?projectId=X → annotations on one project
// GET /api/designer/crm/annotations?all=true    → every annotation across
//                                                 every model the designer
//                                                 owns (global sidebar)
// ==========================================
// Returns only annotations that still have time left — the designer
// doesn't need to see the cron's graveyard.

export async function GET(req: NextRequest) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  const designerId = auth.userId;

  try {
    const { searchParams } = new URL(req.url);
    const modelId = searchParams.get("modelId");
    const projectId = searchParams.get("projectId");
    const all = searchParams.get("all") === "true";

    if (!modelId && !projectId && !all) {
      return NextResponse.json(
        { error: "חסר modelId או projectId (או all=true)" },
        { status: 400 }
      );
    }

    // Scope everything through the designer ownership chain so someone
    // guessing a modelId can't leak another designer's annotations.
    const where: Prisma.AnnotationWhereInput = modelId
      ? {
          modelId,
          model: { project: { designerId } },
          expiresAt: { gt: new Date() },
        }
      : projectId
      ? {
          model: { projectId, project: { designerId } },
          expiresAt: { gt: new Date() },
        }
      : {
          // all=true — every annotation on every model of every project
          // this designer owns. Still honour TTL.
          model: { project: { designerId } },
          expiresAt: { gt: new Date() },
        };

    const annotations = await prisma.annotation.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        comments: {
          orderBy: { createdAt: "asc" },
        },
        model: {
          select: {
            id: true,
            title: true,
            projectId: true,
            originalFormat: true,
            project: { select: { id: true, title: true } },
            crmClient: { select: { id: true, name: true } },
            crmProject: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({ annotations });
  } catch (error) {
    console.error("[designer annotations GET] error:", error);
    return NextResponse.json({ error: "שגיאה" }, { status: 500 });
  }
}
