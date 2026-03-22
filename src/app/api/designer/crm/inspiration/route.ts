import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    const where: Record<string, unknown> = { designerId };
    if (projectId) {
      where.projectId = projectId;
    }

    const boards = await prisma.crmInspirationBoard.findMany({
      where,
      include: {
        items: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(boards);
  } catch (error) {
    console.error("Error fetching inspiration boards:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת לוחות ההשראה" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, projectId, isSharedWithClient } = body;

    if (!name) {
      return NextResponse.json(
        { error: "שם הלוח הוא שדה חובה" },
        { status: 400 }
      );
    }

    const board = await prisma.crmInspirationBoard.create({
      data: {
        designerId,
        name,
        description: description || null,
        projectId: projectId || null,
        isSharedWithClient: isSharedWithClient || false,
        shareToken: isSharedWithClient ? crypto.randomUUID() : null,
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json(board, { status: 201 });
  } catch (error) {
    console.error("Error creating inspiration board:", error);
    return NextResponse.json(
      { error: "שגיאה ביצירת לוח השראה" },
      { status: 500 }
    );
  }
}
