export const dynamic = "force-dynamic";
// Server-side conversion can chew CPU — ask Vercel for the longest
// available runtime so large GLBs don't time out mid-Draco.
export const maxDuration = 300; // seconds

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { uploadToR2, generateFileKey, getPublicUrl, deleteFromR2 } from "@/lib/r2";
import { convertModel, UnsupportedFormatError } from "@/lib/model-convert";

// ==========================================
// Convert a model to Draco-compressed GLB
// POST /api/designer/crm/models/[id]/convert
// ==========================================
// Flow:
//   1. Ownership check
//   2. Mark status=processing (so the public viewer shows a spinner)
//   3. Download original from R2
//   4. Convert (format-dependent pipeline in lib/model-convert)
//   5. Upload result to R2 under a new key
//   6. Update DB: gltfUrl, gltfSize, status=ready
//   7. On failure: status=failed + error message, preserve original
//
// The POST /models creator fire-and-forgets this route; the designer
// UI polls the model list and shows the status badge.

async function loadOwned(designerId: string, modelId: string) {
  return prisma.model3D.findFirst({
    where: { id: modelId, project: { designerId } },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const designerId = req.headers.get("x-user-id");
  if (!designerId) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  const model = await loadOwned(designerId, params.id);
  if (!model) {
    return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  }

  // Don't re-convert a model that's already ready or currently in flight.
  // Fail-state IS allowed to retry so the designer can re-kick after a
  // fix.
  if (model.conversionStatus === "ready") {
    return NextResponse.json({ ok: true, alreadyReady: true });
  }
  if (model.conversionStatus === "processing") {
    return NextResponse.json({ ok: true, inFlight: true });
  }

  await prisma.model3D.update({
    where: { id: model.id },
    data: { conversionStatus: "processing", conversionError: null },
  });

  try {
    // ── Download original from R2 ─────────────────────────────────
    const fetchRes = await fetch(model.originalUrl);
    if (!fetchRes.ok) {
      throw new Error(`הורדה מ-R2 נכשלה (${fetchRes.status})`);
    }
    const inputBuffer = Buffer.from(await fetchRes.arrayBuffer());

    // ── Convert ──────────────────────────────────────────────────
    const { glb, size } = await convertModel(inputBuffer, model.originalFormat);

    // ── Upload result to R2 ──────────────────────────────────────
    const key = generateFileKey("models-3d-gltf", `${model.id}.glb`, designerId);
    await uploadToR2(glb, key, "model/gltf-binary");
    const publicUrl = getPublicUrl(key);

    // ── Update DB ────────────────────────────────────────────────
    // Replace any stale gltf from a prior failed conversion.
    const prevGltfKey = model.gltfR2Key && model.gltfR2Key !== model.originalR2Key
      ? model.gltfR2Key
      : null;

    const updated = await prisma.model3D.update({
      where: { id: model.id },
      data: {
        gltfUrl: publicUrl,
        gltfR2Key: key,
        gltfSize: size,
        conversionStatus: "ready",
        conversionError: null,
      },
    });

    // Best-effort cleanup of the previous (failed) gltf output.
    if (prevGltfKey) {
      deleteFromR2(prevGltfKey).catch((err) => {
        console.error("[convert] cleanup of prev gltf failed:", err);
      });
    }

    return NextResponse.json({
      ok: true,
      gltfUrl: updated.gltfUrl,
      gltfSize: updated.gltfSize,
    });
  } catch (error) {
    const msg =
      error instanceof UnsupportedFormatError
        ? error.message
        : error instanceof Error
        ? error.message
        : "שגיאה לא ידועה בהמרה";
    console.error(`[convert] model ${model.id} failed:`, error);

    await prisma.model3D.update({
      where: { id: model.id },
      data: {
        conversionStatus: "failed",
        conversionError: msg.slice(0, 500),
      },
    });

    return NextResponse.json(
      { ok: false, error: msg },
      { status: error instanceof UnsupportedFormatError ? 400 : 500 }
    );
  }
}
