export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ==========================================
// Public model fetch by share token
// GET /api/public/models/[token]
// ==========================================
// Client-facing — no auth required. The share token is the secret.
// Only returns the gltfUrl if conversion is "ready"; otherwise a
// status hint so the UI can show a progress state.

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const model = await prisma.model3D.findUnique({
      where: { shareToken: params.token },
      select: {
        id: true,
        title: true,
        gltfUrl: true,
        gltfSize: true,
        thumbnailUrl: true,
        conversionStatus: true,
        conversionError: true,
        expiresAt: true,
        createdAt: true,
        project: {
          select: {
            id: true,
            title: true,
            designer: {
              select: {
                id: true,
                fullName: true,
                crmSettings: {
                  select: { logoUrl: true, companyName: true },
                },
              },
            },
          },
        },
      },
    });

    if (!model) {
      return NextResponse.json({ error: "מודל לא נמצא" }, { status: 404 });
    }

    if (model.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "הקובץ כבר לא זמין (פג תוקף)" },
        { status: 410 } // Gone
      );
    }

    return NextResponse.json({
      model: {
        id: model.id,
        title: model.title,
        gltfUrl: model.conversionStatus === "ready" ? model.gltfUrl : null,
        gltfSize: model.gltfSize,
        thumbnailUrl: model.thumbnailUrl,
        conversionStatus: model.conversionStatus,
        conversionError: model.conversionError,
        expiresAt: model.expiresAt,
        createdAt: model.createdAt,
        designer: model.project.designer,
        projectTitle: model.project.title,
      },
    });
  } catch (error) {
    console.error("[public/models GET] error:", error);
    return NextResponse.json({ error: "שגיאה" }, { status: 500 });
  }
}
