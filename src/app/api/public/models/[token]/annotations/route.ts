export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { ttlForStatus } from "@/lib/annotation-ttl";
import { sendEmail } from "@/lib/email";

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

type CreateBody = {
  posX?: number;
  posY?: number;
  posZ?: number;
  normX?: number;
  normY?: number;
  normZ?: number;
  label?: string;
  question?: string;
  clientName?: string;
  clientEmail?: string;
};

function isFiniteNum(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

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

    // All 6 coords must be real numbers — the client has to raycast onto
    // the mesh, get a world position + surface normal, and send both.
    if (
      !isFiniteNum(body.posX) || !isFiniteNum(body.posY) || !isFiniteNum(body.posZ) ||
      !isFiniteNum(body.normX) || !isFiniteNum(body.normY) || !isFiniteNum(body.normZ)
    ) {
      return NextResponse.json(
        { error: "חסרים ערכי מיקום תקינים" },
        { status: 400 }
      );
    }

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
        posX: body.posX,
        posY: body.posY,
        posZ: body.posZ,
        normX: body.normX,
        normY: body.normY,
        normZ: body.normZ,
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
