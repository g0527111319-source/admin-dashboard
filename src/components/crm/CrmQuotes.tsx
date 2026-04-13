"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  FileText, Plus, X, Send, CheckCircle2, Clock, XCircle,
  Download, Pen, Eye, Trash2, Edit3, Copy,
  Type, AlignRight, Hash, Calendar, DollarSign, Phone,
  User, Layers, ChevronDown, ChevronUp, Settings2,
  LayoutTemplate, GripVertical, Sparkles,
  Upload, FileImage, File, Move, Maximize2, MapPin,
  Home, ZoomIn, ZoomOut, MousePointer, ChevronLeft
} from "lucide-react";
import PdfExportButton from "@/components/PdfExportButton";
import { g } from "@/lib/gender";

// ==========================
// TYPES
// ==========================

type FieldType = "text" | "number" | "date" | "textarea"
  | "client_name" | "client_email" | "client_phone" | "client_address" | "project_name";
type FieldOwner = "designer" | "client";

// Fields that auto-fill from CrmClient or project
const CLIENT_AUTO_FIELDS: FieldType[] = ["client_name", "client_email", "client_phone", "client_address", "project_name"];

interface FieldPosition {
  x: number;
  y: number;
  w: number;
  h: number;
  blockId: string;
}

interface TemplateField {
  id: string;
  label: string;
  type: FieldType;
  owner: FieldOwner;
  required: boolean;
  placeholder?: string;
  defaultValue?: string;
  width?: "full" | "half";
  position?: FieldPosition;
}

interface ContentBlock {
  id: string;
  type: "heading" | "paragraph" | "divider" | "spacer" | "file";
  content: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
}

interface QuoteTemplate {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  contentBlocks: ContentBlock[];
  fields: TemplateField[];
  createdAt: string;
}

type QuoteService = { name: string; description?: string; quantity: number; unitPrice: number; total: number };

type Quote = {
  id: string;
  projectId: string;
  quoteNumber: string | null;
  title: string;
  services: QuoteService[];
  totalAmount: number;
  paymentTerms: string | null;
  validUntil: string | null;
  status: string;
  createdAt: string;
};

type ProjectClient = { id: string; name: string; email: string | null; phone: string | null; address?: string | null };
type Project = { id: string; name: string; clientId?: string; client?: ProjectClient };

type ViewMode = "quotes" | "templates" | "template-edit" | "quote-create" | "quote-edit";

const statusLabel: Record<string, string> = {
  DRAFT: "טיוטה",
  SENT: "נשלח",
  APPROVED: "אושר",
  REVISION_REQUESTED: "נדרש תיקון",
  REJECTED: "נדחה",
  CONVERTED_TO_CONTRACT: "הומר לחוזה",
};

const statusColor: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-50 text-blue-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REVISION_REQUESTED: "bg-amber-50 text-amber-700",
  REJECTED: "bg-red-50 text-red-700",
  CONVERTED_TO_CONTRACT: "bg-purple-50 text-purple-700",
};

const statusIcon: Record<string, typeof Clock> = {
  DRAFT: Edit3,
  SENT: Send,
  APPROVED: CheckCircle2,
  REVISION_REQUESTED: Clock,
  REJECTED: XCircle,
  CONVERTED_TO_CONTRACT: FileText,
};

const fieldTypeIcons: Record<FieldType, typeof Type> = {
  text: Type, number: Hash, date: Calendar,
  textarea: AlignRight,
  client_name: User, client_email: Type, client_phone: Phone, client_address: Home,
  project_name: Layers,
};

const fieldTypeLabels: Record<FieldType, string> = {
  text: "טקסט", number: "מספר", date: "תאריך",
  textarea: "טקסט ארוך",
  client_name: "שם לקוח", client_email: "אימייל לקוח",
  client_phone: "טלפון לקוח", client_address: "כתובת לקוח",
  project_name: "שם פרויקט",
};

// Field type groups for the toolbar
const FIELD_GROUPS = [
  {
    label: "שדות מילוי אוטומטי",
    fields: [
      { type: "client_name" as FieldType, label: "שם לקוח", owner: "client" as FieldOwner },
      { type: "client_email" as FieldType, label: "אימייל לקוח", owner: "client" as FieldOwner },
      { type: "client_phone" as FieldType, label: "טלפון לקוח", owner: "client" as FieldOwner },
      { type: "client_address" as FieldType, label: "כתובת לקוח", owner: "client" as FieldOwner },
      { type: "project_name" as FieldType, label: "שם פרויקט", owner: "client" as FieldOwner },
    ],
  },
  {
    label: "שדות מעצבת",
    fields: [
      { type: "text" as FieldType, label: "טקסט", owner: "designer" as FieldOwner },
      { type: "number" as FieldType, label: "מספר", owner: "designer" as FieldOwner },
      { type: "date" as FieldType, label: "תאריך", owner: "designer" as FieldOwner },
      { type: "textarea" as FieldType, label: "טקסט ארוך", owner: "designer" as FieldOwner },
    ],
  },
  {
    label: "שדות לקוח (מילוי ידני)",
    fields: [
      { type: "text" as FieldType, label: "טקסט חופשי", owner: "client" as FieldOwner },
      { type: "number" as FieldType, label: "מספר", owner: "client" as FieldOwner },
      { type: "date" as FieldType, label: "תאריך", owner: "client" as FieldOwner },
    ],
  },
];

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

