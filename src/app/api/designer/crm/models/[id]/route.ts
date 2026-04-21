export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { deleteFromR2 } from "@/lib/r2";

// ==========================================
// Single 3D model
// GET    /api/designer/crm/models/[id]   → fetch
// DELETE /api/designer/crm/models/[id]   → delete (also removes from R2)
// ==========================================

async function assertOwnership(designerId: string, modelId: string) {
  const model = await prisma.model3D.findFirst({
    where: {
      id: modelId,
      project: { designerId },
    },
    select: {
      id: true,
      originalR2Key: true,
      gltfR2Key: true,
    },
  });
  return model;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const designerId = req.headers.get("x-user-id");
  if (!designerId) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  try {
    const model = await prisma.model3D.findFirst({
      where: { id: params.id, project: { designerId } },
      include: {
        _count: { select: { annotations: true } },
      },
    });

    if (!model) {
      return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
    }

    return NextResponse.json({ model });
  } catch (error) {
    console.error("[models/:id GET] error:", error);
    return NextResponse.json({ error: "שגיאה" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const designerId = req.headers.get("x-user-id");
  if (!designerId) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  try {
    const model = await assertOwnership(designerId, params.id);
    if (!model) {
      return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
    }

    // Delete DB record first (cascades to annotations + comments)
    await prisma.model3D.delete({ where: { id: params.id } });

    // Clean up R2 objects (best-effort; don't fail the request if this errors)
    const keysToDelete = [model.originalR2Key];
    if (model.gltfR2Key && model.gltfR2Key !== model.originalR2Key) {
      keysToDelete.push(model.gltfR2Key);
    }

    await Promise.allSettled(
      keysToDelete.map((key) =>
        deleteFromR2(key).catch((err) => {
          console.error(`[models DELETE] failed to delete R2 key ${key}:`, err);
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[models/:id DELETE] error:", error);
    return NextResponse.json({ error: "שגיאה במחיקה" }, { status: 500 });
  }
}
