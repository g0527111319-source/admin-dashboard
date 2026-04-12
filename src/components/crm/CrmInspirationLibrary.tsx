"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Heart,
  Share2,
  Copy,
  ChevronDown,
  ChevronUp,
  Image,
  Loader2,
  Sparkles,
  Filter,
  Link,
  Eye,
  Grid3X3,
} from "lucide-react";
import FileUpload, { type UploadedFile } from "@/components/ui/FileUpload";

type InspirationItem = {
  id: string;
  boardId: string;
  imageUrl: string;
  title: string;
  notes: string | null;
  styleTag: string | null;
  roomTag: string | null;
  materialTag: string | null;
  clientLiked: boolean;
};

type InspirationBoard = {
  id: string;
  name: string;
  description: string | null;
  projectId: string | null;
  itemCount: number;
  isSharedWithClient: boolean;
  createdAt: string;
};

const styleOptions = ["מודרני", "קלאסי", "מינימליסטי", "בוהו", "סקנדינבי", "תעשייתי", "כפרי", "אקלקטי"];
const roomOptions = ["סלון", "מטבח", "חדר שינה", "חדר אמבטיה", "חדר עבודה", "מרפסת", "חדר ילדים", "פינת אוכל"];
const materialOptions = ["עץ", "שיש", "מתכת", "זכוכית", "בטון", "בד", "עור", "קרמיקה"];

const emptyBoard = { name: "", description: "", projectId: "" };
const emptyItem = { imageUrl: "", title: "", notes: "", styleTag: "", roomTag: "", materialTag: "" };

