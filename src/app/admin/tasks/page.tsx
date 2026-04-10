"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  CheckSquare,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  Calendar,
  Users,
  FileText,
  Trophy,
  CreditCard,
  Edit3,
  Trash2,
  Flag,
  Loader2,
} from "lucide-react";

type Priority = "urgent" | "normal" | "low";
type Status = "pending" | "in-progress" | "completed";

interface Task {
  id: string;
  title: string;
  priority: Priority;
  dueDate: string;
  category: "FileText" | "CreditCard" | "Calendar" | "Users" | "Trophy";
  description: string;
  status: Status;
}

const categoryIcons: Record<Task["category"], React.ElementType> = {
  FileText,
  CreditCard,
  Calendar,
  Users,
  Trophy,
};

const priorityConfig: Record<Priority, { label: string; classes: string }> = {
  urgent: { label: "דחוף", classes: "bg-red-500/20 text-red-400 border border-red-500/30" },
  normal: { label: "רגיל", classes: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" },
  low: { label: "נמוך", classes: "bg-gray-500/20 text-gray-400 border border-gray-500/30" },
};

const columnConfig: Record<Status, { title: string; accent: string; headerBg: string }> = {
  pending: {
    title: "ממתין",
    accent: "border-yellow-500",
    headerBg: "bg-yellow-500/10 text-yellow-400",
  },
  "in-progress": {
    title: "בתהליך",
    accent: "border-blue-500",
    headerBg: "bg-blue-500/10 text-blue-400",
  },
  completed: {
    title: "הושלם",
    accent: "border-green-500",
    headerBg: "bg-green-500/10 text-green-400",
  },
};

const statusOrder: Status[] = ["pending", "in-progress", "completed"];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

function isOverdue(dateStr: string, status: Status): boolean {
  if (status === "completed") return false;
  return new Date(dateStr) < new Date();
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export default function AdminTaskBoardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("normal");
  const [newDueDate, setNewDueDate] = useState(addDays(3));
  const [showForm, setShowForm] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/tasks");
      if (!res.ok) throw new Error("שגיאה בטעינת משימות");
      const data = await res.json();
      setTasks(data);
      setError(null);
    } catch {
      setError("שגיאה בטעינת משימות");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter((t) => t.status === "pending").length;
    const inProgress = tasks.filter((t) => t.status === "in-progress").length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const overdue = tasks.filter((t) => isOverdue(t.dueDate, t.status)).length;
    return { total, pending, inProgress, completed, overdue };
  }, [tasks]);

  const columns = useMemo(() => {
    const grouped: Record<Status, Task[]> = { pending: [], "in-progress": [], completed: [] };
    tasks.forEach((t) => grouped[t.status].push(t));
    return grouped;
  }, [tasks]);

  async function moveTask(taskId: string, direction: "left" | "right") {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const idx = statusOrder.indexOf(task.status);
    const newIdx = direction === "left" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= statusOrder.length) return;
    const newStatus = statusOrder[newIdx];
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    await fetch("/api/admin/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId, status: newStatus }),
    });
  }

  async function deleteTask(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    await fetch("/api/admin/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId, action: "delete" }),
    });
  }

  async function addTask() {
    if (!newTitle.trim()) return;
    const res = await fetch("/api/admin/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle.trim(),
        priority: newPriority,
        dueDate: newDueDate,
        category: "FileText",
        description: "",
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setTasks((prev) => [...prev, data.task]);
    }
    setNewTitle("");
    setNewPriority("normal");
    setNewDueDate(addDays(3));
    setShowForm(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto mb-3" />
          <p className="text-text-muted text-sm">טוען משימות...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={fetchTasks} className="btn-gold mt-4 px-4 py-2 rounded-lg text-sm">
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 animate-in" dir="rtl">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CheckSquare className="w-7 h-7 text-gold" />
          <h1 className="font-heading text-2xl text-text-primary">לוח משימות</h1>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn-gold flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "ביטול" : "משימה חדשה"}
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="card-static p-3 rounded-xl text-center">
          <div className="text-text-muted text-xs mb-1">סה״כ</div>
          <div className="text-text-primary text-xl font-bold">{stats.total}</div>
        </div>
        <div className="card-static p-3 rounded-xl text-center">
          <div className="text-yellow-400 text-xs mb-1">ממתין</div>
          <div className="text-yellow-400 text-xl font-bold">{stats.pending}</div>
        </div>
        <div className="card-static p-3 rounded-xl text-center">
          <div className="text-blue-400 text-xs mb-1">בתהליך</div>
          <div className="text-blue-400 text-xl font-bold">{stats.inProgress}</div>
        </div>
        <div className="card-static p-3 rounded-xl text-center">
          <div className="text-green-400 text-xs mb-1">הושלם</div>
          <div className="text-green-400 text-xl font-bold">{stats.completed}</div>
        </div>
        <div className="card-static p-3 rounded-xl text-center col-span-2 sm:col-span-1">
          <div className="text-red-400 text-xs mb-1 flex items-center justify-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            באיחור
          </div>
          <div className="text-red-400 text-xl font-bold">{stats.overdue}</div>
        </div>
      </div>

      {/* Quick Add Form */}
      {showForm && (
        <div className="card-static p-4 rounded-xl mb-6 animate-in">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <label className="text-text-muted text-xs mb-1 block">כותרת משימה</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="הזן שם משימה..."
                className="input-dark w-full px-3 py-2 rounded-lg text-sm"
                onKeyDown={(e) => e.key === "Enter" && addTask()}
              />
            </div>
            <div className="w-full sm:w-32">
              <label className="text-text-muted text-xs mb-1 block">עדיפות</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as Priority)}
                className="select-dark w-full px-3 py-2 rounded-lg text-sm"
              >
                <option value="urgent">דחוף</option>
                <option value="normal">רגיל</option>
                <option value="low">נמוך</option>
              </select>
            </div>
            <div className="w-full sm:w-40">
              <label className="text-text-muted text-xs mb-1 block">תאריך יעד</label>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="input-dark w-full px-3 py-2 rounded-lg text-sm"
              />
            </div>
            <button
              onClick={addTask}
              className="btn-gold flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              הוסף משימה
            </button>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {statusOrder.map((status) => {
          const config = columnConfig[status];
          const columnTasks = columns[status];
          return (
            <div key={status} className="flex flex-col">
              {/* Column Header */}
              <div
                className={`rounded-t-xl p-3 border-b-2 ${config.accent} ${config.headerBg} flex items-center justify-between`}
              >
                <div className="flex items-center gap-2 font-heading text-sm">
                  {status === "pending" && <Clock className="w-4 h-4" />}
                  {status === "in-progress" && <Flag className="w-4 h-4" />}
                  {status === "completed" && <CheckSquare className="w-4 h-4" />}
                  {config.title}
                </div>
                <span className="badge-gold text-xs px-2 py-0.5 rounded-full">
                  {columnTasks.length}
                </span>
              </div>

              {/* Column Body */}
              <div className="bg-bg-surface/50 rounded-b-xl p-3 flex flex-col gap-3 min-h-[200px]">
                {columnTasks.length === 0 && (
                  <div className="text-text-muted text-xs text-center py-8">
                    אין משימות
                  </div>
                )}
                {columnTasks.map((task) => {
                  const CategoryIcon = categoryIcons[task.category];
                  const pConfig = priorityConfig[task.priority];
                  const overdue = isOverdue(task.dueDate, task.status);
                  const statusIdx = statusOrder.indexOf(task.status);

                  return (
                    <div
                      key={task.id}
                      className={`card-static rounded-xl p-3 animate-in ${
                        overdue ? "ring-1 ring-red-500/40" : ""
                      }`}
                    >
                      {/* Card Top Row */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <CategoryIcon className="w-4 h-4 text-gold shrink-0" />
                          <span className="text-text-primary text-sm font-medium truncate">
                            {task.title}
                          </span>
                        </div>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="text-text-muted hover:text-red-400 transition-colors shrink-0"
                          title="מחק"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Description */}
                      {task.description && (
                        <p className="text-text-muted text-xs mb-2 truncate">
                          {task.description}
                        </p>
                      )}

                      {/* Meta Row */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${pConfig.classes}`}
                        >
                          {pConfig.label}
                        </span>
                        <div
                          className={`flex items-center gap-1 text-xs ${
                            overdue ? "text-red-400" : "text-text-muted"
                          }`}
                        >
                          {overdue && <AlertTriangle className="w-3 h-3" />}
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(task.dueDate)}</span>
                        </div>
                      </div>

                      {/* Move Buttons */}
                      <div className="flex items-center justify-between border-t border-white/5 pt-2">
                        <button
                          onClick={() => moveTask(task.id, "right")}
                          disabled={statusIdx === 0}
                          className={`btn-outline flex items-center gap-1 text-xs px-2 py-1 rounded-md ${
                            statusIdx === 0
                              ? "opacity-30 cursor-not-allowed"
                              : "hover:text-gold"
                          }`}
                          title="הזז ימינה"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveTask(task.id, "left")}
                          disabled={statusIdx === statusOrder.length - 1}
                          className={`btn-outline flex items-center gap-1 text-xs px-2 py-1 rounded-md ${
                            statusIdx === statusOrder.length - 1
                              ? "opacity-30 cursor-not-allowed"
                              : "hover:text-gold"
                          }`}
                          title="הזז שמאלה"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
