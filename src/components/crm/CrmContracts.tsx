"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  FileText, Plus, X, Send, CheckCircle2, Clock, XCircle,
  Download, Pen, Eye, Trash2, Edit3, Copy, Link2, Mail,
  Type, AlignRight, Hash, Calendar, DollarSign, Phone,
  User, Layers, ChevronDown, ChevronUp, Settings2,
  FileSignature, LayoutTemplate, GripVertical, Sparkles,
  Upload, FileImage, File, Move, Maximize2, MapPin,
  Home, ZoomIn, ZoomOut, MousePointer
} from "lucide-react";
import { g } from "@/lib/gender";
import ContractAnnexEditor from "./ContractAnnexEditor";
import ContractAnnexView from "./ContractAnnexView";
import PdfCanvasViewer from "./PdfCanvasViewer";
import { ContractAnnex, emptyAnnex, readAnnex, writeAnnex, annexHasContent } from "@/lib/contract-annex";

// ==========================
// TYPES
// ==========================

type FieldType = "text" | "number" | "date" | "email" | "phone" | "textarea" | "signature"
  | "client_name" | "client_email" | "client_phone" | "client_address";
type FieldOwner = "designer" | "client";

// Fields that auto-fill from CrmClient
const CLIENT_AUTO_FIELDS: FieldType[] = ["client_name", "client_email", "client_phone", "client_address"];

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
  /**
   * Number of pages the uploaded PDF contains. Used to size the iframe so the
   * designer can scroll through all pages and position fields on any page.
   * Defaults to 1 for backwards compatibility.
   */
  pageCount?: number;
}

// Approximate rendered height of a single A4 page in a browser iframe at 100%
// zoom. Works well for portrait PDFs and matches the existing ~700px feel.
const PDF_PAGE_HEIGHT = 1100;

