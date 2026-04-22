export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { ttlForStatus } from "@/lib/annotation-ttl";
import { sendEmail } from "@/lib/email";
import { validateShapeInput, type ShapeInput } from "@/lib/annotation-shapes";

// ==========================================
// Public annotations for a shared model
// GET  /api/public/models/[token]/annotations  → list active pins
// POST /api/public/models/[token]/annotations  → client drops a pin
// ==========================================

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.ziratadrichalut.co.il"
).trim();

function getIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
}

async function resolveModelByToken(token: string) {
  return prisma.model3D.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      expiresAt: true,
      project: {
        select: {
          title: true,
          designer: {
            select: { id: true, fullName: true, email: true },
          },
        },
      },
    },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const model = await resolveModelByToken(params.token);
    if (!model) {
      return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
    }

    // Only serve pins that haven't expired yet. The cron will eventually
    // hard-delete them, but we filter here so the UI never flashes stale pins
    // between cron runs.
    const now = new Date();
    const annotations = await prisma.annotation.findMany({
      where: {
        modelId: model.id,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "asc" },
      include: {
        comments: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            body: true,
            authorType: true,
            authorName: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({ annotations });
  } catch (error) {
    console.error("[public annotations GET] error:", error);
    return NextResponse.json({ error: "שגיאה" }, { status: 500 });
  }
}

type CreateBody = ShapeInput & {
  label?: string;
  question?: string;
  clientName?: string;
  clientEmail?: string;
};

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const ip = getIp(req);

  // 10 pins per hour per IP — keeps abuse limited while leaving plenty of
  // room for a genuine review session
  const rl = await rateLimit(`annotation-create:${ip}`, 10, 60 * 60);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "הגעת למגבלת ההערות. נסה שוב בעוד שעה." },
      { status: 429 }
    );
  }

  try {
    const body: CreateBody = await req.json();

    // Shape + coords validation lives in one shared helper so the public
    // and client-portal routes stay in lockstep.
    const validation = validateShapeInput(body);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const shape = validation.data;

    const model = await resolveModelByToken(params.token);
    if (!model) {
      return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
    }

    if (model.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "הקובץ כבר לא זמין" },
        { status: 410 }
      );
    }

    const label = (body.label || "").toString().trim().slice(0, 80) || null;
    const question = (body.question || "").toString().trim().slice(0, 1000) || null;
    const clientName = (body.clientName || "").toString().trim().slice(0, 80) || "אורח";
    const clientEmail = (body.clientEmail || "").toString().trim().slice(0, 120) || null;

    const annotation = await prisma.annotation.create({
      data: {
        modelId: model.id,
        shape: shape.shape,
        posX: shape.posX,
        posY: shape.posY,
        posZ: shape.posZ,
        normX: shape.normX,
        normY: shape.normY,
        normZ: shape.normZ,
        pos2X: shape.pos2X,
        pos2Y: shape.pos2Y,
        pos2Z: shape.pos2Z,
        norm2X: shape.norm2X,
        norm2Y: shape.norm2Y,
        norm2Z: shape.norm2Z,
        radius: shape.radius,
        label,
        question,
        status: "OPEN",
        createdBy: clientEmail || ip,
        createdByType: "client",
        expiresAt: ttlForStatus("OPEN", model.expiresAt),
      },
    });

    // Fire-and-forget designer notification. We don't await the result
    // because email provider hiccups shouldn't block the client's UI.
    if (question && model.project.designer.email) {
      const projectTitle = model.project.title || "פרויקט";
      const designerName = model.project.designer.fullName;
      sendEmail({
        to: model.project.designer.email,
        subject: `הערה חדשה על "${projectTitle}"`,
        html: `
          <div dir="rtl" style="font-family: system-ui; max-width: 600px; margin: 0 auto; padding: 24px; background: #FAFAF8; color: #1A1A1A;">
            <h2 style="font-family: 'Frank Ruhl Libre', serif; color: #8B6914; margin: 0 0 16px;">הערה חדשה ב-3D</h2>
            <p>שלום ${designerName},</p>
            <p>${clientName} השאיר/ה הערה על המודל <strong>${projectTitle}</strong>:</p>
            <blockquote style="border-right: 3px solid #C9A84C; padding: 12px 16px; background: #F5F1E8; margin: 16px 0;">
              ${question.replace(/</g, "&lt;")}
            </blockquote>
            <p style="margin-top: 24px;">
              <a href="${SITE_URL}/designer/${model.project.designer.id}" style="color: #8B6914; text-decoration: underline;">
                כנס לניהול הפרויקט →
              </a>
            </p>
            <p style="margin-top: 24px; font-size: 12px; color: #8B6914;">
              ההערה הזו נמחקת אוטומטית תוך 24 שעות אם לא תענה/תסמן כחשובה.
            </p>
          </div>
        `,
      }).catch((err) => {
        console.error("[annotation email] failed:", err);
      });
    }

    return NextResponse.json({ annotation }, { status: 201 });
  } catch (error) {
    console.error("[public annotations POST] error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת הערה" }, { status: 500 });
  }
}
