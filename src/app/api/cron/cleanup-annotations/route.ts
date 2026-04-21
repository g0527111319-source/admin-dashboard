export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { deleteFromR2 } from "@/lib/r2";

// ==========================================
// Cron: cleanup expired annotations + models
// GET /api/cron/cleanup-annotations
// ==========================================
// Protected by Bearer CRON_SECRET (same pattern as other crons).
//
// Two sweeps:
//   1) Annotations whose expiresAt < now → hard delete (comments cascade)
//   2) Model3D whose expiresAt < now     → hard delete + R2 cleanup

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 401 }
    );
  }

  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results = {
    annotationsDeleted: 0,
    modelsDeleted: 0,
    r2KeysDeleted: 0,
    r2Errors: 0,
  };

  try {
    // ── Sweep expired annotations ──────────────────────────────────
    // Comments cascade via Prisma relation onDelete: Cascade.
    const annDel = await prisma.annotation.deleteMany({
      where: { expiresAt: { lt: now } },
    });
    results.annotationsDeleted = annDel.count;

    // ── Sweep expired models ───────────────────────────────────────
    // Find them first (need R2 keys before deleting the row).
    const expiredModels = await prisma.model3D.findMany({
      where: { expiresAt: { lt: now } },
      select: {
        id: true,
        originalR2Key: true,
        gltfR2Key: true,
      },
    });

    for (const model of expiredModels) {
      const keys = [model.originalR2Key];
      if (model.gltfR2Key && model.gltfR2Key !== model.originalR2Key) {
        keys.push(model.gltfR2Key);
      }

      // Best-effort R2 cleanup — if it fails, we still delete the DB row
      // (otherwise the orphan piles up forever). R2 has its own orphan
      // sweeper (src/lib/r2-cleanup.ts) that can catch the leftovers.
      for (const key of keys) {
        try {
          await deleteFromR2(key);
          results.r2KeysDeleted++;
        } catch (err) {
          console.error(`[cron cleanup] R2 delete failed for ${key}:`, err);
          results.r2Errors++;
        }
      }

      try {
        await prisma.model3D.delete({ where: { id: model.id } });
        results.modelsDeleted++;
      } catch (err) {
        console.error(`[cron cleanup] DB delete failed for model ${model.id}:`, err);
      }
    }

    return NextResponse.json({
      ok: true,
      ranAt: now.toISOString(),
      ...results,
    });
  } catch (error) {
    console.error("[cron cleanup-annotations] error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "שגיאה בניקוי",
        partial: results,
      },
      { status: 500 }
    );
  }
}
