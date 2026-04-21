export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ttlForStatus } from "@/lib/annotation-ttl";

// ==========================================
// Designer reply into an annotation thread
// POST /api/designer/crm/annotations/[id]/reply
// ==========================================
// Adds a comment from the designer, flips status to ANSWERED, and
// extends the TTL to 48h so the client has time to read.

type Body = {
  body?: string;
};

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const designerId = req.headers.get("x-user-id");
  if (!designerId) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  try {
    const payload: Body = await req.json();
    const body = (payload.body || "").toString().trim().slice(0, 1000);
    if (!body) {
      return NextResponse.json(
        { error: "תוכן תגובה חסר" },
        { status: 400 }
      );
    }

    // Load + ownership check + designer profile for author name all in one hop
    const annotation = await prisma.annotation.findFirst({
      where: {
        id: params.id,
        model: { project: { designerId } },
      },
      include: {
        model: { select: { expiresAt: true } },
      },
    });

    if (!annotation) {
      return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
    }

    const designer = await prisma.designer.findUnique({
      where: { id: designerId },
      select: { fullName: true, email: true },
    });

    const authorName = designer?.fullName || "המעצבת";

    const [comment] = await prisma.$transaction([
      prisma.annotationComment.create({
        data: {
          annotationId: annotation.id,
          body,
          authorType: "designer",
          authorName,
          authorEmail: designer?.email ?? null,
        },
      }),
      prisma.annotation.update({
        where: { id: annotation.id },
        data: {
          status: "ANSWERED",
          expiresAt: ttlForStatus("ANSWERED", annotation.model.expiresAt),
        },
      }),
    ]);

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("[designer reply POST] error:", error);
    return NextResponse.json({ error: "שגיאה בתגובה" }, { status: 500 });
  }
}
