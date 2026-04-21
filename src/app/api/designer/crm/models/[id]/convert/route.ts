export const dynamic = "force-dynamic";
// Server-side conversion can chew CPU — ask Vercel for the longest
// available runtime so large GLBs don't time out mid-Draco.
export const maxDuration = 300; // seconds

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { uploadToR2, generateFileKey, getPublicUrl, deleteFromR2 } from "@/lib/r2";
import {
  convertModel,
  UnsupportedFormatError,
  ExternalResourcesError,
} from "@/lib/model-convert";

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

  // Explicit opt-out of the "don't duplicate work" guards. The retry
  // button and the client auto-heal both send this. Without it, a
  // "processing" row <90s old would bounce every retry and the designer
  // would see an indefinitely stuck spinner.
  const force = new URL(req.url).searchParams.get("force") === "1";

  const model = await loadOwned(designerId, params.id);
  if (!model) {
    return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  }

  console.log(
    `[convert] model=${model.id} status=${model.conversionStatus} format=${model.originalFormat} size=${model.originalSize}B force=${force}`
  );

  // Don't re-convert a model that's already ready. Fail-state IS allowed
  // to retry so the designer can re-kick after fixing the source file.
  // force=1 (explicit retry) skips this too — useful if the gltf output
  // got corrupted somehow.
  if (!force && model.conversionStatus === "ready") {
    return NextResponse.json({ ok: true, alreadyReady: true });
  }
  // If a previous convert is truly in-flight we back off — but if the row
  // has been "processing" for longer than our stale threshold without
  // updating, the previous invocation crashed or timed out. We reclaim
  // it so the model doesn't stay stuck forever. Serverless has no
  // graceful shutdown, so this stale-check is the only way to recover.
  //
  // Threshold is intentionally tight: our measured IFC conversion on a
  // 50MB building ran in ~31s locally, and Vercel's maxDuration for this
  // route is 300s. 90s covers typical running convert jobs (plus R2
  // download + cold start) while still reclaiming quickly enough that
  // the designer isn't staring at a stuck spinner.
  const STALE_AFTER_MS = 90 * 1000;
  if (!force && model.conversionStatus === "processing") {
    const age = Date.now() - model.updatedAt.getTime();
    if (age < STALE_AFTER_MS) {
      return NextResponse.json({ ok: true, inFlight: true, ageMs: age });
    }
    console.warn(
      `[convert] model ${model.id} was stuck in "processing" for ${Math.round(age / 1000)}s — reclaiming`
    );
  }

  await prisma.model3D.update({
    where: { id: model.id },
    data: { conversionStatus: "processing", conversionError: null },
  });

  const startedAt = Date.now();
  try {
    // ── Download original from R2 ─────────────────────────────────
    const tDl = Date.now();
    const fetchRes = await fetch(model.originalUrl);
    if (!fetchRes.ok) {
      throw new Error(`הורדה מ-R2 נכשלה (${fetchRes.status})`);
    }
    const inputBuffer = Buffer.from(await fetchRes.arrayBuffer());
    console.log(
      `[convert] model=${model.id} downloaded ${inputBuffer.length}B from R2 in ${Date.now() - tDl}ms`
    );

    // ── Convert ──────────────────────────────────────────────────
    const tConv = Date.now();
    const { glb, size } = await convertModel(inputBuffer, model.originalFormat);
    console.log(
      `[convert] model=${model.id} converted ${model.originalFormat} → glb (${size}B) in ${Date.now() - tConv}ms`
    );

    // ── Upload result to R2 ──────────────────────────────────────
    const tUp = Date.now();
    const key = generateFileKey("models-3d-gltf", `${model.id}.glb`, designerId);
    await uploadToR2(glb, key, "model/gltf-binary");
    const publicUrl = getPublicUrl(key);
    console.log(
      `[convert] model=${model.id} uploaded glb to R2 in ${Date.now() - tUp}ms (total ${Date.now() - startedAt}ms)`
    );

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
        : error instanceof ExternalResourcesError
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

    // UnsupportedFormatError + ExternalResourcesError are user input
    // problems — return 400 so the UI shows a fix-it-yourself message
    // rather than a "retry" retry-the-server spinner.
    const isUserError =
      error instanceof UnsupportedFormatError ||
      error instanceof ExternalResourcesError;
    return NextResponse.json(
      { ok: false, error: msg },
      { status: isUserError ? 400 : 500 }
    );
  }
}
