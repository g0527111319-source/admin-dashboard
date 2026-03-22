import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function PATCH(
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
        { error: "אין הרשאה לערוך לוח זה" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, description, projectId, isSharedWithClient } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (projectId !== undefined) data.projectId = projectId;
    if (isSharedWithClient !== undefined) {
      data.isSharedWithClient = isSharedWithClient;
      if (isSharedWithClient && !board.shareToken) {
        data.shareToken = crypto.randomUUID();
      }
    }

    const updatedBoard = await prisma.crmInspirationBoard.update({
      where: { id: boardId },
      data,
      include: {
        items: true,
      },
    });

    return NextResponse.json(updatedBoard);
  } catch (error) {
    console.error("Error updating inspiration board:", error);
    return NextResponse.json(
      { error: "שגיאה בעדכון לוח ההשראה" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
        { error: "אין הרשאה למחוק לוח זה" },
        { status: 403 }
      );
    }

    await prisma.crmInspirationItem.deleteMany({
      where: { boardId },
    });

    await prisma.crmInspirationBoard.delete({
      where: { id: boardId },
    });

    return NextResponse.json({ message: "לוח ההשראה נמחק בהצלחה" });
  } catch (error) {
    console.error("Error deleting inspiration board:", error);
    return NextResponse.json(
      { error: "שגיאה במחיקת לוח ההשראה" },
      { status: 500 }
    );
  }
}