interface ContractTemplate {
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

interface Contract {
  id: string;
  projectId: string;
  templateId: string | null;
  title: string;
  contractNumber: string | null;
  totalAmount: number;
  status: "DRAFT" | "SENT_FOR_SIGNATURE" | "SIGNED" | "CANCELLED";
  designerFieldValues: Record<string, string>;
  clientFieldValues: Record<string, string>;
  clientSignedAt: string | null;
  designerSignedAt: string | null;
  clientSignatureData: string | null;
  designerSignatureData: string | null;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  signToken: string;
  sentToClientAt: string | null;
  clientViewedAt: string | null;
  notesInternal: string | null;
  createdAt: string;
  project?: { id: string; name: string; client?: ProjectClient };
  template?: { id: string; name: string } | null;
}

type ProjectClient = { id: string; name: string; email: string | null; phone: string | null; address?: string | null };
type Project = { id: string; name: string; clientId: string; client?: ProjectClient };

type ViewMode = "contracts" | "templates" | "template-edit" | "contract-fill" | "contract-preview";

const statusConfig: Record<Contract["status"], { label: string; color: string; icon: typeof Clock }> = {
  DRAFT: { label: "טיוטה", color: "badge-gray", icon: Edit3 },
  SENT_FOR_SIGNATURE: { label: "ממתין לחתימה", color: "badge-yellow", icon: Clock },
  SIGNED: { label: "חתום", color: "badge-green", icon: CheckCircle2 },
  CANCELLED: { label: "בוטל", color: "badge-red", icon: XCircle },
};

const fieldTypeIcons: Record<FieldType, typeof Type> = {
  text: Type, number: Hash, date: Calendar, email: Mail,
  phone: Phone, textarea: AlignRight, signature: Pen,
  client_name: User, client_email: Mail, client_phone: Phone, client_address: Home,
};

const fieldTypeLabels: Record<FieldType, string> = {
  text: "טקסט", number: "מספר", date: "תאריך", email: "אימייל",
  phone: "טלפון", textarea: "טקסט ארוך", signature: "חתימה",
  client_name: "שם לקוח", client_email: "אימייל לקוח",
  client_phone: "טלפון לקוח", client_address: "כתובת לקוח",
};

// Field type groups for the toolbar
const FIELD_GROUPS = [
  {
    label: "שדות לקוח (מילוי אוטומטי)",
    fields: [
      { type: "client_name" as FieldType, label: "שם לקוח", owner: "client" as FieldOwner },
      { type: "client_email" as FieldType, label: "אימייל לקוח", owner: "client" as FieldOwner },
      { type: "client_phone" as FieldType, label: "טלפון לקוח", owner: "client" as FieldOwner },
      { type: "client_address" as FieldType, label: "כתובת לקוח", owner: "client" as FieldOwner },
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
  {
    label: "חתימות",
    fields: [
      { type: "signature" as FieldType, label: "חתימת מעצבת", owner: "designer" as FieldOwner },
      { type: "signature" as FieldType, label: "חתימת לקוח", owner: "client" as FieldOwner },
    ],
  },
];

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

// ==========================
// SIGNATURE CANVAS COMPONENT
// ==========================

function SignatureCanvas({
  onSign,
  onCancel,
  title = "חתימה דיגיטלית",
}: {
  onSign: (data: string) => void;
  onCancel: () => void;
  title?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    setHasDrawn(true);
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const drawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDraw = () => setIsDrawing(false);

  const clear = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setHasDrawn(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content max-w-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-heading font-bold text-text-primary">{title}</h3>
            <p className="text-xs text-text-muted mt-0.5">חתמ/י עם העכבר או האצבע</p>
          </div>
          <button onClick={onCancel} className="p-2 rounded-lg hover:bg-bg-surface transition-colors">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        <div className="border-2 border-dashed border-border-subtle rounded-xl overflow-hidden bg-white">
          <canvas
            ref={canvasRef}
            width={540}
            height={280}
            className="w-full cursor-crosshair touch-none"
            onMouseDown={startDraw}
            onMouseMove={drawing}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={drawing}
            onTouchEnd={stopDraw}
          />
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={clear} className="btn-ghost flex-1">
            נקה
          </button>
          <button onClick={onCancel} className="btn-ghost flex-1">
            ביטול
          </button>
          <button
            onClick={() => {
              if (canvasRef.current && hasDrawn) {
                onSign(canvasRef.current.toDataURL("image/png"));
              }
            }}
            disabled={!hasDrawn}
            className="btn-gold flex-1 flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Pen className="w-4 h-4" /> חתום
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================
// UNIFIED TEMPLATE EDITOR
// ==========================

function TemplateEditor({
  template,
  onSave,
  onCancel,
  gender,
}: {
  template: ContractTemplate | null;
  onSave: (data: Partial<ContractTemplate>) => void;
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
    // Remove fields placed on this block
    setFields(prev => prev.map(f =>
      f.position?.blockId === id ? { ...f, position: undefined } : f
    ));
  };

  const setBlockPageCount = (id: string, nextCount: number) => {
    const clamped = Math.max(1, Math.min(20, Math.round(nextCount)));
    setBlocks(prev => prev.map(b =>
      b.id === id ? { ...b, pageCount: clamped } : b
    ));
  };

  // Add field to document
  const addFieldToDocument = (type: FieldType, owner: FieldOwner, label: string) => {
    const targetBlock = fileBlocks[0];
    if (!targetBlock) return;

    const isSignature = type === "signature";
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
        w: isSignature ? 35 : 28,
        h: isSignature ? 12 : 5,
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

  // Field color helpers
  const getFieldColors = (f: TemplateField) => {
    if (f.type === "signature") return "border-purple-500 bg-purple-500/15 text-purple-700";
    if (CLIENT_AUTO_FIELDS.includes(f.type)) return "border-emerald-500 bg-emerald-500/15 text-emerald-700";
    if (f.owner === "designer") return "border-amber-500 bg-amber-500/15 text-amber-700";
    return "border-blue-500 bg-blue-500/15 text-blue-700";
  };

  const getFieldDotColor = (f: TemplateField) => {
    if (f.type === "signature") return "bg-purple-500";
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
          {template ? "עריכת תבנית" : "תבנית חוזה חדשה"}
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
            <input value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="חוזה עיצוב פנים" />
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
                  <p className="text-base font-semibold text-text-primary">העלאת קובץ חוזה</p>
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

              {/* Pages — each file block is zoomed individually. Images scale
                   via `transform: scale()`; PDFs don't, because they render as a
                   stack of canvas images (from PdfCanvasViewer) that already
                   display at their natural height — we want native page scroll
                   to carry the user through all PDF pages, not a nested scroll
                   container that traps the wheel on page 1. */}
              <div className="space-y-6">
                {fileBlocks.map((block, pageIdx) => {
                  const fieldsOnBlock = fields.filter(f => f.position?.blockId === block.id);
                  const pageCount = Math.max(1, block.pageCount ?? 1);
                  const isPdf = block.fileType === "pdf";
                  return (
                    <div key={block.id} className="relative">
                      {/* Page header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {block.fileType === "pdf" ? <File className="w-4 h-4 text-red-500" /> : <FileImage className="w-4 h-4 text-blue-500" />}
                          <span className="text-sm font-medium text-text-primary">קובץ {pageIdx + 1}</span>
                          <span className="text-2xs text-text-faint">({fieldsOnBlock.length} שדות)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isPdf && (
                            <div
                              className="flex items-center gap-1 bg-bg-surface-2/70 border border-border-subtle rounded-lg px-1.5 py-0.5"
                              title="מספר עמודים ב-PDF. אם החוזה שלך נמשך על כמה עמודים – הגדל את המספר כדי שתוכלי לגלול ולמקם שדות על כל עמוד."
                            >
                              <button
                                type="button"
                                onClick={() => setBlockPageCount(block.id, pageCount - 1)}
                                disabled={pageCount <= 1}
                                className="w-5 h-5 flex items-center justify-center rounded hover:bg-white text-text-muted disabled:opacity-30 disabled:cursor-not-allowed"
                                aria-label="פחות עמודים"
                              >
                                −
                              </button>
                              <span className="text-2xs text-text-muted min-w-[40px] text-center font-mono">
                                {pageCount} עמ׳
                              </span>
                              <button
                                type="button"
                                onClick={() => setBlockPageCount(block.id, pageCount + 1)}
                                disabled={pageCount >= 20}
                                className="w-5 h-5 flex items-center justify-center rounded hover:bg-white text-text-muted disabled:opacity-30 disabled:cursor-not-allowed"
                                aria-label="עוד עמודים"
                              >
                                +
                              </button>
                            </div>
                          )}
                          <button onClick={() => removeBlock(block.id)} className="p-1 rounded hover:bg-red-50 text-text-faint hover:text-red-500 transition-colors" title="הסר קובץ">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Document with fields overlay */}
                      <div
                        ref={el => { containerRefs.current[block.id] = el; }}
                        className="relative border-2 border-border-subtle rounded-xl overflow-hidden bg-white select-none shadow-sm"
                        style={{
                          minHeight: 500,
                          // Scale only image blocks — PDFs use Chrome's built-in
                          // viewer zoom and adding transform here breaks hit-testing
                          // (the PDF toolbar + page nav stop responding).
                          ...(isPdf ? {} : { transform: `scale(${zoom / 100})`, transformOrigin: "top center" }),
                        }}
                        onClick={() => setSelectedFieldId(null)}
                      >
                        {block.fileType === "image" && block.fileUrl && (
                          <img src={block.fileUrl} alt={block.fileName} className="w-full pointer-events-none" draggable={false} />
                        )}
                        {block.fileType === "pdf" && block.fileUrl && (
                          // Render PDFs as a stack of canvas images via pdf.js.
                          // This avoids all the iframe-PDF-viewer headaches
                          // (scroll blocked by pointer-events, toolbar not
                          // responding under transform, etc.) and lets us place
                          // field overlays cleanly on top.
                          <PdfCanvasViewer
                            url={block.fileUrl}
                            onPageCount={(n) => {
                              if (n !== block.pageCount) setBlockPageCount(block.id, n);
                            }}
                          />
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
                                minHeight: field.type === "signature" ? 50 : 28,
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

        {/* RIGHT: Tool Panel — sticky so it stays visible while the user scrolls
             through a long multi-page PDF. Previously the document area had its
             own `overflow-auto max-h-[75vh]` to keep this panel visible; that
             trapped the scroll wheel on page 1 and prevented reaching page 2. */}
        <div className="w-72 flex-shrink-0 space-y-4 sticky top-4 self-start max-h-[calc(100vh-2rem)] overflow-auto">
          {/* Field palette */}
          <div className="card-static space-y-4">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <MousePointer className="w-4 h-4 text-gold" />
              הוסף שדה למסמך
            </h3>

            {fileBlocks.length === 0 ? (
              <p className="text-xs text-text-faint text-center py-4">
                {g(gdr, "העלה", "העלי")} קובץ חוזה כדי להתחיל להוסיף שדות
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

              {/* Type (read-only for auto fields and signatures) */}
              <div>
                <label className="form-label text-xs">סוג</label>
                {CLIENT_AUTO_FIELDS.includes(selectedField.type) || selectedField.type === "signature" ? (
                  <div className="input-field text-sm bg-bg-surface/50 flex items-center gap-2">
                    {(() => { const Icon = fieldTypeIcons[selectedField.type]; return <Icon className="w-4 h-4 text-text-muted" />; })()}
                    {fieldTypeLabels[selectedField.type]}
                    {CLIENT_AUTO_FIELDS.includes(selectedField.type) && (
                      <span className="text-2xs text-emerald-600 mr-auto">מילוי אוטומטי</span>
                    )}
                  </div>
                ) : (
                  <select
                    value={selectedField.type}
                    onChange={e => updateField(selectedField.id, { type: e.target.value as FieldType })}
                    className="select-field text-sm"
                  >
                    {(["text", "number", "date", "email", "phone", "textarea"] as FieldType[]).map(t => (
                      <option key={t} value={t}>{fieldTypeLabels[t]}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Owner */}
              {!CLIENT_AUTO_FIELDS.includes(selectedField.type) && selectedField.type !== "signature" && (
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
              {selectedField.type !== "signature" && (
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
              )}

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
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded border-2 border-purple-500 bg-purple-500/15" /> חתימה</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================
// CONTRACT PREVIEW COMPONENT
// ==========================

function ContractPreview({
  contract,
  template,
  onClose,
  onSign,
  isDesigner = true,
  gender,
}: {
  contract: Contract;
  template: ContractTemplate | null;
  onClose: () => void;
  onSign?: () => void;
  isDesigner?: boolean;
  gender?: string;
}) {
  const gdr = gender || "female";
  const designerValues = contract.designerFieldValues || {};
  const clientValues = contract.clientFieldValues || {};
  const allFields = template?.fields || [];
  const annex = readAnnex(designerValues);

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading font-bold text-text-primary flex items-center gap-2">
          <Eye className="w-5 h-5 text-gold" />
          תצוגה מקדימה — {contract.title}
        </h2>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost">חזרה</button>
          {onSign && contract.status !== "SIGNED" && contract.status !== "CANCELLED" && (
            <button onClick={onSign} className="btn-gold flex items-center gap-2">
              <Pen className="w-4 h-4" /> חתום
            </button>
          )}
        </div>
      </div>

      <div className="card-static max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center pb-6 border-b border-border-subtle mb-6">
          <h1 className="text-2xl font-heading font-bold text-text-primary">{contract.title}</h1>
          {contract.contractNumber && (
            <p className="text-sm text-text-muted mt-1">מספר חוזה: {contract.contractNumber}</p>
          )}
          <p className="text-xs text-text-faint mt-1">
            תאריך: {new Date(contract.createdAt).toLocaleDateString("he-IL")}
          </p>
        </div>

        {/* Content blocks */}
        {template?.contentBlocks.map((block) => (
          <div key={block.id} className="mb-4">
            {block.type === "heading" && (
              <h2 className="text-lg font-heading font-bold text-text-primary mb-2">{block.content}</h2>
            )}
            {block.type === "paragraph" && (
              <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-wrap">{block.content}</p>
            )}
            {block.type === "divider" && <div className="gold-separator my-4" />}
            {block.type === "spacer" && <div className="h-6" />}
            {block.type === "file" && block.fileUrl && (
              <div className="relative rounded-xl border border-border-subtle overflow-hidden bg-white">
                {block.fileType === "image" && (
                  <img src={block.fileUrl} alt={block.fileName} className="w-full" draggable={false} />
                )}
                {block.fileType === "pdf" && (
                  <PdfCanvasViewer url={block.fileUrl} />
                )}
                {allFields.filter(f => f.position?.blockId === block.id).map(field => {
                  const pos = field.position!;
                  const value = field.owner === "designer" ? designerValues[field.id] : clientValues[field.id];
                  const borderColor = field.type === "signature" ? "border-purple-400"
                    : CLIENT_AUTO_FIELDS.includes(field.type) ? "border-emerald-400"
                    : field.owner === "designer" ? "border-amber-400" : "border-blue-400";
                  const bgColor = field.type === "signature" ? "bg-purple-50/80"
                    : CLIENT_AUTO_FIELDS.includes(field.type) ? "bg-emerald-50/80"
                    : field.owner === "designer" ? "bg-amber-50/80" : "bg-blue-50/80";
                  return (
                    <div
                      key={field.id}
                      className={`absolute border rounded-md px-1.5 flex items-center ${borderColor} ${bgColor}`}
                      style={{ left: `${pos.x}%`, top: `${pos.y}%`, width: `${pos.w}%`, height: `${pos.h}%`, minHeight: field.type === "signature" ? 50 : 24 }}
                    >
                      {field.type === "signature" ? (
                        value ? <img src={value} alt="חתימה" className="h-full mx-auto object-contain" /> : <span className="text-xs text-text-faint italic">חתימה</span>
                      ) : (
                        <span className="text-xs truncate">{value || <span className="text-text-faint italic">{field.label}</span>}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {/* Non-positioned filled fields */}
        {allFields.filter(f => f.type !== "signature" && !f.position).length > 0 && (
          <div className="mt-8 pt-6 border-t border-border-subtle">
            <h3 className="text-sm font-semibold text-text-primary mb-4">פרטי החוזה</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {allFields.filter(f => f.type !== "signature" && !f.position).map(field => {
                const value = field.owner === "designer" ? designerValues[field.id] : clientValues[field.id];
                return (
                  <div key={field.id} className={field.width === "half" ? "" : "sm:col-span-2"}>
                    <p className="text-xs text-text-muted mb-0.5">{field.label}</p>
                    <p className="text-sm text-text-primary font-medium">
                      {value || <span className="text-text-faint italic">לא מולא</span>}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Amount */}
        {contract.totalAmount > 0 && (
          <div className="mt-6 pt-4 border-t border-border-subtle">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-text-secondary">סכום כולל</span>
              <span className="text-xl font-bold text-text-primary">₪{contract.totalAmount.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Annex — renders when enabled + has any content */}
        {annex && annexHasContent(annex) && (
          <ContractAnnexView annex={annex} />
        )}

        {/* Signatures */}
        <div className="mt-8 pt-6 border-t border-border-subtle">
          <div className="grid grid-cols-2 gap-8">
            <div className="text-center">
              <p className="text-xs text-text-muted mb-3">{g(gdr, "חתימת מעצב", "חתימת מעצבת")}</p>
              {contract.designerSignatureData ? (
                <div className="border border-border-subtle rounded-lg p-3 bg-bg-surface">
                  <img src={contract.designerSignatureData} alt={g(gdr, "חתימת מעצב", "חתימת מעצבת")} className="h-20 mx-auto" />
                  <p className="text-2xs text-emerald-600 mt-1 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {contract.designerSignedAt && new Date(contract.designerSignedAt).toLocaleDateString("he-IL")}
                  </p>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border-subtle rounded-lg h-24 flex items-center justify-center text-text-faint text-xs">
                  ממתין לחתימה
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="text-xs text-text-muted mb-3">חתימת לקוח</p>
              {contract.clientSignatureData ? (
                <div className="border border-border-subtle rounded-lg p-3 bg-bg-surface">
                  <img src={contract.clientSignatureData} alt="חתימת לקוח" className="h-20 mx-auto" />
                  <p className="text-2xs text-emerald-600 mt-1 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {contract.clientSignedAt && new Date(contract.clientSignedAt).toLocaleDateString("he-IL")}
                  </p>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border-subtle rounded-lg h-24 flex items-center justify-center text-text-faint text-xs">
                  ממתין לחתימה
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================
// SEND CONTRACT MODAL
// ==========================

function SendContractModal({
  template,
  projects,
  onSend,
  onClose,
  gender,
}: {
  template: ContractTemplate;
  projects: Project[];
  onSend: (data: Record<string, unknown>) => void;
  onClose: () => void;
  gender?: string;
}) {
  const gdr = gender || "female";
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState(template.name);
  const [amount, setAmount] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [designerValues, setDesignerValues] = useState<Record<string, string>>({});
  const [autoPopulated, setAutoPopulated] = useState(false);

  const selectedProject = projects.find(p => p.id === projectId);
  const designerFields = template.fields.filter(f => f.owner === "designer" && f.type !== "signature");

  const handleProjectChange = (newProjectId: string) => {
    setProjectId(newProjectId);
    const project = projects.find(p => p.id === newProjectId);
    if (project?.client) {
      const c = project.client;
      setClientName(c.name || "");
      setClientEmail(c.email || "");
      setClientPhone(c.phone || "");
      if (c.address) setClientAddress(c.address);
      setAutoPopulated(true);

      // Auto-populate client_* fields in designerValues
      const autoValues: Record<string, string> = {};
      template.fields.forEach(f => {
        if (f.type === "client_name" && c.name) autoValues[f.id] = c.name;
        if (f.type === "client_email" && c.email) autoValues[f.id] = c.email;
        if (f.type === "client_phone" && c.phone) autoValues[f.id] = c.phone;
        if (f.type === "client_address" && c.address) autoValues[f.id] = c.address;
      });
      setDesignerValues(prev => ({ ...prev, ...autoValues }));
    }
  };

  const handleSend = () => {
    if (!projectId || !title.trim()) return;
    if (!selectedProject?.client) {
      alert("לא ניתן ליצור חוזה ללא לקוח שמור במערכת.");
      return;
    }

    // Build client field values from auto fields
    const clientFieldValues: Record<string, string> = {};
    template.fields.forEach(f => {
      if (CLIENT_AUTO_FIELDS.includes(f.type)) {
        const val = f.type === "client_name" ? clientName
          : f.type === "client_email" ? clientEmail
          : f.type === "client_phone" ? clientPhone
          : f.type === "client_address" ? clientAddress : "";
        if (val) clientFieldValues[f.id] = val;
      }
    });

    onSend({
      templateId: template.id,
      projectId,
      title: title.trim(),
      totalAmount: parseFloat(amount) || 0,
      clientName: clientName.trim() || null,
      clientEmail: clientEmail.trim() || null,
      clientPhone: clientPhone.trim() || null,
      designerFieldValues: designerValues,
      clientFieldValues,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-xl max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-heading font-bold text-text-primary flex items-center gap-2">
            <Send className="w-5 h-5 text-gold" />
            שלח חוזה ללקוח
          </h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-bg-surface">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Project selection */}
          <div>
            <label className="form-label">פרויקט *</label>
            <select value={projectId} onChange={e => handleProjectChange(e.target.value)} className="select-field">
              <option value="">— {g(gdr, "בחר", "בחרי")} פרויקט —</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.client ? `(${p.client.name})` : ""}
                </option>
              ))}
            </select>
            {projectId && !selectedProject?.client && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                פרויקט זה ללא לקוח שמור — יש להוסיף לקוח לפרויקט
              </p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="form-label">כותרת החוזה</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="input-field" />
          </div>

          {/* Amount */}
          <div>
            <label className="form-label">סכום (₪)</label>
            <input value={amount} onChange={e => setAmount(e.target.value)} type="number" className="input-field" placeholder="0" dir="ltr" />
          </div>

          {/* Client info */}
          {selectedProject?.client && (
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  פרטי לקוח
                </h4>
                {autoPopulated && (
                  <span className="text-xs text-emerald-600 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    מולא אוטומטית
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label text-xs">שם</label>
                  <input value={clientName} onChange={e => setClientName(e.target.value)} className="input-field text-sm" />
                </div>
                <div>
                  <label className="form-label text-xs">אימייל</label>
                  <input value={clientEmail} onChange={e => setClientEmail(e.target.value)} type="email" className="input-field text-sm" dir="ltr" />
                </div>
                <div>
                  <label className="form-label text-xs">טלפון</label>
                  <input value={clientPhone} onChange={e => setClientPhone(e.target.value)} type="tel" className="input-field text-sm" dir="ltr" />
                </div>
                <div>
                  <label className="form-label text-xs">כתובת</label>
                  <input value={clientAddress} onChange={e => setClientAddress(e.target.value)} className="input-field text-sm" />
                </div>
              </div>
            </div>
          )}

          {/* Designer fields */}
          {designerFields.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gold" />
                {`שדות למילוי (${g(gdr, "מעצב", "מעצבת")})`}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {designerFields.map(field => (
                  <div key={field.id} className={field.width === "half" ? "" : "col-span-2"}>
                    <label className="form-label text-xs">
                      {field.label} {field.required && <span className="text-red-400">*</span>}
                    </label>
                    <input
                      value={designerValues[field.id] || ""}
                      onChange={e => setDesignerValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                      className="input-field text-sm"
                      placeholder={field.placeholder}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-6 pt-4 border-t border-border-subtle">
          <button onClick={onClose} className="btn-ghost flex-1">ביטול</button>
          <button
            onClick={handleSend}
            disabled={!projectId || !title.trim() || !selectedProject?.client}
            className="btn-gold flex-1 flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
            צור ושלח חוזה
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================
// CONTRACT FILL FORM
// ==========================

function ContractFillForm({
  contract,
  template,
  projects,
  onSave,
  onCancel,
  gender,
}: {
  contract: Contract | null;
  template: ContractTemplate | null;
  projects: Project[];
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  gender?: string;
}) {
  const gdr = gender || "female";
  const [title, setTitle] = useState(contract?.title || (template?.name || ""));
  const [projectId, setProjectId] = useState(contract?.projectId || "");
  const [amount, setAmount] = useState(contract?.totalAmount?.toString() || "");
  const [notes, setNotes] = useState(contract?.notesInternal || "");
  const [clientName, setClientName] = useState(contract?.clientName || "");
  const [clientEmail, setClientEmail] = useState(contract?.clientEmail || "");
  const [clientPhone, setClientPhone] = useState(contract?.clientPhone || "");
  const [autoPopulated, setAutoPopulated] = useState(false);
  const [designerValues, setDesignerValues] = useState<Record<string, string>>(
    (contract?.designerFieldValues as Record<string, string>) || {}
  );
  const [annex, setAnnex] = useState<ContractAnnex>(
    () => readAnnex(contract?.designerFieldValues as Record<string, string> | undefined) || emptyAnnex()
  );

  const designerFields = (template?.fields || []).filter(f => f.owner === "designer" && f.type !== "signature" && !CLIENT_AUTO_FIELDS.includes(f.type));
  const selectedProject = projects.find(p => p.id === projectId);

  const handleProjectChange = (newProjectId: string) => {
    setProjectId(newProjectId);
    const project = projects.find(p => p.id === newProjectId);
    if (project?.client) {
      const c = project.client;
      setClientName(c.name || "");
      setClientEmail(c.email || "");
      setClientPhone(c.phone || "");
      setAutoPopulated(true);

      // Auto-populate client_* template fields
      const autoValues: Record<string, string> = {};
      (template?.fields || []).forEach(f => {
        if (f.type === "client_name" && c.name) autoValues[f.id] = c.name;
        if (f.type === "client_email" && c.email) autoValues[f.id] = c.email;
        if (f.type === "client_phone" && c.phone) autoValues[f.id] = c.phone;
        if (f.type === "client_address" && c.address) autoValues[f.id] = c.address;
      });
      setDesignerValues(prev => ({ ...prev, ...autoValues }));
    }
  };

  useEffect(() => {
    if (projectId && !contract && !autoPopulated) {
      const project = projects.find(p => p.id === projectId);
      if (project?.client) {
        handleProjectChange(projectId);
      }
    }
  }, [projectId, projects]);

  const handleSave = () => {
    if (!projectId || !title.trim()) return;
    if (!selectedProject?.client) {
      alert("לא ניתן ליצור חוזה ללא לקוח שמור במערכת. יש להוסיף לקוח לפרויקט תחילה.");
      return;
    }
    onSave({
      templateId: template?.id || null,
      projectId,
      title: title.trim(),
      totalAmount: parseFloat(amount) || 0,
      notesInternal: notes.trim() || null,
      clientName: clientName.trim() || null,
      clientEmail: clientEmail.trim() || null,
      clientPhone: clientPhone.trim() || null,
      designerFieldValues: writeAnnex(designerValues, annex),
    });
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading font-bold text-text-primary flex items-center gap-2">
          <FileSignature className="w-5 h-5 text-gold" />
          {contract ? "עריכת חוזה" : "חוזה חדש"}
        </h2>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-ghost">ביטול</button>
          <button onClick={handleSave} disabled={!projectId || !title.trim()} className="btn-gold disabled:opacity-40">
            <CheckCircle2 className="w-4 h-4 inline ml-1" />
            {contract ? "עדכן" : "צור חוזה"}
          </button>
        </div>
      </div>

      {/* Basic info */}
      <div className="card-static space-y-4">
        <h3 className="text-sm font-semibold text-text-primary">פרטי חוזה</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">כותרת *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="input-field" placeholder="שם החוזה" />
          </div>
          <div>
            <label className="form-label">פרויקט *</label>
            <select value={projectId} onChange={e => handleProjectChange(e.target.value)} className="select-field">
              <option value="">— {g(gdr, "בחר", "בחרי")} פרויקט —</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.client ? `(${p.client.name})` : ""}
                </option>
              ))}
            </select>
            {projectId && !selectedProject?.client && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                פרויקט זה ללא לקוח שמור — יש להוסיף לקוח לפרויקט
              </p>
            )}
          </div>
          <div>
            <label className="form-label">סכום כולל (₪)</label>
            <input value={amount} onChange={e => setAmount(e.target.value)} type="number" className="input-field" placeholder="0" dir="ltr" />
          </div>
          <div>
            <label className="form-label">הערות פנימיות</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} className="input-field" placeholder="לשימוש פנימי בלבד" />
          </div>
        </div>
      </div>

      {/* Client info */}
      <div className="card-static space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <User className="w-4 h-4 text-blue-500" />
            פרטי הלקוח (לשליחת החוזה)
          </h3>
          {autoPopulated && selectedProject?.client && (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              מולא אוטומטית מהלקוח השמור
            </span>
          )}
        </div>
        {!selectedProject?.client && projectId && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
            לא נמצא לקוח שמור לפרויקט זה. כדי לשלוח חוזה, יש להוסיף לקוח לפרויקט תחילה דרך ניהול לקוחות.
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="form-label">שם הלקוח *</label>
            <input value={clientName} onChange={e => setClientName(e.target.value)} className="input-field" placeholder="שם מלא" />
          </div>
          <div>
            <label className="form-label">אימייל הלקוח</label>
            <input value={clientEmail} onChange={e => setClientEmail(e.target.value)} type="email" className="input-field" placeholder="email@example.com" dir="ltr" />
          </div>
          <div>
            <label className="form-label">טלפון הלקוח</label>
            <input value={clientPhone} onChange={e => setClientPhone(e.target.value)} type="tel" className="input-field" placeholder="050-0000000" dir="ltr" />
          </div>
        </div>
      </div>

      {/* Contract annex (per-client addendum) */}
      <ContractAnnexEditor
        value={annex}
        onChange={setAnnex}
        projectAddress={selectedProject?.client?.address ?? null}
        clientName={clientName || selectedProject?.client?.name || null}
      />

      {/* Designer fields */}
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
                    type={field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "email" ? "email" : "text"}
                    value={designerValues[field.id] || ""}
                    onChange={e => setDesignerValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                    className="input-field"
                    placeholder={field.placeholder}
                    dir={field.type === "email" || field.type === "phone" || field.type === "number" ? "ltr" : undefined}
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

export default function CrmContracts({ clientId, projectId, gender }: { clientId?: string; projectId?: string; gender?: string } = {}) {
  const gdr = gender || "female";
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("contracts");
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [previewContract, setPreviewContract] = useState<Contract | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [showSignature, setShowSignature] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [showSendModal, setShowSendModal] = useState<ContractTemplate | null>(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [cRes, tRes, pRes] = await Promise.all([
        fetch("/api/designer/crm/contracts"),
        fetch("/api/designer/crm/contracts/templates"),
        fetch("/api/designer/crm/projects"),
      ]);
      if (cRes.ok) setContracts(await cRes.json());
      if (tRes.ok) setTemplates(await tRes.json());
      if (pRes.ok) setProjects(await pRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  // Template CRUD
  async function saveTemplate(data: Partial<ContractTemplate>) {
    try {
      const isEdit = !!editingTemplate?.id;
      const url = isEdit ? `/api/designer/crm/contracts/templates/${editingTemplate.id}` : "/api/designer/crm/contracts/templates";
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
        // Show send modal after save
        setShowSendModal(saved);
      }
    } catch (e) { console.error(e); }
  }

  async function deleteTemplate(id: string) {
    if (!confirm("למחוק תבנית זו?")) return;
    try {
      const res = await fetch(`/api/designer/crm/contracts/templates/${id}`, { method: "DELETE" });
      if (res.ok) setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (e) { console.error(e); }
  }

  // Contract CRUD
  async function saveContract(data: Record<string, unknown>) {
    try {
      const isEdit = !!editingContract?.id;
      const url = isEdit ? `/api/designer/crm/contracts/${editingContract.id}` : "/api/designer/crm/contracts";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const saved = await res.json();
        if (isEdit) {
          setContracts(prev => prev.map(c => c.id === saved.id ? saved : c));
        } else {
          setContracts(prev => [saved, ...prev]);
        }
        setView("contracts");
        setEditingContract(null);
        setShowSendModal(null);
      }
    } catch (e) { console.error(e); }
  }

  async function sendToClient(id: string) {
    setSendingId(id);
    try {
      const res = await fetch(`/api/designer/crm/contracts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SENT_FOR_SIGNATURE", sendEmail: true }),
      });
      if (res.ok) {
        const updated = await res.json();
        setContracts(prev => prev.map(c => c.id === id ? updated : c));
      }
    } catch (e) { console.error(e); }
    finally { setSendingId(null); }
  }

  async function designerSign(signatureData: string) {
    if (!showSignature) return;
    try {
      const res = await fetch(`/api/designer/crm/contracts/${showSignature}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designerSignatureData: signatureData }),
      });
      if (res.ok) {
        const updated = await res.json();
        setContracts(prev => prev.map(c => c.id === showSignature ? updated : c));
        setShowSignature(null);
      }
    } catch (e) { console.error(e); }
  }

  async function deleteContract(id: string) {
    if (!confirm("למחוק חוזה זה?")) return;
    try {
      const res = await fetch(`/api/designer/crm/contracts/${id}`, { method: "DELETE" });
      if (res.ok) setContracts(prev => prev.filter(c => c.id !== id));
    } catch (e) { console.error(e); }
  }

  function copySignLink(token: string) {
    const url = `${window.location.origin}/contract/sign/${token}`;
    navigator.clipboard.writeText(url);
  }

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
      <TemplateEditor
        template={editingTemplate}
        onSave={saveTemplate}
        onCancel={() => { setView("templates"); setEditingTemplate(null); }}
        gender={gdr}
      />
    );
  }

  // Contract Fill mode
  if (view === "contract-fill") {
    const selectedTemplate = templates.find(t => t.id === selectedTemplateId) || null;
    return (
      <ContractFillForm
        contract={editingContract}
        template={selectedTemplate}
        projects={projects}
        onSave={saveContract}
        onCancel={() => { setView("contracts"); setEditingContract(null); }}
        gender={gdr}
      />
    );
  }

  // Contract Preview mode
  if (view === "contract-preview" && previewContract) {
    const template = templates.find(t => t.id === previewContract.templateId) || null;
    return (
      <ContractPreview
        contract={previewContract}
        template={template}
        onClose={() => { setView("contracts"); setPreviewContract(null); }}
        onSign={() => setShowSignature(previewContract.id)}
        gender={gdr}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in" dir="rtl">
      {/* Signature Modal */}
      {showSignature && (
        <SignatureCanvas
          onSign={designerSign}
          onCancel={() => setShowSignature(null)}
          title={g(gdr, "חתימת מעצב", "חתימת מעצבת")}
        />
      )}

      {/* Send Contract Modal */}
      {showSendModal && (
        <SendContractModal
          template={showSendModal}
          projects={projects}
          onSend={saveContract}
          onClose={() => setShowSendModal(null)}
          gender={gdr}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-bg-surface rounded-lg p-1">
          <button
            onClick={() => setView("contracts")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${view === "contracts" ? "bg-white shadow-sm text-text-primary" : "text-text-muted"}`}
          >
            <FileText className="w-4 h-4 inline ml-1" />
            חוזים ({contracts.length})
          </button>
          <button
            onClick={() => setView("templates")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${view === "templates" ? "bg-white shadow-sm text-text-primary" : "text-text-muted"}`}
          >
            <LayoutTemplate className="w-4 h-4 inline ml-1" />
            תבניות ({templates.length})
          </button>
        </div>

        {view === "contracts" ? (
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
              onClick={() => { setEditingContract(null); setView("contract-fill"); }}
              className="btn-gold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> חוזה חדש
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

      {/* ===== CONTRACTS LIST ===== */}
      {view === "contracts" && (
        <div className="space-y-3">
          {contracts.map(c => {
            const status = statusConfig[c.status];
            const StatusIcon = status.icon;
            return (
              <div key={c.id} className="card-static group hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <h4 className="font-medium text-text-primary">{c.title}</h4>
                      <span className={status.color}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                      {c.contractNumber && <span className="badge-gray text-2xs">#{c.contractNumber}</span>}
                    </div>

                    {c.project && <p className="text-xs text-text-muted mb-2">פרויקט: {c.project.name}</p>}

                    <div className="flex items-center gap-4 text-xs text-text-muted flex-wrap">
                      {c.totalAmount > 0 && <span className="font-mono font-semibold">₪{c.totalAmount.toLocaleString()}</span>}
                      <span>{new Date(c.createdAt).toLocaleDateString("he-IL")}</span>
                      {c.clientName && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {c.clientName}</span>}
                      {c.clientPhone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.clientPhone}</span>}
                      {c.clientViewedAt && !c.clientSignedAt && (
                        <span className="text-blue-500 flex items-center gap-1">
                          <Eye className="w-3 h-3" /> לקוח צפה
                        </span>
                      )}
                      {c.status === "SIGNED" && (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> עותק נשלח לשני הצדדים
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Inline Signature Section */}
                {(c.designerSignedAt || c.clientSignedAt || (!c.designerSignedAt && c.status !== "CANCELLED")) && (
                    <div className="mt-3 pt-3 border-t border-border-subtle">
                      <h5 className="text-xs font-semibold text-text-muted mb-2 flex items-center gap-1">
                        <FileSignature className="w-3.5 h-3.5" /> חתימה דיגיטלית
                      </h5>
                      <div className="flex flex-wrap gap-3">
                        {/* Designer signature status */}
                        {c.designerSignedAt ? (
                          <div className="flex items-center gap-2 bg-emerald-50 rounded-lg px-3 py-2">
                            {c.designerSignatureData && (
                              <img src={c.designerSignatureData} alt={g(gdr, "חתימת מעצב", "חתימת מעצבת")} className="h-8 w-auto opacity-80" />
                            )}
                            <div>
                              <span className="text-emerald-700 text-xs font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> {g(gdr, "מעצב חתם", "מעצבת חתמה")}
                              </span>
                              <span className="text-emerald-600/70 text-[10px] block">
                                {new Date(c.designerSignedAt).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>
                        ) : c.status !== "CANCELLED" ? (
                          <button
                            onClick={() => setShowSignature(c.id)}
                            className="flex items-center gap-2 bg-gold/5 border border-gold/20 rounded-lg px-3 py-2 hover:bg-gold/10 transition-colors"
                          >
                            <Pen className="w-4 h-4 text-gold" />
                            <span className="text-gold text-xs font-medium">חתום על החוזה</span>
                          </button>
                        ) : null}
                        {/* Client signature status */}
                        {c.clientSignedAt ? (
                          <div className="flex items-center gap-2 bg-emerald-50 rounded-lg px-3 py-2">
                            {c.clientSignatureData && (
                              <img src={c.clientSignatureData} alt="חתימת לקוח" className="h-8 w-auto opacity-80" />
                            )}
                            <div>
                              <span className="text-emerald-700 text-xs font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> לקוח חתם
                              </span>
                              <span className="text-emerald-600/70 text-[10px] block">
                                {new Date(c.clientSignedAt).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>
                        ) : c.status === "SENT_FOR_SIGNATURE" ? (
                          <div className="flex items-center gap-2 bg-amber-50 rounded-lg px-3 py-2">
                            <Clock className="w-4 h-4 text-amber-500" />
                            <span className="text-amber-700 text-xs font-medium">ממתין לחתימת לקוח</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-1 shrink-0 mt-3">
                    <button
                      onClick={() => { setPreviewContract(c); setView("contract-preview"); }}
                      className="p-2 rounded-lg text-text-faint hover:text-gold hover:bg-gold/5 transition-colors"
                      title="תצוגה מקדימה"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {!c.designerSignedAt && c.status !== "CANCELLED" && (
                      <button
                        onClick={() => setShowSignature(c.id)}
                        className="p-2 rounded-lg text-text-faint hover:text-gold hover:bg-gold/5 transition-colors"
                        title="חתום"
                      >
                        <Pen className="w-4 h-4" />
                      </button>
                    )}

                    {c.status === "DRAFT" && (
                      <button
                        onClick={() => {
                          if (!c.clientEmail) {
                            alert("לא ניתן לשלוח חוזה ללא כתובת אימייל.");
                            return;
                          }
                          if (!c.project?.client) {
                            alert("לא ניתן לשלוח חוזה ללקוח שלא שמור במערכת.");
                            return;
                          }
                          sendToClient(c.id);
                        }}
                        disabled={sendingId === c.id}
                        className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                          c.clientEmail && c.project?.client
                            ? "text-text-faint hover:text-blue-600 hover:bg-blue-50"
                            : "text-text-faint/40 cursor-not-allowed"
                        }`}
                        title={
                          !c.project?.client ? "לקוח לא שמור במערכת"
                            : !c.clientEmail ? "חסר אימייל ללקוח"
                              : "שלח ללקוח"
                        }
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => copySignLink(c.signToken)}
                      className="p-2 rounded-lg text-text-faint hover:text-gold hover:bg-gold/5 transition-colors"
                      title="העתק קישור חתימה"
                    >
                      <Link2 className="w-4 h-4" />
                    </button>

                    {c.status === "SIGNED" && (
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/contract/sign/${c.signToken}`;
                          window.open(url, "_blank");
                        }}
                        className="p-2 rounded-lg text-text-faint hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="צפייה בחוזה החתום"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}

                    {c.status === "DRAFT" && (
                      <button
                        onClick={() => deleteContract(c.id)}
                        className="p-2 rounded-lg text-text-faint hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="מחק"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
              </div>
            );
          })}

          {contracts.length === 0 && (
            <div className="empty-state">
              <FileSignature className="empty-state-icon" />
              <p className="font-medium text-text-secondary">אין חוזים עדיין</p>
              <p className="text-sm mt-1 mb-4">{g(gdr, "צור", "צרי")} תבנית חוזה {g(gdr, "ושלח", "ושלחי")} ללקוחות לחתימה דיגיטלית</p>
              <button
                onClick={() => { setEditingContract(null); setView("contract-fill"); }}
                className="btn-gold"
              >
                <Plus className="w-4 h-4 inline ml-1" /> {g(gdr, "צור", "צרי")} חוזה ראשון
              </button>
            </div>
          )}
        </div>
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
                      {(t.fields || []).length} שדות · {(t.contentBlocks || []).filter(b => b.type === "file").length} עמודים
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
                    onClick={() => setShowSendModal(t)}
                    className="p-2 rounded-lg text-text-faint hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="שלח חוזה מתבנית"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTemplateId(t.id);
                      setEditingContract(null);
                      setView("contract-fill");
                    }}
                    className="p-2 rounded-lg text-text-faint hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="צור חוזה מתבנית"
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
              <p className="font-medium text-text-secondary">אין תבניות חוזה</p>
              <p className="text-sm mt-1 mb-4">{g(gdr, "צור", "צרי")} תבנית עם שדות למילוי על גבי מסמך החוזה</p>
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
