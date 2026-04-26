import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { requireRole, ADMIN_OR_DESIGNER } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

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
  const auth = requireRole(req, ADMIN_OR_DESIGNER);
  if (!auth.ok) return auth.response;
  try {
    const designerId = auth.userId;

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
