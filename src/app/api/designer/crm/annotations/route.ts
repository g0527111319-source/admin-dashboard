export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ==========================================
// Designer annotations list (inbox view)
// GET /api/designer/crm/annotations?modelId=X
// GET /api/designer/crm/annotations?projectId=X
// ==========================================
// Returns only annotations that still have time left — the designer
// doesn't need to see the cron's graveyard.

export async function GET(req: NextRequest) {
  const designerId = req.headers.get("x-user-id");
  if (!designerId) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const modelId = searchParams.get("modelId");
    const projectId = searchParams.get("projectId");

    if (!modelId && !projectId) {
      return NextResponse.json(
        { error: "חסר modelId או projectId" },
        { status: 400 }
      );
    }

    // Scope everything through the designer ownership chain so someone
    // guessing a modelId can't leak another designer's annotations.
    const where = modelId
      ? {
          modelId,
          model: { project: { designerId } },
          expiresAt: { gt: new Date() },
        }
      : {
          model: { projectId: projectId!, project: { designerId } },
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
          select: { id: true, title: true, projectId: true },
        },
      },
    });

    return NextResponse.json({ annotations });
  } catch (error) {
    console.error("[designer annotations GET] error:", error);
    return NextResponse.json({ error: "שגיאה" }, { status: 500 });
  }
}
