"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Image, Link, Type, Palette, Trash2, ChevronLeft, Eye, EyeOff } from "lucide-react";
import FileUpload, { type UploadedFile } from "@/components/ui/FileUpload";

type MoodboardItem = {
  id: string;
  type: string;
  title: string | null;
  content: string | null;
  imageUrl: string | null;
  sortOrder: number;
};

type Moodboard = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  isSharedWithClient: boolean;
  items: MoodboardItem[];
  createdAt: string;
};

type Project = { id: string; name: string; client: { name: string } };

export default function CrmMoodboards({ clientId, projectId }: { clientId?: string; projectId?: string } = {}) {
  const [moodboards, setMoodboards] = useState<Moodboard[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedMoodboard, setSelectedMoodboard] = useState<Moodboard | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newBoard, setNewBoard] = useState({ title: "", description: "" });
  const [newItem, setNewItem] = useState({ type: "image", title: "", content: "", imageUrl: "" });
  const [saving, setSaving] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/designer/crm/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0 && !selectedProjectId) setSelectedProjectId(data[0].id);
      }
    } catch { /* */ }
  }, [selectedProjectId]);

  const fetchMoodboards = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/designer/crm/projects/${selectedProjectId}/moodboards`);
      if (res.ok) setMoodboards(await res.json());
    } catch { /* */ } finally { setLoading(false); }
  }, [selectedProjectId]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useEffect(() => { fetchMoodboards(); }, [fetchMoodboards]);

  const createMoodboard = async () => {
    if (!newBoard.title.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/designer/crm/projects/${selectedProjectId}/moodboards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBoard),
      });
      setNewBoard({ title: "", description: "" });
      setShowAdd(false);
      fetchMoodboards();
    } catch { /* */ } finally { setSaving(false); }
  };

  const addItem = async () => {
    if (!selectedMoodboard) return;
    setSaving(true);
    try {
      await fetch(`/api/designer/crm/projects/${selectedProjectId}/moodboards/${selectedMoodboard.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      });
      setNewItem({ type: "image", title: "", content: "", imageUrl: "" });
      // Refresh
      const res = await fetch(`/api/designer/crm/projects/${selectedProjectId}/moodboards/${selectedMoodboard.id}`);
      if (res.ok) setSelectedMoodboard(await res.json());
    } catch { /* */ } finally { setSaving(false); }
  };

  const toggleShare = async (board: Moodboard) => {
    try {
      await fetch(`/api/designer/crm/projects/${selectedProjectId}/moodboards/${board.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSharedWithClient: !board.isSharedWithClient }),
      });
      fetchMoodboards();
      if (selectedMoodboard?.id === board.id) {
        setSelectedMoodboard({ ...selectedMoodboard, isSharedWithClient: !board.isSharedWithClient });
      }
    } catch { /* */ }
  };

  const deleteMoodboard = async (boardId: string) => {
    if (!confirm("למחוק את המודבורד?")) return;
    try {
      await fetch(`/api/designer/crm/projects/${selectedProjectId}/moodboards/${boardId}`, { method: "DELETE" });
      if (selectedMoodboard?.id === boardId) setSelectedMoodboard(null);
      fetchMoodboards();
    } catch { /* */ }
  };

  const typeIcon: Record<string, typeof Image> = { image: Image, link: Link, note: Type, color: Palette };

  // Detail view
  if (selectedMoodboard) {
    return (
      <div className="space-y-6 animate-in">
        <button onClick={() => setSelectedMoodboard(null)} className="flex items-center gap-1 text-gold text-sm hover:underline">
          <ChevronLeft className="w-4 h-4" /> חזרה
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-heading text-text-primary">{selectedMoodboard.title}</h2>
            {selectedMoodboard.description && <p className="text-text-muted text-sm">{selectedMoodboard.description}</p>}
          </div>
          <button onClick={() => toggleShare(selectedMoodboard)} className={`text-xs px-3 py-1.5 rounded-btn flex items-center gap-1 ${selectedMoodboard.isSharedWithClient ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-text-muted"}`}>
            {selectedMoodboard.isSharedWithClient ? <><Eye className="w-3 h-3" /> משותף עם הלקוח</> : <><EyeOff className="w-3 h-3" /> פרטי</>}
          </button>
        </div>

        {/* Items grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {selectedMoodboard.items.map(item => (
            <div key={item.id} className="card-static overflow-hidden">
              {item.type === "image" && item.imageUrl && (
                <div className="w-full h-32 bg-bg-surface rounded-btn mb-2 overflow-hidden">
                  <img src={item.imageUrl} alt={item.title || ""} className="w-full h-full object-contain" />
                </div>
              )}
              {item.type === "color" && (
                <div className="w-full h-20 rounded-btn mb-2" style={{ backgroundColor: item.content || "#ccc" }} />
              )}
              {item.type === "link" && (
                <a href={item.content || "#"} target="_blank" rel="noopener noreferrer" className="text-gold text-sm hover:underline block mb-2 truncate">
                  {item.content}
                </a>
              )}
              {item.title && <p className="text-sm text-text-primary font-medium truncate">{item.title}</p>}
              {item.type === "note" && item.content && <p className="text-xs text-text-muted line-clamp-3">{item.content}</p>}
            </div>
          ))}
        </div>

        {/* Add item */}
        <div className="card-static space-y-3">
          <h3 className="text-sm font-medium text-text-primary">הוסף פריט</h3>
          <div className="flex gap-2">
            {["image", "link", "note", "color"].map(t => {
              const Icon = typeIcon[t] || Image;
              return (
                <button key={t} onClick={() => setNewItem({ ...newItem, type: t })} className={`text-xs px-3 py-1.5 rounded-btn flex items-center gap-1 ${newItem.type === t ? "bg-gold/10 text-gold" : "bg-bg-surface text-text-muted"}`}>
                  <Icon className="w-3 h-3" /> {t === "image" ? "תמונה" : t === "link" ? "קישור" : t === "note" ? "הערה" : "צבע"}
                </button>
              );
            })}
          </div>
          <input type="text" className="input-field" placeholder="כותרת" value={newItem.title} onChange={e => setNewItem({ ...newItem, title: e.target.value })} />
          {newItem.type === "image" && (
            <FileUpload
              compact
              category="image"
              folder="moodboards"
              currentUrl={newItem.imageUrl}
              label="העלאת תמונה"
              onUpload={(file: UploadedFile) => setNewItem({ ...newItem, imageUrl: file.url })}
              onError={(err: string) => alert(err)}
            />
          )}
          {newItem.type === "link" && <input type="url" className="input-field" placeholder="URL" value={newItem.content} onChange={e => setNewItem({ ...newItem, content: e.target.value })} dir="ltr" />}
          {newItem.type === "note" && <textarea className="input-field h-20 resize-none" placeholder="תוכן ההערה" value={newItem.content} onChange={e => setNewItem({ ...newItem, content: e.target.value })} />}
          {newItem.type === "color" && <input type="color" value={newItem.content || "#2563eb"} onChange={e => setNewItem({ ...newItem, content: e.target.value })} className="w-full h-12 rounded-btn cursor-pointer" />}
          <button onClick={addItem} disabled={saving} className="btn-gold w-full text-sm">
            {saving ? "שומר..." : "הוסף פריט"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading text-text-primary">מודבורדים</h2>
        <button onClick={() => setShowAdd(true)} className="btn-gold text-sm flex items-center gap-1">
          <Plus className="w-4 h-4" /> מודבורד חדש
        </button>
      </div>

      <select className="select-field" value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}>
        <option value="">בחרי פרויקט...</option>
        {projects.map(p => <option key={p.id} value={p.id}>{p.name} — {p.client.name}</option>)}
      </select>

      {showAdd && (
        <div className="card-static space-y-3">
          <input type="text" className="input-field" placeholder="שם המודבורד" value={newBoard.title} onChange={e => setNewBoard({ ...newBoard, title: e.target.value })} />
          <input type="text" className="input-field" placeholder="תיאור (אופציונלי)" value={newBoard.description} onChange={e => setNewBoard({ ...newBoard, description: e.target.value })} />
          <div className="flex gap-2">
            <button onClick={createMoodboard} disabled={saving} className="btn-gold flex-1 text-sm">{saving ? "שומר..." : "צור מודבורד"}</button>
            <button onClick={() => setShowAdd(false)} className="btn-outline flex-1 text-sm">ביטול</button>
          </div>
        </div>
      )}

      {!selectedProjectId ? (
        <div className="card-static text-center py-12 text-text-muted">בחרי פרויקט</div>
      ) : loading ? (
        <div className="text-center py-12 text-text-muted">טוען...</div>
      ) : moodboards.length === 0 ? (
        <div className="card-static text-center py-12 text-text-muted">אין מודבורדים עדיין</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {moodboards.map(board => (
            <div key={board.id} className="card-static cursor-pointer hover:border-gold/30 transition-colors" onClick={() => setSelectedMoodboard(board)}>
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-text-primary font-medium">{board.title}</h3>
                <div className="flex gap-1">
                  <button onClick={e => { e.stopPropagation(); toggleShare(board); }} className="p-1 text-text-muted hover:text-gold">
                    {board.isSharedWithClient ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={e => { e.stopPropagation(); deleteMoodboard(board.id); }} className="p-1 text-text-muted hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              {board.description && <p className="text-xs text-text-muted mb-2">{board.description}</p>}
              <p className="text-xs text-gold">{board.items.length} פריטים</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