// ==========================
// TEMPLATE EDITOR
// ==========================

function QuoteTemplateEditor({
  template,
  onSave,
  onCancel,
  gender,
}: {
  template: QuoteTemplate | null;
  onSave: (data: Partial<QuoteTemplate>) => void;
  onCancel: () => void;
  gender?: string;
}) {
  const gdr = gender || "female";
  const [name, setName] = useState(template?.name || "");
  const [description, setDescription] = useState(template?.description || "");
  const [blocks, setBlocks] = useState<ContentBlock[]>(template?.contentBlocks || []);
  const [fields, setFields] = useState<TemplateField[]>(template?.fields || []);
  const [isDefault, setIsDefault] = useState(template?.isDefault || false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [dragging, setDragging] = useState<{ fieldId: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [resizing, setResizing] = useState<{ fieldId: string; startX: number; startY: number; origW: number; origH: number } | null>(null);

  const fileBlocks = blocks.filter(b => b.type === "file");

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const isPdf = file.type === "application/pdf";
      const isImage = file.type.startsWith("image/");
      if (!isPdf && !isImage) return;

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const newBlock: ContentBlock = {
          id: generateId(),
          type: "file",
          content: file.name,
          fileUrl: dataUrl,
          fileName: file.name,
          fileType: isPdf ? "pdf" : "image",
        };
        setBlocks(prev => [...prev, newBlock]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    setFields(prev => prev.map(f =>
      f.position?.blockId === id ? { ...f, position: undefined } : f
    ));
  };

  const addFieldToDocument = (type: FieldType, owner: FieldOwner, label: string) => {
    const targetBlock = fileBlocks[0];
    if (!targetBlock) return;

    const newField: TemplateField = {
      id: generateId(),
      label,
      type,
      owner,
      required: true,
      width: "full",
      position: {
        x: 20 + Math.random() * 20,
        y: 20 + Math.random() * 30,
        w: 28,
        h: 5,
        blockId: targetBlock.id,
      },
    };
    setFields(prev => [...prev, newField]);
    setSelectedFieldId(newField.id);
  };

  const updateField = (id: string, updates: Partial<TemplateField>) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id: string) => {
    setFields(prev => prev.filter(f => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const getFieldColors = (f: TemplateField) => {
    if (CLIENT_AUTO_FIELDS.includes(f.type)) return "border-emerald-500 bg-emerald-500/15 text-emerald-700";
    if (f.owner === "designer") return "border-amber-500 bg-amber-500/15 text-amber-700";
    return "border-blue-500 bg-blue-500/15 text-blue-700";
  };

  const getFieldDotColor = (f: TemplateField) => {
    if (CLIENT_AUTO_FIELDS.includes(f.type)) return "bg-emerald-500";
    if (f.owner === "designer") return "bg-amber-500";
    return "bg-blue-500";
  };

  // Drag & resize handlers
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, fieldId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const field = fields.find(f => f.id === fieldId);
    if (!field?.position) return;
    setSelectedFieldId(fieldId);

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    setDragging({
      fieldId, startX: clientX, startY: clientY,
      origX: field.position.x, origY: field.position.y,
    });
  };

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, fieldId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const field = fields.find(f => f.id === fieldId);
    if (!field?.position) return;

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    setResizing({
      fieldId, startX: clientX, startY: clientY,
      origW: field.position.w, origH: field.position.h,
    });
  };

  useEffect(() => {
    if (!dragging && !resizing) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      if (dragging) {
        const field = fields.find(f => f.id === dragging.fieldId);
        if (!field?.position) return;
        const container = containerRefs.current[field.position.blockId];
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const dx = ((clientX - dragging.startX) / rect.width) * 100;
        const dy = ((clientY - dragging.startY) / rect.height) * 100;
        const newX = Math.max(0, Math.min(100 - field.position.w, dragging.origX + dx));
        const newY = Math.max(0, Math.min(100 - field.position.h, dragging.origY + dy));
        updateField(dragging.fieldId, {
          position: { ...field.position, x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10 },
        });
      }

      if (resizing) {
        const field = fields.find(f => f.id === resizing.fieldId);
        if (!field?.position) return;
        const container = containerRefs.current[field.position.blockId];
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const dw = ((clientX - resizing.startX) / rect.width) * 100;
        const dh = ((clientY - resizing.startY) / rect.height) * 100;
        const newW = Math.max(8, Math.min(100 - field.position.x, resizing.origW + dw));
        const newH = Math.max(3, Math.min(100 - field.position.y, resizing.origH + dh));
        updateField(resizing.fieldId, {
          position: { ...field.position, w: Math.round(newW * 10) / 10, h: Math.round(newH * 10) / 10 },
        });
      }
    };

    const handleEnd = () => {
      setDragging(null);
      setResizing(null);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [dragging, resizing, fields]);

  const selectedField = fields.find(f => f.id === selectedFieldId);

  return (
    <div className="space-y-4 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading font-bold text-text-primary flex items-center gap-2">
          <LayoutTemplate className="w-5 h-5 text-gold" />
          {template ? "עריכת תבנית הצעה" : "תבנית הצעת מחיר חדשה"}
        </h2>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-ghost">ביטול</button>
          <button
            onClick={() => onSave({
              name, description: description || null,
              contentBlocks: blocks as unknown as ContentBlock[],
              fields: fields as unknown as TemplateField[],
              isDefault,
            })}
            disabled={!name.trim()}
            className="btn-gold disabled:opacity-40"
          >
            <CheckCircle2 className="w-4 h-4 inline ml-1" />
            שמור תבנית
          </button>
        </div>
      </div>

      {/* Basic info row */}
      <div className="card-static">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="form-label">שם התבנית *</label>
            <input value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="הצעת מחיר עיצוב פנים" />
          </div>
          <div>
            <label className="form-label">תיאור</label>
            <input value={description} onChange={e => setDescription(e.target.value)} className="input-field" placeholder="תיאור קצר" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer pb-2">
              <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)}
                className="w-4 h-4 rounded border-border-subtle text-gold focus:ring-gold/30" />
              <span className="text-sm text-text-secondary">תבנית ברירת מחדל</span>
            </label>
          </div>
        </div>
      </div>

      {/* Main layout: Document + Tool Panel */}
      <div className="flex gap-4" style={{ minHeight: 600 }}>
        {/* LEFT: Document Area */}
        <div className="flex-1 min-w-0">
          {fileBlocks.length === 0 ? (
            /* Upload area */
            <div className="card-static border-2 border-dashed border-gold/30 bg-gold/3 hover:bg-gold/5 transition-colors h-full flex items-center justify-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.svg,image/png,image/webp,image/svg+xml"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-4 py-8 cursor-pointer"
              >
                <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-gold" />
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold text-text-primary">העלאת קובץ הצעת מחיר</p>
                  <p className="text-sm text-text-muted mt-1">PDF, PNG, JPG — ניתן להעלות מספר עמודים</p>
                  <p className="text-xs text-text-faint mt-2">לאחר ההעלאה ניתן לגרור שדות על המסמך</p>
                </div>
              </button>
            </div>
          ) : (
            /* Document viewer with overlaid fields */
            <div className="space-y-4">
              {/* Zoom controls */}
              <div className="flex items-center justify-between bg-bg-surface rounded-lg px-3 py-1.5">
                <div className="flex items-center gap-1">
                  <button onClick={() => fileInputRef.current?.click()} className="btn-ghost text-xs flex items-center gap-1">
                    <Plus className="w-3 h-3" /> הוסף עמוד
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.svg,image/png,image/webp,image/svg+xml"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="p-1.5 rounded hover:bg-white transition-colors" title="הקטן">
                    <ZoomOut className="w-4 h-4 text-text-muted" />
                  </button>
                  <span className="text-xs text-text-muted font-mono w-10 text-center">{zoom}%</span>
                  <button onClick={() => setZoom(z => Math.min(150, z + 10))} className="p-1.5 rounded hover:bg-white transition-colors" title="הגדל">
                    <ZoomIn className="w-4 h-4 text-text-muted" />
                  </button>
                  <button onClick={() => setZoom(100)} className="text-xs text-text-faint hover:text-text-primary transition-colors">איפוס</button>
                </div>
              </div>

              {/* Pages */}
              <div className="space-y-6 overflow-auto max-h-[75vh]" style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}>
                {fileBlocks.map((block, pageIdx) => {
                  const fieldsOnBlock = fields.filter(f => f.position?.blockId === block.id);
                  return (
                    <div key={block.id} className="relative">
                      {/* Page header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {block.fileType === "pdf" ? <File className="w-4 h-4 text-red-500" /> : <FileImage className="w-4 h-4 text-blue-500" />}
                          <span className="text-sm font-medium text-text-primary">עמוד {pageIdx + 1}</span>
                          <span className="text-2xs text-text-faint">({fieldsOnBlock.length} שדות)</span>
                        </div>
                        <button onClick={() => removeBlock(block.id)} className="p-1 rounded hover:bg-red-50 text-text-faint hover:text-red-500 transition-colors" title="הסר עמוד">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Document with fields overlay */}
                      <div
                        ref={el => { containerRefs.current[block.id] = el; }}
                        className="relative border-2 border-border-subtle rounded-xl overflow-hidden bg-white select-none shadow-sm"
                        style={{ minHeight: 500 }}
                        onClick={() => setSelectedFieldId(null)}
                      >
                        {block.fileType === "image" && block.fileUrl && (
                          <img src={block.fileUrl} alt={block.fileName} className="w-full pointer-events-none" draggable={false} />
                        )}
                        {block.fileType === "pdf" && block.fileUrl && (
                          <iframe src={block.fileUrl} className="w-full pointer-events-none" style={{ height: 700 }} title={block.fileName} />
                        )}

                        {/* Field overlays */}
                        {fieldsOnBlock.map(field => {
                          const pos = field.position!;
                          const colors = getFieldColors(field);
                          const FieldIcon = fieldTypeIcons[field.type] || Type;
                          const isSelected = selectedFieldId === field.id;
                          const isAutoField = CLIENT_AUTO_FIELDS.includes(field.type);

                          return (
                            <div
                              key={field.id}
                              className={`absolute border-2 rounded-lg cursor-move flex items-center gap-1.5 px-2 transition-all ${colors} ${
                                isSelected ? "shadow-lg ring-2 ring-gold/50 z-30" : dragging?.fieldId === field.id ? "shadow-lg z-20" : "hover:shadow-md z-10"
                              }`}
                              style={{
                                left: `${pos.x}%`,
                                top: `${pos.y}%`,
                                width: `${pos.w}%`,
                                height: `${pos.h}%`,
                                minHeight: 28,
                              }}
                              onMouseDown={e => handleDragStart(e, field.id)}
                              onTouchStart={e => handleDragStart(e, field.id)}
                              onClick={e => { e.stopPropagation(); setSelectedFieldId(field.id); }}
                            >
                              <FieldIcon className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
                              <span className="text-xs font-medium truncate flex-1">
                                {field.label || fieldTypeLabels[field.type]}
                              </span>
                              {isAutoField && (
                                <Sparkles className="w-3 h-3 flex-shrink-0 opacity-60" />
                              )}
                              {isSelected && (
                                <button
                                  className="p-0.5 rounded hover:bg-black/10 flex-shrink-0"
                                  onClick={e => { e.stopPropagation(); removeField(field.id); }}
                                  title="הסר שדה"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {/* Resize handle */}
                              <div
                                className="absolute bottom-0 left-0 w-5 h-5 cursor-se-resize flex items-center justify-center rounded-tr-md"
                                onMouseDown={e => handleResizeStart(e, field.id)}
                                onTouchStart={e => handleResizeStart(e, field.id)}
                              >
                                <Maximize2 className="w-3 h-3 opacity-40" />
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
          )}
        </div>

        {/* RIGHT: Tool Panel */}
        <div className="w-72 flex-shrink-0 space-y-4">
          {/* Field palette */}
          <div className="card-static space-y-4 max-h-[75vh] overflow-auto">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <MousePointer className="w-4 h-4 text-gold" />
              הוסף שדה למסמך
            </h3>

            {fileBlocks.length === 0 ? (
              <p className="text-xs text-text-faint text-center py-4">
                {g(gdr, "העלה", "העלי")} קובץ הצעת מחיר כדי להתחיל להוסיף שדות
              </p>
            ) : (
              <div className="space-y-4">
                {FIELD_GROUPS.map(group => (
                  <div key={group.label}>
                    <p className="text-2xs font-semibold text-text-muted mb-2 uppercase tracking-wide">{group.label}</p>
                    <div className="space-y-1">
                      {group.fields.map((fd, idx) => {
                        const Icon = fieldTypeIcons[fd.type];
                        const isAutoField = CLIENT_AUTO_FIELDS.includes(fd.type);
                        return (
                          <button
                            key={`${fd.type}-${fd.owner}-${idx}`}
                            onClick={() => addFieldToDocument(fd.type, fd.owner, fd.label)}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-gold/5 hover:text-text-primary transition-colors text-right"
                          >
                            <Icon className="w-4 h-4 flex-shrink-0 text-text-muted" />
                            <span className="flex-1">{fd.label}</span>
                            {isAutoField && <Sparkles className="w-3 h-3 text-emerald-500" />}
                            <Plus className="w-3 h-3 opacity-40" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected field properties */}
          {selectedField && (
            <div className="card-static space-y-3 border-2 border-gold/20">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">הגדרות שדה</h3>
                <button onClick={() => removeField(selectedField.id)} className="p-1 rounded text-text-faint hover:text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Label */}
              <div>
                <label className="form-label text-xs">תווית</label>
                <input
                  value={selectedField.label}
                  onChange={e => updateField(selectedField.id, { label: e.target.value })}
                  className="input-field text-sm"
                  placeholder="שם השדה"
                />
              </div>

              {/* Type */}
              <div>
                <label className="form-label text-xs">סוג</label>
                {CLIENT_AUTO_FIELDS.includes(selectedField.type) ? (
                  <div className="input-field text-sm bg-bg-surface/50 flex items-center gap-2">
                    {(() => { const Icon = fieldTypeIcons[selectedField.type]; return <Icon className="w-4 h-4 text-text-muted" />; })()}
                    {fieldTypeLabels[selectedField.type]}
                    <span className="text-2xs text-emerald-600 mr-auto">מילוי אוטומטי</span>
                  </div>
                ) : (
                  <select
                    value={selectedField.type}
                    onChange={e => updateField(selectedField.id, { type: e.target.value as FieldType })}
                    className="select-field text-sm"
                  >
                    {(["text", "number", "date", "textarea"] as FieldType[]).map(t => (
                      <option key={t} value={t}>{fieldTypeLabels[t]}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Owner */}
              {!CLIENT_AUTO_FIELDS.includes(selectedField.type) && (
                <div>
                  <label className="form-label text-xs">ממולא ע״י</label>
                  <select
                    value={selectedField.owner}
                    onChange={e => updateField(selectedField.id, { owner: e.target.value as FieldOwner })}
                    className="select-field text-sm"
                  >
                    <option value="designer">{g(gdr, "מעצב", "מעצבת")}</option>
                    <option value="client">לקוח</option>
                  </select>
                </div>
              )}

              {/* Required */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedField.required}
                  onChange={e => updateField(selectedField.id, { required: e.target.checked })}
                  className="w-3.5 h-3.5 rounded text-gold"
                />
                <span className="text-sm text-text-secondary">שדה חובה</span>
              </label>

              {/* Placeholder */}
              <div>
                <label className="form-label text-xs">placeholder</label>
                <input
                  value={selectedField.placeholder || ""}
                  onChange={e => updateField(selectedField.id, { placeholder: e.target.value })}
                  className="input-field text-sm"
                  placeholder="טקסט רמז..."
                  dir="auto"
                />
              </div>

              {/* Move to different page */}
              {fileBlocks.length > 1 && selectedField.position && (
                <div>
                  <label className="form-label text-xs">עמוד</label>
                  <select
                    value={selectedField.position.blockId}
                    onChange={e => updateField(selectedField.id, {
                      position: { ...selectedField.position!, blockId: e.target.value },
                    })}
                    className="select-field text-sm"
                  >
                    {fileBlocks.map((fb, i) => (
                      <option key={fb.id} value={fb.id}>עמוד {i + 1}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Fields list */}
          {fields.length > 0 && (
            <div className="card-static space-y-2">
              <h3 className="text-sm font-semibold text-text-primary mb-2">
                שדות ({fields.length})
              </h3>
              {fields.map(field => (
                <div
                  key={field.id}
                  onClick={() => setSelectedFieldId(field.id)}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedFieldId === field.id ? "bg-gold/10 border border-gold/30" : "hover:bg-bg-surface/50"
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getFieldDotColor(field)}`} />
                  <span className="text-xs text-text-primary truncate flex-1">{field.label || fieldTypeLabels[field.type]}</span>
                  <span className="text-2xs text-text-faint">{field.owner === "designer" ? g(gdr, "מעצב", "מעצבת") : "לקוח"}</span>
                </div>
              ))}
            </div>
          )}

          {/* Legend */}
          <div className="card-static">
            <div className="grid grid-cols-2 gap-2 text-2xs text-text-muted">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded border-2 border-amber-500 bg-amber-500/15" /> {g(gdr, "מעצב", "מעצבת")}</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded border-2 border-blue-500 bg-blue-500/15" /> לקוח</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded border-2 border-emerald-500 bg-emerald-500/15" /> אוטומטי</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================
// QUOTE CREATE/EDIT FORM (from template)
// ==========================

function QuoteForm({
  quote,
  template,
  projects,
  selectedProjectId: initialProjectId,
  onSave,
  onCancel,
  gender,
}: {
  quote: Quote | null;
  template: QuoteTemplate | null;
  projects: Project[];
  selectedProjectId?: string;
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  gender?: string;
}) {
  const gdr = gender || "female";
  const [title, setTitle] = useState(quote?.title || (template?.name || ""));
  const [projectId, setProjectId] = useState(quote?.projectId || initialProjectId || "");
  const [paymentTerms, setPaymentTerms] = useState(quote?.paymentTerms || "");
  const [validUntil, setValidUntil] = useState(quote?.validUntil?.split("T")[0] || "");
  const [services, setServices] = useState<QuoteService[]>(
    quote?.services || [{ name: "", description: "", quantity: 1, unitPrice: 0, total: 0 }]
  );
  const [designerValues, setDesignerValues] = useState<Record<string, string>>({});
  const [autoPopulated, setAutoPopulated] = useState(false);

  const selectedProject = projects.find(p => p.id === projectId);
  const designerFields = (template?.fields || []).filter(f => f.owner === "designer" && !CLIENT_AUTO_FIELDS.includes(f.type));
  const calcTotal = (svcs: QuoteService[]) => svcs.reduce((s, sv) => s + sv.total, 0);

  const handleProjectChange = (newProjectId: string) => {
    setProjectId(newProjectId);
    const project = projects.find(p => p.id === newProjectId);
    if (project?.client && template) {
      const c = project.client;
      setAutoPopulated(true);
      // Auto-populate auto fields
      const autoValues: Record<string, string> = {};
      template.fields.forEach(f => {
        if (f.type === "client_name" && c.name) autoValues[f.id] = c.name;
        if (f.type === "client_email" && c.email) autoValues[f.id] = c.email;
        if (f.type === "client_phone" && c.phone) autoValues[f.id] = c.phone;
        if (f.type === "client_address" && c.address) autoValues[f.id] = c.address;
        if (f.type === "project_name") autoValues[f.id] = project.name;
      });
      setDesignerValues(prev => ({ ...prev, ...autoValues }));
    }
  };

  useEffect(() => {
    if (projectId && !quote && !autoPopulated) {
      handleProjectChange(projectId);
    }
  }, [projectId, projects]);

  const updateService = (index: number, field: string, value: string | number) => {
    const updated = [...services];
    (updated[index] as Record<string, unknown>)[field] = value;
    if (field === "quantity" || field === "unitPrice") {
      updated[index].total = Number(updated[index].quantity) * Number(updated[index].unitPrice);
    }
    setServices(updated);
  };

  const handleSave = () => {
    if (!projectId || !title.trim()) return;
    onSave({
      title: title.trim(),
      projectId,
      services,
      totalAmount: calcTotal(services),
      paymentTerms: paymentTerms.trim() || null,
      validUntil: validUntil || null,
      designerFieldValues: designerValues,
    });
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading font-bold text-text-primary flex items-center gap-2">
          <FileText className="w-5 h-5 text-gold" />
          {quote ? "עריכת הצעת מחיר" : "הצעת מחיר חדשה"}
        </h2>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-ghost">ביטול</button>
          <button onClick={handleSave} disabled={!projectId || !title.trim()} className="btn-gold disabled:opacity-40">
            <CheckCircle2 className="w-4 h-4 inline ml-1" />
            {quote ? "עדכן" : "צור הצעה"}
          </button>
        </div>
      </div>

      {/* Basic info */}
      <div className="card-static space-y-4">
        <h3 className="text-sm font-semibold text-text-primary">פרטי הצעה</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">כותרת *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="input-field" placeholder="שם ההצעה" />
          </div>
          <div>
            <label className="form-label">פרויקט *</label>
            <select value={projectId} onChange={e => handleProjectChange(e.target.value)} className="select-field">
              <option value="">-- {g(gdr, "בחר", "בחרי")} פרויקט --</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.client ? `(${p.client.name})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Client info auto-populated */}
      {selectedProject?.client && autoPopulated && (
        <div className="card-static bg-emerald-50/50 border border-emerald-200 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              פרטי לקוח
            </h3>
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              מולא אוטומטית
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm text-text-secondary">
            <div><span className="text-text-muted text-xs">שם:</span> {selectedProject.client.name}</div>
            {selectedProject.client.email && <div><span className="text-text-muted text-xs">אימייל:</span> {selectedProject.client.email}</div>}
            {selectedProject.client.phone && <div><span className="text-text-muted text-xs">טלפון:</span> {selectedProject.client.phone}</div>}
          </div>
        </div>
      )}

      {/* Services */}
      <div className="card-static space-y-4">
        <h3 className="text-sm font-semibold text-text-primary">שורות שירות</h3>
        {services.map((svc, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-4">
              <input type="text" className="input-field text-sm" placeholder="שם השירות" value={svc.name} onChange={e => updateService(i, "name", e.target.value)} />
            </div>
            <div className="col-span-2">
              <input type="number" className="input-field text-sm" placeholder="כמות" value={svc.quantity} onChange={e => updateService(i, "quantity", Number(e.target.value))} dir="ltr" />
            </div>
            <div className="col-span-3">
              <input type="number" className="input-field text-sm" placeholder="מחיר ליחידה" value={svc.unitPrice} onChange={e => updateService(i, "unitPrice", Number(e.target.value))} dir="ltr" />
            </div>
            <div className="col-span-2 text-sm font-mono text-text-primary text-center py-2">
              ₪{svc.total.toLocaleString()}
            </div>
            <button className="col-span-1 text-red-400 hover:text-red-600 text-center pb-2" onClick={() => setServices(services.filter((_, idx) => idx !== i))}>
              <X className="w-4 h-4 inline" />
            </button>
          </div>
        ))}
        <button onClick={() => setServices([...services, { name: "", description: "", quantity: 1, unitPrice: 0, total: 0 }])} className="text-gold text-sm hover:underline flex items-center gap-1">
          <Plus className="w-3 h-3" /> הוסף שורה
        </button>
        <div className="flex justify-between items-center p-3 bg-gold/5 rounded-btn">
          <span className="font-heading font-bold">סה״כ</span>
          <span className="font-mono font-bold text-lg">₪{calcTotal(services).toLocaleString()}</span>
        </div>
      </div>

      {/* Payment terms and validity */}
      <div className="card-static">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">תנאי תשלום</label>
            <input type="text" className="input-field" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} placeholder="לדוגמה: 50% מקדמה, 50% בסיום" />
          </div>
          <div>
            <label className="form-label">בתוקף עד</label>
            <input type="date" className="input-field" value={validUntil} onChange={e => setValidUntil(e.target.value)} dir="ltr" />
          </div>
        </div>
      </div>

      {/* Designer fields from template */}
      {designerFields.length > 0 && (
        <div className="card-static space-y-4">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gold" />
            {`שדות למילוי (${g(gdr, "מעצב", "מעצבת")})`}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {designerFields.map(field => (
              <div key={field.id} className={field.width === "half" ? "" : "sm:col-span-2"}>
                <label className="form-label">
                  {field.label} {field.required && <span className="text-red-400">*</span>}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    value={designerValues[field.id] || ""}
                    onChange={e => setDesignerValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                    className="input-field min-h-[80px] resize-none"
                    placeholder={field.placeholder}
                  />
                ) : (
                  <input
                    type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                    value={designerValues[field.id] || ""}
                    onChange={e => setDesignerValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                    className="input-field"
                    placeholder={field.placeholder}
                    dir={field.type === "number" ? "ltr" : undefined}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================
// MAIN COMPONENT
// ==========================

export default function CrmQuotes({ clientId, projectId, gender }: { clientId?: string; projectId?: string; gender?: string } = {}) {
  const gdr = gender || "female";
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("quotes");
  const [editingTemplate, setEditingTemplate] = useState<QuoteTemplate | null>(null);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || "");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [pRes, tRes] = await Promise.all([
        fetch("/api/designer/crm/projects"),
        fetch("/api/designer/crm/quotes/templates").catch(() => null),
      ]);
      if (pRes.ok) {
        const data = await pRes.json();
        setProjects(data);
        if (data.length > 0 && !selectedProjectId) setSelectedProjectId(data[0].id);
      }
      if (tRes && tRes.ok) {
        try {
          setTemplates(await tRes.json());
        } catch { /* template table may not exist yet */ }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  // Fetch quotes for selected project
  const fetchQuotes = useCallback(async () => {
    if (!selectedProjectId) return;
    try {
      const res = await fetch(`/api/designer/crm/projects/${selectedProjectId}/quotes`);
      if (res.ok) setQuotes(await res.json());
    } catch { /* */ }
  }, [selectedProjectId]);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

  // Template CRUD
  async function saveTemplate(data: Partial<QuoteTemplate>) {
    try {
      const isEdit = !!editingTemplate?.id;
      const url = isEdit ? `/api/designer/crm/quotes/templates/${editingTemplate.id}` : "/api/designer/crm/quotes/templates";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const saved = await res.json();
        if (isEdit) {
          setTemplates(prev => prev.map(t => t.id === saved.id ? saved : t));
        } else {
          setTemplates(prev => [saved, ...prev]);
        }
        setView("templates");
        setEditingTemplate(null);
      }
    } catch (e) { console.error(e); }
  }

  async function deleteTemplate(id: string) {
    if (!confirm("למחוק תבנית זו?")) return;
    try {
      const res = await fetch(`/api/designer/crm/quotes/templates/${id}`, { method: "DELETE" });
      if (res.ok) setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (e) { console.error(e); }
  }

  // Quote CRUD
  async function saveQuote(data: Record<string, unknown>) {
    try {
      const pid = (data.projectId as string) || selectedProjectId;
      if (!pid) return;
      const isEdit = !!editingQuote?.id;
      const url = isEdit
        ? `/api/designer/crm/projects/${pid}/quotes/${editingQuote.id}`
        : `/api/designer/crm/projects/${pid}/quotes`;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setView("quotes");
        setEditingQuote(null);
        // Make sure we're viewing the right project
        if (pid !== selectedProjectId) setSelectedProjectId(pid);
        fetchQuotes();
      }
    } catch (e) { console.error(e); }
  }

  async function updateStatus(quoteId: string, status: string) {
    try {
      await fetch(`/api/designer/crm/projects/${selectedProjectId}/quotes/${quoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchQuotes();
    } catch { /* */ }
  }

  async function deleteQuote(quoteId: string) {
    if (!confirm("למחוק את ההצעה?")) return;
    try {
      await fetch(`/api/designer/crm/projects/${selectedProjectId}/quotes/${quoteId}`, { method: "DELETE" });
      fetchQuotes();
    } catch { /* */ }
  }

  const buildQuoteHtml = (quote: Quote) => {
    const project = projects.find(p => p.id === quote.projectId);
    const rows = (quote.services || []).map(s =>
      `<tr><td>${s.name}</td><td>${s.quantity}</td><td>₪${s.unitPrice.toLocaleString()}</td><td>₪${s.total.toLocaleString()}</td></tr>`
    ).join("");
    return `
      <div class="info-row"><span class="info-label">פרויקט:</span><span class="info-value">${project?.name || ""}</span></div>
      <div class="info-row"><span class="info-label">לקוח:</span><span class="info-value">${project?.client?.name || ""}</span></div>
      ${quote.quoteNumber ? `<div class="info-row"><span class="info-label">מספר הצעה:</span><span class="info-value">#${quote.quoteNumber}</span></div>` : ""}
      ${quote.validUntil ? `<div class="info-row"><span class="info-label">בתוקף עד:</span><span class="info-value">${new Date(quote.validUntil).toLocaleDateString("he-IL")}</span></div>` : ""}
      ${quote.paymentTerms ? `<div class="info-row"><span class="info-label">תנאי תשלום:</span><span class="info-value">${quote.paymentTerms}</span></div>` : ""}
      <table>
        <thead><tr><th>שירות</th><th>כמות</th><th>מחיר ליחידה</th><th>סה״כ</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr class="total-row"><td colspan="3">סה״כ</td><td>₪${quote.totalAmount.toLocaleString()}</td></tr></tfoot>
      </table>
    `;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Template Edit mode
  if (view === "template-edit") {
    return (
      <QuoteTemplateEditor
        template={editingTemplate}
        onSave={saveTemplate}
        onCancel={() => { setView("templates"); setEditingTemplate(null); }}
        gender={gdr}
      />
    );
  }

  // Quote Create/Edit mode
  if (view === "quote-create" || view === "quote-edit") {
    const selectedTemplate = templates.find(t => t.id === selectedTemplateId) || null;
    return (
      <QuoteForm
        quote={editingQuote}
        template={selectedTemplate}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSave={saveQuote}
        onCancel={() => { setView("quotes"); setEditingQuote(null); }}
        gender={gdr}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in" dir="rtl">
      {/* Header with tab switcher */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-bg-surface rounded-lg p-1">
          <button
            onClick={() => setView("quotes")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${view === "quotes" ? "bg-white shadow-sm text-text-primary" : "text-text-muted"}`}
          >
            <FileText className="w-4 h-4 inline ml-1" />
            הצעות מחיר ({quotes.length})
          </button>
          <button
            onClick={() => setView("templates")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${view === "templates" ? "bg-white shadow-sm text-text-primary" : "text-text-muted"}`}
          >
            <LayoutTemplate className="w-4 h-4 inline ml-1" />
            תבניות ({templates.length})
          </button>
        </div>

        {view === "quotes" ? (
          <div className="flex gap-2 items-center">
            {templates.length > 0 && (
              <select
                value={selectedTemplateId}
                onChange={e => setSelectedTemplateId(e.target.value)}
                className="select-field text-sm w-48"
              >
                <option value="">ללא תבנית</option>
                {templates.filter(t => t.isActive).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
            <button
              onClick={() => { setEditingQuote(null); setView("quote-create"); }}
              className="btn-gold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> הצעה חדשה
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setEditingTemplate(null); setView("template-edit"); }}
            className="btn-gold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> תבנית חדשה
          </button>
        )}
      </div>

      {/* ===== QUOTES LIST ===== */}
      {view === "quotes" && (
        <>
          {/* Project selector */}
          <select className="select-field" value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}>
            <option value="">{g(gdr, "בחר", "בחרי")} פרויקט...</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name} {p.client ? `— ${p.client.name}` : ""}</option>)}
          </select>

          {!selectedProjectId ? (
            <div className="card-static text-center py-12 text-text-muted">{g(gdr, "בחר", "בחרי")} פרויקט</div>
          ) : quotes.length === 0 ? (
            <div className="empty-state">
              <FileText className="empty-state-icon" />
              <p className="font-medium text-text-secondary">אין הצעות מחיר עדיין</p>
              <p className="text-sm mt-1 mb-4">{g(gdr, "צור", "צרי")} הצעת מחיר חדשה {g(gdr, "או השתמש", "או השתמשי")} בתבנית</p>
              <button
                onClick={() => { setEditingQuote(null); setView("quote-create"); }}
                className="btn-gold"
              >
                <Plus className="w-4 h-4 inline ml-1" /> הצעה ראשונה
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {quotes.map(quote => {
                const StatusIcon = statusIcon[quote.status] || Clock;
                return (
                  <div key={quote.id} className="card-static group hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <h4 className="font-medium text-text-primary">{quote.title}</h4>
                          <span className={`badge text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${statusColor[quote.status]}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusLabel[quote.status]}
                          </span>
                          {quote.quoteNumber && <span className="text-2xs text-text-faint">#{quote.quoteNumber}</span>}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-text-muted flex-wrap">
                          <span className="font-mono font-semibold">₪{quote.totalAmount.toLocaleString()}</span>
                          <span>{new Date(quote.createdAt).toLocaleDateString("he-IL")}</span>
                          {quote.validUntil && <span>בתוקף עד: {new Date(quote.validUntil).toLocaleDateString("he-IL")}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 mt-3">
                      {quote.status === "DRAFT" && (
                        <button
                          onClick={() => updateStatus(quote.id, "SENT")}
                          className="p-2 rounded-lg text-text-faint hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="שלח ללקוח"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      {quote.status === "SENT" && (
                        <button
                          onClick={() => updateStatus(quote.id, "APPROVED")}
                          className="p-2 rounded-lg text-text-faint hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="אשר"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingQuote(quote);
                          setView("quote-edit");
                        }}
                        className="p-2 rounded-lg text-text-faint hover:text-gold hover:bg-gold/5 transition-colors"
                        title="ערוך"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <PdfExportButton
                        title={quote.title}
                        filename={`quote-${quote.quoteNumber || quote.id}`}
                        htmlContent={buildQuoteHtml(quote)}
                        label="ייצוא PDF"
                      />
                      <button
                        onClick={() => deleteQuote(quote.id)}
                        className="p-2 rounded-lg text-text-faint hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="מחק"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ===== TEMPLATES LIST ===== */}
      {view === "templates" && (
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t.id} className="card-static group hover:shadow-md transition-all">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gold/8 flex items-center justify-center flex-shrink-0">
                    <LayoutTemplate className="w-5 h-5 text-gold" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-text-primary truncate">{t.name}</h4>
                      {t.isDefault && <span className="badge-gold text-2xs">ברירת מחדל</span>}
                      {!t.isActive && <span className="badge-gray text-2xs">לא פעיל</span>}
                    </div>
                    {t.description && <p className="text-xs text-text-muted truncate">{t.description}</p>}
                    <p className="text-2xs text-text-faint mt-0.5">
                      {(t.fields || []).length} שדות · {(t.contentBlocks || []).filter((b: ContentBlock) => b.type === "file").length} עמודים
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => { setEditingTemplate(t); setView("template-edit"); }}
                    className="p-2 rounded-lg text-text-faint hover:text-gold hover:bg-gold/5 transition-colors"
                    title="ערוך תבנית"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTemplateId(t.id);
                      setEditingQuote(null);
                      setView("quote-create");
                    }}
                    className="p-2 rounded-lg text-text-faint hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="צור הצעה מתבנית"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteTemplate(t.id)}
                    className="p-2 rounded-lg text-text-faint hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="מחק תבנית"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {templates.length === 0 && (
            <div className="empty-state">
              <LayoutTemplate className="empty-state-icon" />
              <p className="font-medium text-text-secondary">אין תבניות הצעת מחיר</p>
              <p className="text-sm mt-1 mb-4">{g(gdr, "צור", "צרי")} תבנית עם שדות למילוי על גבי מסמך ההצעה</p>
              <button
                onClick={() => { setEditingTemplate(null); setView("template-edit"); }}
                className="btn-gold"
              >
                <Plus className="w-4 h-4 inline ml-1" /> {g(gdr, "צור", "צרי")} תבנית ראשונה
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
