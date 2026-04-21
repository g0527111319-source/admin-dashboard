export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { ttlForStatus } from "@/lib/annotation-ttl";

// ==========================================
// Public comment on an annotation thread
// POST /api/public/annotations/[id]/comments
// ==========================================
// Client-side reply into an existing thread. The annotation must still
// be active (not expired) and we extend its TTL so the designer sees a
// fresh window to respond.

function getIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
}

type Body = {
  body?: string;
  authorName?: string;
  authorEmail?: string;
};

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ip = getIp(req);
  const rl = await rateLimit(`comment-create:${ip}`, 20, 60 * 60);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "הגעת למגבלת התגובות. נסה שוב בעוד שעה." },
      { status: 429 }
    );
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

    const annotation = await prisma.annotation.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        model: { select: { expiresAt: true } },
      },
    });

    if (!annotation) {
      return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
    }

    if (annotation.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "ההערה כבר לא פעילה" },
        { status: 410 }
      );
    }

    const authorName = (payload.authorName || "").toString().trim().slice(0, 80) || "אורח";
    const authorEmail = (payload.authorEmail || "").toString().trim().slice(0, 120) || null;

    // Create comment + bump TTL on the parent annotation in a single round-trip.
    // Client reply keeps status at whatever it was, but we refresh the TTL to
    // the current status's window so the thread doesn't expire mid-conversation.
    const [comment] = await prisma.$transaction([
      prisma.annotationComment.create({
        data: {
          annotationId: annotation.id,
          body,
          authorType: "client",
          authorName,
          authorEmail,
        },
      }),
      prisma.annotation.update({
        where: { id: annotation.id },
        data: {
          expiresAt: ttlForStatus(annotation.status, annotation.model.expiresAt),
        },
      }),
    ]);

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("[public comments POST] error:", error);
    return NextResponse.json({ error: "שגיאה בהוספת תגובה" }, { status: 500 });
  }
}
