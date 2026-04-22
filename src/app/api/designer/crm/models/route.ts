export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ==========================================
// 3D Models CRUD
// GET    /api/designer/crm/models?projectId=X   → list
// POST   /api/designer/crm/models               → create after upload
// ==========================================

const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;

interface CreateModelBody {
  projectId: string;
  title?: string;
  originalUrl: string;
  originalR2Key: string;
  originalFormat: string;
  originalSize: number;
  // אופציונליים — קישור לאזור האישי של לקוח CRM
  crmClientId?: string | null;
  crmProjectId?: string | null;
}

// Verify that the project belongs to the designer
async function assertOwnsProject(designerId: string, projectId: string) {
  const project = await prisma.designerProject.findFirst({
    where: { id: projectId, designerId },
    select: { id: true },
  });
  return !!project;
}

async function assertOwnsCrmClient(designerId: string, crmClientId: string) {
  const client = await prisma.crmClient.findFirst({
    where: { id: crmClientId, designerId, deletedAt: null },
    select: { id: true },
  });
  return !!client;
}

async function assertOwnsCrmProject(designerId: string, crmProjectId: string, crmClientId: string) {
  const p = await prisma.crmProject.findFirst({
    where: { id: crmProjectId, designerId, clientId: crmClientId, deletedAt: null },
    select: { id: true },
  });
  return !!p;
}

export async function GET(req: NextRequest) {
  const designerId = req.headers.get("x-user-id");
  if (!designerId) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "חסר projectId" }, { status: 400 });
    }

    if (!(await assertOwnsProject(designerId, projectId))) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    const models = await prisma.model3D.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { annotations: true } },
        crmClient: { select: { id: true, name: true } },
        crmProject: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ models });
  } catch (error) {
    console.error("[models GET] error:", error);
    return NextResponse.json({ error: "שגיאה בשליפת מודלים" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const designerId = req.headers.get("x-user-id");
  if (!designerId) {
    return NextResponse.json({ error: "לא מחובר" }, { status: 401 });
  }

  try {
    const body: CreateModelBody = await req.json();
    const { projectId, title, originalUrl, originalR2Key, originalFormat, originalSize, crmClientId, crmProjectId } = body;

    if (!projectId || !originalUrl || !originalR2Key || !originalFormat || !originalSize) {
      return NextResponse.json(
        { error: "חסרים שדות חובה" },
        { status: 400 }
      );
    }

    if (!(await assertOwnsProject(designerId, projectId))) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }

    // אם המעצבת שייכה לקוח/פרויקט CRM — לוודא שהם שלה
    if (crmClientId) {
      if (!(await assertOwnsCrmClient(designerId, crmClientId))) {
        return NextResponse.json({ error: "לקוח לא נמצא" }, { status: 403 });
      }
      if (crmProjectId) {
        if (!(await assertOwnsCrmProject(designerId, crmProjectId, crmClientId))) {
          return NextResponse.json({ error: "פרויקט CRM לא נמצא" }, { status: 403 });
        }
      }
    }

    const expiresAt = new Date(Date.now() + THREE_MONTHS_MS);
    const fmt = originalFormat.toLowerCase();

    // We initially serve the raw original as the gltf pointer so the viewer
    // works even if conversion is slow — Draco compression is an
    // optimization, not a requirement, for glb/gltf. For obj/ifc/etc. we
    // leave gltfUrl null so the viewer shows a spinner until conversion
    // completes.
    const servesRawImmediately = fmt === "glb" || fmt === "gltf";

    const model = await prisma.model3D.create({
      data: {
        projectId,
        title: title ?? null,
        originalUrl,
        originalR2Key,
        originalFormat: fmt,
        originalSize,
        // Everyone starts as "pending" — the convert route flips to
        // "ready" after Draco compression (or "failed" on error).
        conversionStatus: servesRawImmediately ? "ready" : "pending",
        gltfUrl: servesRawImmediately ? originalUrl : null,
        gltfR2Key: servesRawImmediately ? originalR2Key : null,
        gltfSize: servesRawImmediately ? originalSize : null,
        expiresAt,
        // Optional CRM linkage — lets the client portal list this model
        // for the right CrmClient/CrmProject. Both may be null if the
        // designer is just uploading to her portfolio.
        crmClientId: crmClientId ?? null,
        crmProjectId: crmProjectId ?? null,
      },
    });

    // Fire-and-forget the conversion. The create returns immediately
    // so the designer UI is snappy; the viewer will show a progress
    // state for non-glTF inputs until the convert route finishes.
    // We build the URL from the incoming request so this works in dev
    // and on any Vercel preview.
    try {
      const origin = new URL(req.url).origin;
      // Preserve the caller's session cookie so the convert route's
      // own auth check (x-user-id) passes through the middleware.
      const cookieHeader = req.headers.get("cookie") || "";
      fetch(`${origin}/api/designer/crm/models/${model.id}/convert`, {
        method: "POST",
        headers: { cookie: cookieHeader },
      }).catch((err) => {
        console.error("[models POST] convert kick failed:", err);
      });
    } catch (kickErr) {
      console.error("[models POST] convert kick threw:", kickErr);
    }

    return NextResponse.json({ model }, { status: 201 });
  } catch (error) {
    console.error("[models POST] error:", error);
    return NextResponse.json({ error: "שגיאה ביצירת מודל" }, { status: 500 });
  }
}
