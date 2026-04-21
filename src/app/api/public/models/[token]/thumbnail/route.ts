export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { uploadToR2, generateFileKey, getPublicUrl } from "@/lib/r2";
import { rateLimit } from "@/lib/rate-limit";

// ==========================================
// Public thumbnail upload
// POST /api/public/models/[token]/thumbnail
// ==========================================
// First client who opens the viewer captures a canvas.toBlob("image/jpeg")
// and POSTs it here as application/octet-stream. We store once — later
// visitors see the pre-rendered thumbnail without re-running the capture.
// If a thumbnail already exists, we silently 200 so retries are cheap.
//
// Hard cap at 300KB — a 512×384 JPEG at q=0.75 is typically ~30-60KB, so
// anything bigger is suspicious (or client dimensions ran wild).

const MAX_THUMB_BYTES = 300 * 1024;

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  // Lightweight per-IP rate limit so no one can spam-overwrite thumbnails
  // across tokens (the token guard would stop cross-token, but this adds
  // a second layer against a hot loop on one token).
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const rl = await rateLimit(`thumb:${ip}`, 30, 3600);
  if (!rl.allowed) {
    return NextResponse.json({ error: "יותר מדי בקשות, נסי שוב מאוחר יותר" }, { status: 429 });
  }

  const model = await prisma.model3D.findUnique({
    where: { shareToken: params.token },
    select: {
      id: true,
      thumbnailUrl: true,
      expiresAt: true,
      project: { select: { designerId: true } },
    },
  });

  if (!model) {
    return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  }
  if (model.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "פג תוקף" }, { status: 410 });
  }
  // First-write-wins. No-op if we already captured one — the viewer should
  // check the metadata response and skip the POST, but belt-and-suspenders.
  if (model.thumbnailUrl) {
    return NextResponse.json({ ok: true, skipped: true, thumbnailUrl: model.thumbnailUrl });
  }

  let buffer: Buffer;
  try {
    const arr = await req.arrayBuffer();
    buffer = Buffer.from(arr);
  } catch {
    return NextResponse.json({ error: "תוכן לא תקין" }, { status: 400 });
  }

  if (buffer.byteLength === 0 || buffer.byteLength > MAX_THUMB_BYTES) {
    return NextResponse.json({ error: "גודל ה-thumbnail חורג מהמותר" }, { status: 413 });
  }

  // Sniff magic bytes — accept JPEG (FF D8 FF) or PNG (89 50 4E 47). The
  // client captures JPEG by default; PNG is allowed for transparency but
  // weighs more.
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng =
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  if (!isJpeg && !isPng) {
    return NextResponse.json({ error: "פורמט תמונה לא נתמך" }, { status: 400 });
  }

  const ext = isJpeg ? ".jpg" : ".png";
  const contentType = isJpeg ? "image/jpeg" : "image/png";
  const key = generateFileKey(
    "models-3d-thumbs",
    `${model.id}${ext}`,
    model.project.designerId
  );
  await uploadToR2(buffer, key, contentType);
  const url = getPublicUrl(key);

  await prisma.model3D.update({
    where: { id: model.id },
    data: { thumbnailUrl: url },
  });

  return NextResponse.json({ ok: true, thumbnailUrl: url });
}