export default function CrmInspirationLibrary({ clientId }: { clientId?: string } = {}) {
  const [boards, setBoards] = useState<InspirationBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBoardForm, setShowBoardForm] = useState(false);
  const [boardForm, setBoardForm] = useState(emptyBoard);
  const [editBoardId, setEditBoardId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [expandedBoardId, setExpandedBoardId] = useState<string | null>(null);
  const [items, setItems] = useState<InspirationItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemForm, setItemForm] = useState(emptyItem);

  const [filterStyle, setFilterStyle] = useState("");
  const [filterRoom, setFilterRoom] = useState("");
  const [filterMaterial, setFilterMaterial] = useState("");
  const [copied, setCopied] = useState(false);

  const fetchBoards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/designer/crm/inspiration");
      if (res.ok) setBoards(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchItems = useCallback(async (boardId: string) => {
    setLoadingItems(true);
    try {
      const res = await fetch(`/api/designer/crm/inspiration/${boardId}/items`);
      if (res.ok) setItems(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoadingItems(false);
    }
  }, []);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  useEffect(() => {
    if (expandedBoardId) fetchItems(expandedBoardId);
  }, [expandedBoardId, fetchItems]);

  const handleSaveBoard = async () => {
    if (!boardForm.name.trim()) return;
    setSaving(true);
    try {
      if (editBoardId) {
        await fetch(`/api/designer/crm/inspiration/${editBoardId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(boardForm),
        });
      } else {
        await fetch("/api/designer/crm/inspiration", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...boardForm,
            projectId: boardForm.projectId || null,
          }),
        });
      }
      setBoardForm(emptyBoard);
      setShowBoardForm(false);
      setEditBoardId(null);
      fetchBoards();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBoard = async (id: string) => {
    try {
      await fetch(`/api/designer/crm/inspiration/${id}`, { method: "DELETE" });
      if (expandedBoardId === id) {
        setExpandedBoardId(null);
        setItems([]);
      }
      fetchBoards();
    } catch {
      /* ignore */
    }
  };

  const handleToggleShare = async (board: InspirationBoard) => {
    try {
      await fetch(`/api/designer/crm/inspiration/${board.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSharedWithClient: !board.isSharedWithClient }),
      });
      fetchBoards();
    } catch {
      /* ignore */
    }
  };

  const handleCopyLink = (boardId: string) => {
    const link = `${window.location.origin}/shared/inspiration/${boardId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddItem = async () => {
    if (!expandedBoardId || !itemForm.imageUrl.trim() || !itemForm.title.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/designer/crm/inspiration/${expandedBoardId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...itemForm,
          styleTag: itemForm.styleTag || null,
          roomTag: itemForm.roomTag || null,
          materialTag: itemForm.materialTag || null,
          notes: itemForm.notes || null,
        }),
      });
      setItemForm(emptyItem);
      setShowItemForm(false);
      fetchItems(expandedBoardId);
      fetchBoards();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (filterStyle && item.styleTag !== filterStyle) return false;
    if (filterRoom && item.roomTag !== filterRoom) return false;
    if (filterMaterial && item.materialTag !== filterMaterial) return false;
    return true;
  });

  const startEditBoard = (board: InspirationBoard) => {
    setBoardForm({
      name: board.name,
      description: board.description || "",
      projectId: board.projectId || "",
    });
    setEditBoardId(board.id);
    setShowBoardForm(true);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">ספריית השראה</h2>
            <p className="text-white/50" style={{ fontSize: "10px" }}>
              ניהול לוחות השראה ושיתוף עם לקוחות
            </p>
          </div>
        </div>
        <button
          className="btn-gold flex items-center gap-2"
          onClick={() => {
            setBoardForm(emptyBoard);
            setEditBoardId(null);
            setShowBoardForm(true);
          }}
        >
          <Plus className="w-4 h-4" />
          לוח חדש
        </button>
      </div>

      {/* Boards List */}
      {loading ? (
        <div className="empty-state">
          <Loader2 className="empty-state-icon animate-spin" />
          <p>טוען...</p>
        </div>
      ) : boards.length === 0 ? (
        <div className="empty-state">
          <Image className="empty-state-icon" />
          <p>אין לוחות השראה עדיין</p>
        </div>
      ) : (
        <div className="space-y-4">
          {boards.map((board) => (
            <div key={board.id} className="card-static overflow-hidden">
              {/* Board header */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition"
                onClick={() =>
                  setExpandedBoardId(expandedBoardId === board.id ? null : board.id)
                }
              >
                <div className="flex items-center gap-3">
                  <Grid3X3 className="w-5 h-5 text-amber-400" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{board.name}</span>
                      <span className="badge-gray">{board.itemCount} פריטים</span>
                      {board.isSharedWithClient && (
                        <span className="badge-gold flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          משותף
                        </span>
                      )}
                    </div>
                    {board.description && (
                      <p className="text-white/40 mt-1" style={{ fontSize: "10px" }}>
                        {board.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="btn-ghost p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleShare(board);
                    }}
                    title={board.isSharedWithClient ? "בטל שיתוף" : "שתף עם לקוח"}
                  >
                    <Share2 className={`w-4 h-4 ${board.isSharedWithClient ? "text-amber-400" : ""}`} />
                  </button>
                  {board.isSharedWithClient && (
                    <button
                      className="btn-ghost p-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyLink(board.id);
                      }}
                      title="העתק קישור שיתוף"
                    >
                      {copied ? <Link className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                  <button
                    className="btn-ghost p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditBoard(board);
                    }}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    className="btn-ghost p-1 text-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBoard(board.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {expandedBoardId === board.id ? (
                    <ChevronUp className="w-4 h-4 text-white/40" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-white/40" />
                  )}
                </div>
              </div>

              {/* Expanded Items */}
              {expandedBoardId === board.id && (
                <div className="border-t border-white/10 p-4">
                  {/* Filters */}
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <Filter className="w-4 h-4 text-white/40" />
                    <select
                      className="select-field max-w-[140px]"
                      value={filterStyle}
                      onChange={(e) => setFilterStyle(e.target.value)}
                    >
                      <option value="">כל הסגנונות</option>
                      {styleOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <select
                      className="select-field max-w-[140px]"
                      value={filterRoom}
                      onChange={(e) => setFilterRoom(e.target.value)}
                    >
                      <option value="">כל החדרים</option>
                      {roomOptions.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <select
                      className="select-field max-w-[140px]"
                      value={filterMaterial}
                      onChange={(e) => setFilterMaterial(e.target.value)}
                    >
                      <option value="">כל החומרים</option>
                      {materialOptions.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <button
                      className="btn-gold flex items-center gap-1 mr-auto"
                      onClick={() => setShowItemForm(true)}
                    >
                      <Plus className="w-3 h-3" />
                      הוסף פריט
                    </button>
                  </div>

                  {loadingItems ? (
                    <div className="empty-state py-8">
                      <Loader2 className="empty-state-icon animate-spin" />
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <div className="empty-state py-8">
                      <Image className="empty-state-icon" />
                      <p>אין פריטים בלוח זה</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {filteredItems.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-lg overflow-hidden bg-white/5 hover:bg-white/10 transition group relative"
                        >
                          <div className="aspect-square bg-white/10 relative">
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                            {item.clientLiked && (
                              <div className="absolute top-2 left-2 bg-red-500 rounded-full p-1">
                                <Heart className="w-3 h-3 text-white fill-white" />
                              </div>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="text-sm text-white font-medium truncate">
                              {item.title}
                            </p>
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {item.styleTag && <span className="badge-gold">{item.styleTag}</span>}
                              {item.roomTag && <span className="badge-blue">{item.roomTag}</span>}
                              {item.materialTag && <span className="badge-gray">{item.materialTag}</span>}
                            </div>
                            {item.notes && (
                              <p className="text-white/40 mt-1 truncate" style={{ fontSize: "10px" }}>
                                {item.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Board Form Modal */}
      {showBoardForm && (
        <div className="modal-overlay" onClick={() => setShowBoardForm(false)}>
          <div className="modal-content animate-in w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">
                {editBoardId ? "עריכת לוח" : "לוח השראה חדש"}
              </h3>
              <button className="btn-ghost p-1" onClick={() => { setShowBoardForm(false); setEditBoardId(null); }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="form-label">שם הלוח</label>
                <input
                  className="input-field"
                  value={boardForm.name}
                  onChange={(e) => setBoardForm({ ...boardForm, name: e.target.value })}
                  placeholder="למשל: סלון מודרני"
                />
              </div>
              <div>
                <label className="form-label">תיאור</label>
                <input
                  className="input-field"
                  value={boardForm.description}
                  onChange={(e) => setBoardForm({ ...boardForm, description: e.target.value })}
                  placeholder="תיאור קצר (אופציונלי)"
                />
              </div>
              <div>
                <label className="form-label">מזהה פרויקט (אופציונלי)</label>
                <input
                  className="input-field"
                  value={boardForm.projectId}
                  onChange={(e) => setBoardForm({ ...boardForm, projectId: e.target.value })}
                  placeholder="השאר ריק אם לא קשור לפרויקט"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button className="btn-gold flex items-center gap-2" onClick={handleSaveBoard} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editBoardId ? "עדכן" : "צור לוח"}
              </button>
              <button className="btn-ghost" onClick={() => { setShowBoardForm(false); setEditBoardId(null); }}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showItemForm && (
        <div className="modal-overlay" onClick={() => setShowItemForm(false)}>
          <div className="modal-content animate-in w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">הוספת פריט השראה</h3>
              <button className="btn-ghost p-1" onClick={() => setShowItemForm(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="form-label">תמונה</label>
                <FileUpload
                  compact
                  category="image"
                  folder="inspiration"
                  currentUrl={itemForm.imageUrl}
                  label="העלאת תמונה"
                  onUpload={(file: UploadedFile) => setItemForm({ ...itemForm, imageUrl: file.url })}
                  onError={(err: string) => alert(err)}
                />
              </div>
              <div>
                <label className="form-label">כותרת</label>
                <input
                  className="input-field"
                  value={itemForm.title}
                  onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                  placeholder="למשל: ספה אפורה"
                />
              </div>
              <div>
                <label className="form-label">הערות</label>
                <input
                  className="input-field"
                  value={itemForm.notes}
                  onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
                  placeholder="אופציונלי"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="form-label">סגנון</label>
                  <select
                    className="select-field"
                    value={itemForm.styleTag}
                    onChange={(e) => setItemForm({ ...itemForm, styleTag: e.target.value })}
                  >
                    <option value="">בחר</option>
                    {styleOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">חדר</label>
                  <select
                    className="select-field"
                    value={itemForm.roomTag}
                    onChange={(e) => setItemForm({ ...itemForm, roomTag: e.target.value })}
                  >
                    <option value="">בחר</option>
                    {roomOptions.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">חומר</label>
                  <select
                    className="select-field"
                    value={itemForm.materialTag}
                    onChange={(e) => setItemForm({ ...itemForm, materialTag: e.target.value })}
                  >
                    <option value="">בחר</option>
                    {materialOptions.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button className="btn-gold flex items-center gap-2" onClick={handleAddItem} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                הוסף פריט
              </button>
              <button className="btn-ghost" onClick={() => setShowItemForm(false)}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
