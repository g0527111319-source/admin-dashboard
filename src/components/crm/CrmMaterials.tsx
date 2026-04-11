"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, X, ChevronLeft, ChevronDown, ChevronUp,
  Package, Trash2, Edit3, Eye, EyeOff, DollarSign,
} from "lucide-react";

type MaterialItem = {
  id: string;
  categoryId: string;
  productName: string;
  supplierName: string | null;
  price: number | null;
  notes: string | null;
  imageUrl: string | null;
  isVisibleToClient: boolean;
  createdAt: string;
};

type MaterialCategory = {
  id: string;
  projectId: string;
  name: string;
  sortOrder: number;
  items: MaterialItem[];
};

type Project = {
  id: string;
  name: string;
};

export default function CrmMaterials({ clientId, projectId }: { clientId?: string; projectId?: string } = {}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Forms
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [showItemForm, setShowItemForm] = useState<string | null>(null); // categoryId
  const [editingItem, setEditingItem] = useState<MaterialItem | null>(null);
  const [itemForm, setItemForm] = useState({
    productName: "",
    supplierName: "",
    price: "",
    notes: "",
    imageUrl: "",
    isVisibleToClient: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Fetch projects
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/designer/crm/projects");
        if (res.ok) {
          const data = await res.json();
          const list = data.projects || data;
          setProjects(Array.isArray(list) ? list : []);
        }
      } catch {
        console.error("Failed to fetch projects");
      }
    })();
  }, []);

  // Fetch materials
  const fetchMaterials = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/designer/crm/projects/${selectedProjectId}/materials`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
        // Expand all by default
        setExpandedCategories(new Set(data.map((c: MaterialCategory) => c.id)));
      }
    } catch {
      console.error("Failed to fetch materials");
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedProjectId) fetchMaterials();
  }, [selectedProjectId, fetchMaterials]);

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Add category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim() || !selectedProjectId) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/designer/crm/projects/${selectedProjectId}/materials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: categoryName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "שגיאה");
        return;
      }
      setCategoryName("");
      setShowCategoryForm(false);
      fetchMaterials();
    } catch {
      setError("שגיאת רשת");
    } finally {
      setSaving(false);
    }
  };

  // Delete category
  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm("למחוק את הקטגוריה וכל הפריטים שבה?")) return;
    try {
      await fetch(`/api/designer/crm/projects/${selectedProjectId}/materials/${categoryId}`, {
        method: "DELETE",
      });
      fetchMaterials();
    } catch {
      console.error("Delete failed");
    }
  };

  // Add/Edit item
  const handleSubmitItem = async (e: React.FormEvent, categoryId: string) => {
    e.preventDefault();
    if (!itemForm.productName.trim() || !selectedProjectId) return;
    setSaving(true);
    setError("");

    try {
      if (editingItem) {
        // Update existing item
        const res = await fetch(`/api/designer/crm/projects/${selectedProjectId}/materials/${categoryId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: editingItem.id,
            productName: itemForm.productName.trim(),
            supplierName: itemForm.supplierName.trim() || null,
            price: itemForm.price ? parseFloat(itemForm.price) : null,
            notes: itemForm.notes.trim() || null,
            imageUrl: itemForm.imageUrl.trim() || null,
            isVisibleToClient: itemForm.isVisibleToClient,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "שגיאה");
          return;
        }
      } else {
        // Create new item
        const res = await fetch(`/api/designer/crm/projects/${selectedProjectId}/materials/${categoryId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productName: itemForm.productName.trim(),
            supplierName: itemForm.supplierName.trim() || null,
            price: itemForm.price ? parseFloat(itemForm.price) : null,
            notes: itemForm.notes.trim() || null,
            imageUrl: itemForm.imageUrl.trim() || null,
            isVisibleToClient: itemForm.isVisibleToClient,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "שגיאה");
          return;
        }
      }

      setShowItemForm(null);
      setEditingItem(null);
      setItemForm({ productName: "", supplierName: "", price: "", notes: "", imageUrl: "", isVisibleToClient: true });
      fetchMaterials();
    } catch {
      setError("שגיאת רשת");
    } finally {
      setSaving(false);
    }
  };

  const startEditItem = (item: MaterialItem) => {
    setEditingItem(item);
    setItemForm({
      productName: item.productName,
      supplierName: item.supplierName || "",
      price: item.price?.toString() || "",
      notes: item.notes || "",
      imageUrl: item.imageUrl || "",
      isVisibleToClient: item.isVisibleToClient,
    });
    setShowItemForm(item.categoryId);
  };

  const totalBudget = categories.reduce(
    (sum, cat) => sum + cat.items.reduce((s, item) => s + (item.price || 0), 0),
    0
  );

  // Project selection
  if (!selectedProjectId) {
    return (
      <div className="space-y-6 animate-in">
        <h2 className="text-xl font-heading text-text-primary">ניהול חומרים</h2>
        <p className="text-text-muted text-sm">בחרי פרויקט לניהול חומרים ורכש:</p>
        {projects.length === 0 ? (
          <div className="card-static text-center py-12">
            <Package className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
            <p className="text-text-muted">אין פרויקטים עדיין</p>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                className="w-full card-static hover:border-gold/30 transition-colors text-right flex items-center gap-3"
              >
                <Package className="w-5 h-5 text-gold" />
                <span className="text-text-primary font-medium">{p.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedProjectId(null)}
            className="flex items-center gap-1 text-gold text-sm hover:underline"
          >
            <ChevronLeft className="w-4 h-4" />
            חזרה
          </button>
          <h2 className="text-xl font-heading text-text-primary">
            חומרים — {projects.find((p) => p.id === selectedProjectId)?.name}
          </h2>
        </div>
        <button
          onClick={() => setShowCategoryForm(true)}
          className="btn-gold text-sm flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          קטגוריה חדשה
        </button>
      </div>

      {/* Total Budget */}
      {categories.length > 0 && (
        <div className="card-static flex items-center gap-3">
          <DollarSign className="w-5 h-5 text-gold" />
          <span className="text-text-primary font-medium">סה״כ תקציב חומרים:</span>
          <span className="text-gold font-bold text-lg">₪{totalBudget.toLocaleString()}</span>
          <span className="text-text-muted text-sm">
            ({categories.reduce((s, c) => s + c.items.length, 0)} פריטים)
          </span>
        </div>
      )}

      {/* Add Category Form */}
      {showCategoryForm && (
        <form onSubmit={handleAddCategory} className="card-static space-y-3">
          <h3 className="text-base font-heading text-text-primary">קטגוריה חדשה</h3>
          <input
            type="text"
            className="input-field"
            placeholder="שם הקטגוריה (לדוגמה: ריצוף, סניטרי, נגרות...)"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-gold text-sm">
              {saving ? "שומר..." : "הוסף"}
            </button>
            <button
              type="button"
              onClick={() => { setShowCategoryForm(false); setError(""); }}
              className="text-text-muted text-sm hover:underline"
            >
              ביטול
            </button>
          </div>
        </form>
      )}

      {/* Categories */}
      {loading ? (
        <div className="text-center py-12 text-text-muted">טוען...</div>
      ) : categories.length === 0 ? (
        <div className="card-static text-center py-12">
          <Package className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
          <p className="text-text-muted">אין קטגוריות חומרים עדיין. הוסיפי קטגוריה ראשונה!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => {
            const isExpanded = expandedCategories.has(category.id);
            const categoryTotal = category.items.reduce((s, item) => s + (item.price || 0), 0);

            return (
              <div key={category.id} className="card-static">
                {/* Category Header */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="flex items-center gap-2 flex-1 text-right"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-text-muted" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-text-muted" />
                    )}
                    <span className="text-text-primary font-medium">{category.name}</span>
                    <span className="text-text-muted text-xs">({category.items.length} פריטים)</span>
                    {categoryTotal > 0 && (
                      <span className="text-gold text-sm font-medium mr-auto">
                        ₪{categoryTotal.toLocaleString()}
                      </span>
                    )}
                  </button>
                  <div className="flex items-center gap-2 mr-2">
                    <button
                      onClick={() => {
                        setEditingItem(null);
                        setItemForm({ productName: "", supplierName: "", price: "", notes: "", imageUrl: "", isVisibleToClient: true });
                        setShowItemForm(category.id);
                      }}
                      className="p-1.5 text-text-muted hover:text-gold transition-colors"
                      title="הוסף פריט"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="p-1.5 text-text-muted hover:text-red-500 transition-colors"
                      title="מחק קטגוריה"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Items */}
                {isExpanded && (
                  <div className="mt-3 space-y-2">
                    {/* Add/Edit Item Form */}
                    {showItemForm === category.id && (
                      <form
                        onSubmit={(e) => handleSubmitItem(e, category.id)}
                        className="bg-bg-surface rounded-btn p-4 space-y-3"
                      >
                        <h4 className="text-sm font-heading text-text-primary">
                          {editingItem ? "עריכת פריט" : "פריט חדש"}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            className="input-field"
                            placeholder="שם המוצר *"
                            value={itemForm.productName}
                            onChange={(e) => setItemForm({ ...itemForm, productName: e.target.value })}
                            required
                          />
                          <input
                            type="text"
                            className="input-field"
                            placeholder="שם ספק"
                            value={itemForm.supplierName}
                            onChange={(e) => setItemForm({ ...itemForm, supplierName: e.target.value })}
                          />
                          <input
                            type="number"
                            className="input-field"
                            placeholder="מחיר (₪)"
                            value={itemForm.price}
                            onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                            dir="ltr"
                          />
                          <input
                            type="url"
                            className="input-field"
                            placeholder="קישור לתמונה"
                            value={itemForm.imageUrl}
                            onChange={(e) => setItemForm({ ...itemForm, imageUrl: e.target.value })}
                            dir="ltr"
                          />
                        </div>
                        <textarea
                          className="input-field h-16 resize-none"
                          placeholder="הערות"
                          value={itemForm.notes}
                          onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
                        />
                        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                          <input
                            type="checkbox"
                            checked={itemForm.isVisibleToClient}
                            onChange={(e) => setItemForm({ ...itemForm, isVisibleToClient: e.target.checked })}
                            className="accent-gold"
                          />
                          גלוי ללקוח בפורטל
                        </label>
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <div className="flex gap-2">
                          <button type="submit" disabled={saving} className="btn-gold text-sm">
                            {saving ? "שומר..." : editingItem ? "עדכון" : "הוסף פריט"}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowItemForm(null); setEditingItem(null); setError(""); }}
                            className="text-text-muted text-sm hover:underline"
                          >
                            ביטול
                          </button>
                        </div>
                      </form>
                    )}

                    {category.items.length === 0 && showItemForm !== category.id ? (
                      <p className="text-text-muted text-sm py-2">אין פריטים בקטגוריה זו</p>
                    ) : (
                      category.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-bg-surface rounded-btn hover:bg-gold/5 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.productName}
                                className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
                                <Package className="w-5 h-5 text-gold" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-text-primary text-sm font-medium truncate">
                                {item.productName}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-text-muted mt-0.5">
                                {item.supplierName && <span>{item.supplierName}</span>}
                                {item.price != null && (
                                  <span className="text-gold font-medium">₪{item.price.toLocaleString()}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mr-2">
                            {item.isVisibleToClient ? (
                              <Eye className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5 text-text-muted" />
                            )}
                            <button
                              onClick={() => startEditItem(item)}
                              className="p-1.5 text-text-muted hover:text-gold transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
