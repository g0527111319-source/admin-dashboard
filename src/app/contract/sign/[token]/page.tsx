"use client";

import { useState, useEffect, useRef, use } from "react";
import { CheckCircle2, FileText, Pen, X, Eye, Clock, AlertCircle, Sparkles } from "lucide-react";

// Client auto-fill field types
const CLIENT_AUTO_FIELDS = ["client_name", "client_email", "client_phone", "client_address"];

interface ContractData {
  id: string;
  title: string;
  contractNumber: string | null;
  totalAmount: number;
  status: string;
  clientName: string | null;
  clientEmail: string | null;
  designerFieldValues: Record<string, string>;
  clientFieldValues: Record<string, string>;
  designerSignatureData: string | null;
  designerSignedAt: string | null;
  clientSignatureData: string | null;
  clientSignedAt: string | null;
  clientViewedAt: string | null;
  createdAt: string;
  template?: {
    name: string;
    contentBlocks: { id: string; type: string; content: string; fileUrl?: string; fileName?: string; fileType?: string }[];
    fields: { id: string; label: string; type: string; owner: string; required: boolean; placeholder?: string; width?: string; position?: { x: number; y: number; w: number; h: number; blockId: string } }[];
  } | null;
  designer?: { fullName: string; companyName?: string };
}

