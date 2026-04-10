import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const SETTING_KEY = "admin_tasks";

interface AdminTask {
  id: string;
  title: string;
  priority: "urgent" | "normal" | "low";
  dueDate: string;
  category: string;
  description: string;
  status: "pending" | "in-progress" | "completed";
  createdAt: string;
}

// GET /api/admin/tasks — list all admin tasks
export async function GET() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: SETTING_KEY },
    });
    const tasks: AdminTask[] = setting
      ? (setting.value as unknown as AdminTask[])
      : [];
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Admin tasks fetch error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת משימות" },
      { status: 500 }
    );
  }
}

// POST /api/admin/tasks — create a new task
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, priority, dueDate, category, description } = body;
    if (!title) {
      return NextResponse.json(
        { error: "חסר כותרת למשימה" },
        { status: 400 }
      );
    }
    const newTask: AdminTask = {
      id: crypto.randomUUID(),
      title,
      priority: priority || "normal",
      dueDate: dueDate || new Date().toISOString().split("T")[0],
      category: category || "FileText",
      description: description || "",
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    const setting = await prisma.systemSetting.findUnique({
      where: { key: SETTING_KEY },
    });
    const existing: AdminTask[] = setting
      ? (setting.value as unknown as AdminTask[])
      : [];
    const updated = [...existing, newTask];

    await prisma.systemSetting.upsert({
      where: { key: SETTING_KEY },
      create: { key: SETTING_KEY, value: updated as unknown as Prisma.InputJsonValue },
      update: { value: updated as unknown as Prisma.InputJsonValue },
    });

    return NextResponse.json({ success: true, task: newTask }, { status: 201 });
  } catch (error) {
    console.error("Admin task create error:", error);
    return NextResponse.json(
      { error: "שגיאה ביצירת משימה" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/tasks — update task status or delete
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, action } = body;
    if (!id) {
      return NextResponse.json({ error: "חסר מזהה משימה" }, { status: 400 });
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { key: SETTING_KEY },
    });
    let tasks: AdminTask[] = setting
      ? (setting.value as unknown as AdminTask[])
      : [];

    if (action === "delete") {
      tasks = tasks.filter((t) => t.id !== id);
    } else if (status) {
      tasks = tasks.map((t) => (t.id === id ? { ...t, status } : t));
    }

    await prisma.systemSetting.upsert({
      where: { key: SETTING_KEY },
      create: { key: SETTING_KEY, value: tasks as unknown as Prisma.InputJsonValue },
      update: { value: tasks as unknown as Prisma.InputJsonValue },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin task update error:", error);
    return NextResponse.json(
      { error: "שגיאה בעדכון משימה" },
      { status: 500 }
    );
  }
}
