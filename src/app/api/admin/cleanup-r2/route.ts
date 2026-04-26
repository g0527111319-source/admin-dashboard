export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listR2Objects, deleteFromR2 } from "@/lib/r2";
import { requireRole, ADMIN_ONLY } from "@/lib/api-auth";

const BATCH_SIZE = 100;

// POST /api/admin/cleanup-r2 — Delete orphaned R2 files
export async function POST(req: NextRequest) {
  const auth = requireRole(req, ADMIN_ONLY);
  if (!auth.ok) return auth.response;
  try {
    // 1. List all R2 objects
    const r2Objects = await listR2Objects();
    const r2KeySet = new Set(r2Objects.map((obj) => obj.key));

    // 2. Collect all known DB keys
    const dbKeysArr: string[] = [];

    const [designerImages, crmPhotos, crmUploads, designerProjects] =
      await Promise.all([
        prisma.designerProjectImage.findMany({
          where: { r2Key: { not: null } },
          select: { r2Key: true },
        }),
        prisma.crmProjectPhoto.findMany({
          where: { r2Key: { not: null } },
          select: { r2Key: true },
        }),
        prisma.crmClientUpload.findMany({
          where: { r2Key: { not: null } },
          select: { r2Key: true },
        }),
        prisma.designerProject.findMany({
          where: { coverImageR2Key: { not: null } },
          select: { coverImageR2Key: true },
        }),
      ]);

    for (const img of designerImages) {
      if (img.r2Key) dbKeysArr.push(img.r2Key);
    }
    for (const photo of crmPhotos) {
      if (photo.r2Key) dbKeysArr.push(photo.r2Key);
    }
    for (const upload of crmUploads) {
      if (upload.r2Key) dbKeysArr.push(upload.r2Key);
    }
    for (const proj of designerProjects) {
      if (proj.coverImageR2Key) dbKeysArr.push(proj.coverImageR2Key);
    }

    // Also add thumbnail/medium variants of known keys to avoid false positives
    const knownVariants: string[] = [];
    for (const key of dbKeysArr) {
      knownVariants.push(key);
      const dotIdx = key.lastIndexOf(".");
      if (dotIdx > 0) {
        const base = key.substring(0, dotIdx);
        const ext = key.substring(dotIdx);
        knownVariants.push(`${base}_thumb${ext}`);
        knownVariants.push(`${base}_medium${ext}`);
      }
    }
    const knownSet = new Set(knownVariants);

    // 3. Find orphans (R2 keys not referenced by any DB record or variant)
    const orphanKeys: string[] = [];
    const r2KeyArr = Array.from(r2KeySet);
    for (const r2Key of r2KeyArr) {
      if (!knownSet.has(r2Key)) {
        orphanKeys.push(r2Key);
      }
    }

    // 4. Delete orphans in batches (limit to BATCH_SIZE)
    const toDelete = orphanKeys.slice(0, BATCH_SIZE);
    let orphansDeleted = 0;

    const results = await Promise.allSettled(
      toDelete.map(async (key) => {
        try {
          await deleteFromR2(key);
          return true;
        } catch (err) {
          console.warn(`[cleanup-r2] שגיאה במחיקת קובץ יתום ${key}:`, err);
          return false;
        }
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        orphansDeleted++;
      }
    }

    return NextResponse.json({
      orphansFound: orphanKeys.length,
      orphansDeleted,
      totalR2Files: r2Objects.length,
      totalDbKeys: dbKeysArr.length,
    });
  } catch (error) {
    console.error("Cleanup R2 error:", error);
    return NextResponse.json(
      { error: "שגיאה בניקוי קבצי R2" },
      { status: 500 }
    );
  }
}
