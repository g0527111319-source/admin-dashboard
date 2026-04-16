"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle2, Pen, X, Clock, AlertCircle, Sparkles, Send } from "lucide-react";
import ContractAnnexView from "@/components/crm/ContractAnnexView";
import PdfCanvasViewer from "@/components/crm/PdfCanvasViewer";
import { readAnnex, annexHasContent } from "@/lib/contract-annex";

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
    contentBlocks: { id: string; type: string; content: string; fileUrl?: string; fileName?: string; fileType?: string; pageCount?: number }[];
    fields: { id: string; label: string; type: string; owner: string; required: boolean; placeholder?: string; width?: string; fontSize?: number; position?: { x: number; y: number; w: number; h: number; blockId: string } }[];
  } | null;
  designer?: { fullName: string; companyName?: string };
}

/** Keep in sync with CrmContracts.tsx. */
const DEFAULT_FIELD_FONT_SIZE = 12;

// Next.js 14 passes params to Client Components as a plain object (not a Promise).
// Using React.use() on a non-thenable throws during SSR and produces a 500 on the
// deployed route — even when the page itself renders fine locally in dev. Keep
// the sync signature here; if we ever migrate to Next 15 we'll flip back to the
// Promise-based form and use() it.
export default function ClientSignPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [clientValues, setClientValues] = useState<Record<string, string>>({});

  // New flow: the client draws the signature into a local buffer and fills
  // fields at the top. Nothing is sent to the server until they explicitly
  // press the "Send & sign" button. `signatureDraft` holds the unsent PNG
  // data URL; the real commit happens in `submitSignature()` via the send
  // button (fixed-position, visible while scrolling).
  const [signatureDraft, setSignatureDraft] = useState<string | null>(null);
  const [showSignature, setShowSignature] = useState(false);

  const [signed, setSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    fetchContract();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function submitSignature() {
    if (!contract || !signatureDraft) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch(`/api/contract/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientSignatureData: signatureDraft,
          clientFieldValues: clientValues,
        }),
      });
      if (res.ok) {
        setSigned(true);
        fetchContract();
        // Scroll up so the "signed" confirmation is visible immediately.
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const data = await res.json().catch(() => ({}));
        setSubmitError(data.error || "שגיאה בחתימה, נסה/י שוב");
      }
    } catch {
      setSubmitError("שגיאה בחתימה, נסה/י שוב");
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
          <p className="text-sm text-text-muted mt-2">יש לוודא שהקישור תקין או לפנות למעצב/ת</p>
        </div>
      </div>
    );
  }

  // Fields the client fills in — non-positioned, non-auto, non-signature.
  const clientInputFields = (contract.template?.fields || []).filter(
    f => f.owner === "client" && f.type !== "signature" && !CLIENT_AUTO_FIELDS.includes(f.type) && !f.position,
  );
  // Fields placed on document pages (positioned overlays).
  const positionedClientFields = (contract.template?.fields || []).filter(
    f => f.owner === "client" && f.position && f.type !== "signature" && !CLIENT_AUTO_FIELDS.includes(f.type),
  );
  // Auto-filled fields (client_name, client_email, etc.) — shown read-only.
  const autoFilledFields = (contract.template?.fields || []).filter(f => CLIENT_AUTO_FIELDS.includes(f.type));
  const allFieldValues = { ...contract.designerFieldValues, ...clientValues };
  const annex = readAnnex(contract.designerFieldValues);

  // Validation: required client fields must be filled, and signature drawn.
  const missingRequired = clientInputFields
    .concat(positionedClientFields)
    .filter(f => f.required && !String(clientValues[f.id] || "").trim());
  const canSend = !signed && !!signatureDraft && missingRequired.length === 0;

  return (
    <div className="min-h-screen bg-bg pb-32" dir="rtl">
      {/* Signature Modal */}
      {showSignature && (
        <ClientSignatureModal
          onSign={(data) => {
            setSignatureDraft(data);
            setShowSignature(false);
          }}
          onCancel={() => setShowSignature(false)}
          initial={signatureDraft}
        />
      )}

      {/* Header bar */}
      <header className="bg-white border-b border-border-subtle shadow-sm sticky top-0 z-30">
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

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Success state — shown at the very top after submission */}
        {signed && (
          <div className="card-static border-emerald-200 bg-emerald-50 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h2 className="text-lg font-heading font-bold text-emerald-800">החוזה נחתם בהצלחה!</h2>
            <p className="text-sm text-emerald-600 mt-1">עותק נשלח אליך ולמעצב/ת באימייל</p>
          </div>
        )}

        {/* ============ TOP SECTION: fill + sign (only while unsigned) ============ */}
        {!signed && (
          <section className="card-static border-gold/30 bg-gold/5 space-y-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gold text-black font-bold flex items-center justify-center">1</div>
              <h2 className="text-lg font-heading font-bold text-text-primary">מילוי פרטים וחתימה</h2>
            </div>

            <p className="text-sm text-text-secondary">
              יש למלא את הפרטים הנדרשים ולחתום בתחתית חלק זה. לאחר מכן תוכל/י לקרוא את החוזה למטה, ולשלוח בלחיצת כפתור.
            </p>

            {/* Client input fields (non-positioned) */}
            {clientInputFields.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  שדות למילוי
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {clientInputFields.map(field => (
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

            {/* Positioned client fields — same inputs, grouped here so the client
                doesn't have to hunt across pages */}
            {positionedClientFields.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  שדות במסמך
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {positionedClientFields.map(field => (
                    <div key={field.id}>
                      <label className="form-label">
                        {field.label} {field.required && <span className="text-red-400">*</span>}
                      </label>
                      <input
                        type={field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "email" ? "email" : "text"}
                        value={clientValues[field.id] || ""}
                        onChange={e => setClientValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                        className="input-field"
                        placeholder={field.placeholder || field.label}
                      />
                      <p className="text-xs text-text-faint mt-0.5">ישולב במיקומו במסמך</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Signature capture */}
            <div>
              <h3 className="text-sm font-semibold text-purple-700 flex items-center gap-2 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                חתימה <span className="text-red-400">*</span>
              </h3>
              {signatureDraft ? (
                <div className="border border-border-subtle rounded-lg p-3 bg-white">
                  <img src={signatureDraft} alt="חתימה" className="h-24 mx-auto" />
                  <button
                    onClick={() => setShowSignature(true)}
                    className="btn-ghost text-xs w-full mt-2"
                  >
                    <Pen className="w-3 h-3" /> חתום מחדש
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSignature(true)}
                  className="btn-ghost w-full py-6 border-2 border-dashed border-purple-300 hover:border-purple-500 hover:bg-purple-50 flex items-center justify-center gap-2"
                >
                  <Pen className="w-5 h-5 text-purple-500" />
                  <span className="text-purple-700 font-medium">לחצ/י לחתימה דיגיטלית</span>
                </button>
              )}
            </div>

            {missingRequired.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                יש למלא את כל השדות המסומנים באסטריסק: {missingRequired.map(f => f.label).join(", ")}
              </div>
            )}
          </section>
        )}

        {/* ============ STEP 2: Read the contract ============ */}
        <section>
          {!signed && (
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-gold text-black font-bold flex items-center justify-center">2</div>
              <h2 className="text-lg font-heading font-bold text-text-primary">קריאת החוזה</h2>
            </div>
          )}

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
                      <PdfCanvasViewer url={block.fileUrl} />
                    )}
                    {/* Positioned fields on document — read-only here since the client
                        edits them via the form at the top of the page */}
                    {(contract.template?.fields || []).filter(f => f.position?.blockId === block.id).map(field => {
                      const pos = field.position!;
                      const value = field.owner === "designer" || CLIENT_AUTO_FIELDS.includes(field.type)
                        ? (allFieldValues[field.id] || contract.designerFieldValues[field.id])
                        : clientValues[field.id];
                      const isAutoField = CLIENT_AUTO_FIELDS.includes(field.type);
                      const borderColor = field.type === "signature" ? "border-purple-400"
                        : isAutoField ? "border-emerald-400"
                        : field.owner === "designer" ? "border-amber-400" : "border-blue-400";
                      const fs = field.fontSize || DEFAULT_FIELD_FONT_SIZE;

                      return (
                        <div
                          key={field.id}
                          className={`absolute border rounded-md flex items-center ${borderColor} bg-transparent`}
                          style={{
                            left: `${pos.x}%`,
                            top: `${pos.y}%`,
                            width: `${pos.w}%`,
                            height: `${pos.h}%`,
                            fontSize: `${fs}px`,
                            lineHeight: 1.1,
                            padding: fs <= 10 ? "0 2px" : "0 6px",
                            minHeight: field.type === "signature" ? 40 : Math.max(14, fs + 4),
                          }}
                        >
                          {field.type === "signature" ? (
                            value ? <img src={value} alt="חתימה" className="h-full mx-auto object-contain" />
                              : <span className="text-text-faint italic">חתימה</span>
                          ) : (
                            <span className="truncate flex items-center gap-1">
                              {value || <span className="text-text-faint italic">{field.label}</span>}
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

            {/* Designer filled values display */}
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

            {/* Amount */}
            {contract.totalAmount > 0 && (
              <div className="mt-6 pt-4 border-t border-border-subtle">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-text-secondary">סכום כולל</span>
                  <span className="text-xl font-bold text-text-primary">₪{contract.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Annex */}
            {annex && annexHasContent(annex) && (
              <ContractAnnexView annex={annex} />
            )}

            {/* Signatures (shown in-place at bottom of contract for completeness) */}
            <div className="mt-8 pt-6 border-t border-border-subtle">
              <div className="grid grid-cols-2 gap-8">
                <div className="text-center">
                  <p className="text-xs text-text-muted mb-3">חתימת מעצב/ת</p>
                  {contract.designerSignatureData ? (
                    <div className="border border-border-subtle rounded-lg p-3 bg-bg-surface">
                      <img src={contract.designerSignatureData} alt="חתימת מעצב/ת" className="h-20 mx-auto" />
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
                  ) : signatureDraft ? (
                    <div className="border border-purple-300 rounded-lg p-3 bg-purple-50/40">
                      <img src={signatureDraft} alt="חתימת לקוח" className="h-20 mx-auto" />
                      <p className="text-xs text-purple-600 mt-1">טיוטה — טרם נשלחה</p>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-border-subtle rounded-lg h-24 flex items-center justify-center text-text-faint text-xs">
                      חתמ/י למעלה
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {submitError}
          </div>
        )}
      </main>

      {/* ================ FLOATING SEND BAR ================ */}
      {/* Sticky at the bottom of the viewport the whole time the client is
          reviewing. Only disappears after a successful signature is committed. */}
      {!signed && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-sm border-t border-border-subtle shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="hidden sm:flex flex-col text-xs">
              <span className={signatureDraft ? "text-emerald-700 font-medium" : "text-text-muted"}>
                {signatureDraft ? "✓ חתימה מוכנה" : "• חתימה חסרה"}
              </span>
              <span className={missingRequired.length === 0 ? "text-emerald-700 font-medium" : "text-amber-700"}>
                {missingRequired.length === 0 ? "✓ כל השדות מולאו" : `• ${missingRequired.length} שדות חסרים`}
              </span>
            </div>

            <button
              onClick={submitSignature}
              disabled={!canSend || submitting}
              className="btn-gold text-base px-8 py-3 inline-flex items-center gap-2 flex-1 sm:flex-none sm:min-w-[280px] justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  שולח...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  שלח חוזה חתום
                </>
              )}
            </button>
          </div>
          <div className="max-w-3xl mx-auto px-4 pb-2 text-center sm:hidden">
            {!signatureDraft && (
              <p className="text-xs text-text-muted">יש למלא שדות ולחתום בראש הדף</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ Client Signature Modal ============

function ClientSignatureModal({
  onSign,
  onCancel,
  initial,
}: {
  onSign: (data: string) => void;
  onCancel: () => void;
  initial?: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(!!initial);

  // If we have a previous draft, render it into the canvas so the user can
  // tweak rather than redraw from scratch.
  useEffect(() => {
    if (!initial || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvasRef.current!.width, canvasRef.current!.height);
    };
    img.src = initial;
  }, [initial]);

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
            <p className="text-xs text-text-muted">חתמ/י עם האצבע או העכבר. בסיום יש ללחוץ אישור.</p>
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
            disabled={!hasDrawn}
            className="btn-gold flex-1 flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <CheckCircle2 className="w-4 h-4" /> אישור חתימה
          </button>
        </div>
        <p className="text-xs text-text-faint mt-3 text-center">
          לאחר אישור החתימה, יש ללחוץ על כפתור <strong>&quot;שלח חוזה חתום&quot;</strong> בתחתית הדף כדי להשלים את השליחה.
        </p>
      </div>
    </div>
  );
}