export default function ClientSignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [clientValues, setClientValues] = useState<Record<string, string>>({});
  const [showSignature, setShowSignature] = useState(false);
  const [signed, setSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchContract();
  }, [token]);

  async function fetchContract() {
    try {
      const res = await fetch(`/api/contract/sign/${token}`);
      if (!res.ok) {
        setError(res.status === 404 ? "החוזה לא נמצא" : "שגיאה בטעינת החוזה");
        return;
      }
      const data = await res.json();
      setContract(data);
      setClientValues(data.clientFieldValues || {});
      if (data.clientSignedAt) setSigned(true);
    } catch {
      setError("שגיאה בטעינת החוזה");
    } finally {
      setLoading(false);
    }
  }

  async function submitSignature(signatureData: string) {
    if (!contract) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/contract/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientSignatureData: signatureData,
          clientFieldValues: clientValues,
        }),
      });
      if (res.ok) {
        setSigned(true);
        setShowSignature(false);
        fetchContract();
      }
    } catch {
      alert("שגיאה בחתימה, נסה שוב");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="card-static text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-heading font-bold text-text-primary">{error || "חוזה לא נמצא"}</h2>
          <p className="text-sm text-text-muted mt-2">ודא שהקישור תקין או פנה למעצבת</p>
        </div>
      </div>
    );
  }

  const clientFields = (contract.template?.fields || []).filter(f => f.owner === "client" && f.type !== "signature" && !CLIENT_AUTO_FIELDS.includes(f.type));
  const autoFilledFields = (contract.template?.fields || []).filter(f => CLIENT_AUTO_FIELDS.includes(f.type));
  const allFieldValues = { ...contract.designerFieldValues, ...clientValues };

  return (
    <div className="min-h-screen bg-bg" dir="rtl">
      {/* Signature Modal */}
      {showSignature && (
        <ClientSignatureModal
          onSign={submitSignature}
          onCancel={() => setShowSignature(false)}
          submitting={submitting}
        />
      )}

      {/* Header bar */}
      <header className="bg-white border-b border-border-subtle shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-heading font-bold text-text-primary">{contract.title}</h1>
            {contract.contractNumber && (
              <p className="text-xs text-text-muted">מספר: {contract.contractNumber}</p>
            )}
          </div>
          {signed ? (
            <span className="badge-green text-sm px-4 py-1.5">
              <CheckCircle2 className="w-4 h-4" /> חתום
            </span>
          ) : (
            <span className="badge-yellow text-sm px-4 py-1.5">
              <Clock className="w-4 h-4" /> ממתין לחתימה
            </span>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Success message */}
        {signed && (
          <div className="card-static border-emerald-200 bg-emerald-50 mb-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h2 className="text-lg font-heading font-bold text-emerald-800">החוזה נחתם בהצלחה!</h2>
            <p className="text-sm text-emerald-600 mt-1">עותק נשלח אליך ולמעצבת באימייל</p>
          </div>
        )}

        {/* Contract content */}
        <div className="card-static">
          {/* Header */}
          <div className="text-center pb-6 border-b border-border-subtle mb-6">
            <h1 className="text-2xl font-heading font-bold text-text-primary">{contract.title}</h1>
            <p className="text-xs text-text-faint mt-1">
              תאריך: {new Date(contract.createdAt).toLocaleDateString("he-IL")}
            </p>
          </div>

          {/* Content blocks */}
          {contract.template?.contentBlocks.map((block) => (
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
                    <iframe src={block.fileUrl} className="w-full h-[600px] pointer-events-none" title={block.fileName} />
                  )}
                  {/* Positioned fields on document */}
                  {(contract.template?.fields || []).filter(f => f.position?.blockId === block.id).map(field => {
                    const pos = field.position!;
                    const value = field.owner === "designer" || CLIENT_AUTO_FIELDS.includes(field.type)
                      ? (allFieldValues[field.id] || contract.designerFieldValues[field.id])
                      : clientValues[field.id];
                    const isClientEditableField = field.owner === "client" && !signed && !CLIENT_AUTO_FIELDS.includes(field.type);
                    const isAutoField = CLIENT_AUTO_FIELDS.includes(field.type);
                    const borderColor = field.type === "signature" ? "border-purple-400"
                      : isAutoField ? "border-emerald-400"
                      : field.owner === "designer" ? "border-amber-400" : "border-blue-400";
                    const bgColor = field.type === "signature" ? "bg-purple-50/80"
                      : isAutoField ? "bg-emerald-50/80"
                      : field.owner === "designer" ? "bg-amber-50/80" : "bg-blue-50/80";

                    return (
                      <div
                        key={field.id}
                        className={`absolute border rounded-md px-1.5 flex items-center ${borderColor} ${bgColor}`}
                        style={{ left: `${pos.x}%`, top: `${pos.y}%`, width: `${pos.w}%`, height: `${pos.h}%`, minHeight: field.type === "signature" ? 50 : 24 }}
                      >
                        {field.type === "signature" ? (
                          value ? <img src={value} alt="חתימה" className="h-full mx-auto object-contain" />
                            : <span className="text-xs text-text-faint italic">חתימה</span>
                        ) : isClientEditableField ? (
                          <input
                            type={field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "email" ? "email" : "text"}
                            value={clientValues[field.id] || ""}
                            onChange={e => setClientValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                            className="w-full h-full bg-transparent border-0 outline-none text-xs"
                            placeholder={field.placeholder || field.label}
                          />
                        ) : (
                          <span className="text-xs truncate flex items-center gap-1">
                            {value || <span className="text-text-faint italic text-2xs">{field.label}</span>}
                            {isAutoField && value && <Sparkles className="w-2.5 h-2.5 text-emerald-500 flex-shrink-0" />}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {/* Auto-filled fields display */}
          {autoFilledFields.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border-subtle">
              <h3 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                פרטים שמולאו אוטומטית
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {autoFilledFields.map(field => (
                  <div key={field.id}>
                    <p className="text-xs text-text-muted">{field.label}</p>
                    <p className="text-sm text-text-primary">{allFieldValues[field.id] || "—"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filled values display */}
          {(contract.template?.fields || []).filter(f => f.owner === "designer" && f.type !== "signature" && !CLIENT_AUTO_FIELDS.includes(f.type) && !f.position).length > 0 && (
            <div className="mt-6 pt-4 border-t border-border-subtle">
              <h3 className="text-sm font-semibold text-text-primary mb-3">פרטי החוזה</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(contract.template?.fields || []).filter(f => f.owner === "designer" && f.type !== "signature" && !CLIENT_AUTO_FIELDS.includes(f.type) && !f.position).map(field => (
                  <div key={field.id}>
                    <p className="text-xs text-text-muted">{field.label}</p>
                    <p className="text-sm text-text-primary">{allFieldValues[field.id] || "—"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Client fill fields (non-positioned, non-auto) */}
          {clientFields.filter(f => !f.position).length > 0 && !signed && (
            <div className="mt-6 pt-4 border-t border-border-subtle">
              <h3 className="text-sm font-semibold text-blue-600 mb-3">שדות למילוי שלך</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {clientFields.filter(f => !f.position).map(field => (
                  <div key={field.id} className={field.width === "half" ? "" : "sm:col-span-2"}>
                    <label className="form-label">
                      {field.label} {field.required && <span className="text-red-400">*</span>}
                    </label>
                    {field.type === "textarea" ? (
                      <textarea
                        value={clientValues[field.id] || ""}
                        onChange={e => setClientValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                        className="input-field min-h-[60px] resize-none"
                        placeholder={field.placeholder}
                      />
                    ) : (
                      <input
                        type={field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "email" ? "email" : "text"}
                        value={clientValues[field.id] || ""}
                        onChange={e => setClientValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                        className="input-field"
                        placeholder={field.placeholder}
                      />
                    )}
                  </div>
                ))}
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

          {/* Signatures */}
          <div className="mt-8 pt-6 border-t border-border-subtle">
            <div className="grid grid-cols-2 gap-8">
              <div className="text-center">
                <p className="text-xs text-text-muted mb-3">חתימת מעצבת</p>
                {contract.designerSignatureData ? (
                  <div className="border border-border-subtle rounded-lg p-3 bg-bg-surface">
                    <img src={contract.designerSignatureData} alt="חתימת מעצבת" className="h-20 mx-auto" />
                    <p className="text-xs text-emerald-600 mt-1 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {contract.designerSignedAt && new Date(contract.designerSignedAt).toLocaleDateString("he-IL")}
                    </p>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-border-subtle rounded-lg h-24 flex items-center justify-center text-text-faint text-xs">
                    ממתין
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className="text-xs text-text-muted mb-3">חתימת לקוח</p>
                {contract.clientSignatureData ? (
                  <div className="border border-border-subtle rounded-lg p-3 bg-bg-surface">
                    <img src={contract.clientSignatureData} alt="חתימת לקוח" className="h-20 mx-auto" />
                    <p className="text-xs text-emerald-600 mt-1 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {contract.clientSignedAt && new Date(contract.clientSignedAt).toLocaleDateString("he-IL")}
                    </p>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-border-subtle rounded-lg h-24 flex items-center justify-center text-text-faint text-xs">
                    ממתין לחתימתך
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sign button */}
        {!signed && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setShowSignature(true)}
              className="btn-gold text-base px-8 py-3 inline-flex items-center gap-2"
            >
              <Pen className="w-5 h-5" /> חתום על החוזה
            </button>
            <p className="text-xs text-text-muted mt-2">
              בלחיצה על חתום את/ה מאשר/ת את תוכן החוזה
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

// ============ Client Signature Modal ============

function ClientSignatureModal({
  onSign,
  onCancel,
  submitting,
}: {
  onSign: (data: string) => void;
  onCancel: () => void;
  submitting: boolean;
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-xl p-6 max-w-xl w-full shadow-2xl animate-scale" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-heading font-bold text-text-primary">חתימה דיגיטלית</h3>
            <p className="text-xs text-text-muted">חתמ/י עם האצבע או העכבר</p>
          </div>
          <button onClick={onCancel} className="p-2 rounded-lg hover:bg-bg-surface">
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
          <button onClick={clear} className="btn-ghost flex-1">נקה</button>
          <button onClick={onCancel} className="btn-ghost flex-1">ביטול</button>
          <button
            onClick={() => {
              if (canvasRef.current && hasDrawn) {
                onSign(canvasRef.current.toDataURL("image/png"));
              }
            }}
            disabled={!hasDrawn || submitting}
            className="btn-gold flex-1 flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><Pen className="w-4 h-4" /> חתום</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
