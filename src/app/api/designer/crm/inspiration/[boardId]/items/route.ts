import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
    }

    const { boardId } = await params;

    const board = await prisma.crmInspirationBoard.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      return NextResponse.json(
        { error: "לוח ההשראה לא נמצא" },
        { status: 404 }
      );
    }

    if (board.designerId !== designerId) {
      return NextResponse.json(
        { error: "אין הרשאה לצפות בלוח זה" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const style = searchParams.get("style");
    const room = searchParams.get("room");
    const material = searchParams.get("material");

    const where: Record<string, unknown> = { boardId };
    if (style) where.style = style;
    if (room) where.room = room;
    if (material) where.material = material;

    const items = await prisma.crmInspirationItem.findMany({
      where,
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching inspiration items:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת פריטי ההשראה" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const designerId = req.headers.get("x-user-id");
    if (!designerId) {
      return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
    }

    const { boardId } = await params;

    const board = await prisma.crmInspirationBoard.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      return NextResponse.json(
        { error: "לוח ההשראה לא נמצא" },
        { status: 404 }
      );
    }

    if (board.designerId !== designerId) {
      return NextResponse.json(
        { error: "אין הרשאה להוסיף פריטים ללוח זה" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { imageUrl, sourceUrl, title, notes, style, room, material } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "כתובת התמונה היא שדה חובה" },
        { status: 400 }
      );
    }

    const item = await prisma.crmInspirationItem.create({
      data: {
        boardId,
        imageUrl,
        sourceUrl: sourceUrl || null,
        title: title || null,
        notes: notes || null,
        style: style || null,
        room: room || null,
        material: material || null,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error creating inspiration item:", error);
    return NextResponse.json(
      { error: "שגיאה ביצירת פריט השראה" },
      { status: 500 }
    );
  }
}
