/**
 * Signed-contract PDF generator.
 *
 * After both parties sign, we build a single archival PDF and:
 *   - save it on R2 (so `contract.pdfUrl` links to it forever), and
 *   - attach it to the confirmation emails sent to the client + designer.
 *
 * Structure of the output:
 *   1. Original contract pages — every `file`-type content block on the
 *      template that is itself a PDF gets copied into the output verbatim,
 *      in the same order as the designer arranged them.
 *   2. Signature certificate page — one clean A4 page at the end that lists
 *      the contract metadata, every filled field (designer + client), both
 *      signatures as inline images, and the audit timestamps / IP. This is
 *      the legally-meaningful page: it proves *who* signed, *when*, and
 *      which values were agreed to.
 *
 * Hebrew rendering:
 *   pdf-lib draws glyphs left-to-right at the position you give it. For a
 *   purely-Hebrew string that means the result is visually reversed. We
 *   handle this by flipping Hebrew runs within mixed strings (`bidi()`
 *   below). It's not a full Unicode-BiDi implementation — numbers and
 *   Latin text in the middle of a Hebrew run are kept in logical order —
 *   but it's good enough for the short certificate-page labels we draw.
 *
 * Serverless-safety:
 *   pdf-lib is pure JS and has no native/binary dependencies, so this works
 *   fine on Vercel's Node runtime. Font files are read from `public/fonts`
 *   via `fs.readFile` at runtime (they ship as static assets in the build).
 */

import { PDFDocument, PDFImage, PDFFont, StandardFonts, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs/promises";
import path from "path";

// ==========================================
// Types (kept loose — Prisma's Json columns are `unknown` on the way in)
// ==========================================

export interface ContractForPdf {
  id: string;
  title: string;
  contractNumber: string | null;
  totalAmount: number;
  createdAt: Date | string;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  designerFieldValues: Record<string, string> | null;
  clientFieldValues: Record<string, string> | null;
  designerSignatureData: string | null;   // data URL or Json that wraps one
  designerSignedAt: Date | string | null;
  clientSignatureData: string | null;
  clientSignedAt: Date | string | null;
  signatureIp: string | null;
  template: {
    name: string;
    contentBlocks: TemplateBlock[];
    fields: TemplateFieldForPdf[];
  } | null;
}

export interface DesignerForPdf {
  fullName: string;
  companyName?: string | null;
  email?: string | null;
}

interface TemplateBlock {
  id: string;
  type: string;
  content?: string;
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
}

interface TemplateFieldForPdf {
  id: string;
  label: string;
  type: string;
  owner: string;
}

// ==========================================
// Bidi helper
// ==========================================

// Unicode ranges for Hebrew glyphs; strings hitting these get reversed.
const HEBREW_CHAR = /[\u0590-\u05FF\uFB1D-\uFB4F]/;

function containsHebrew(s: string): boolean {
  return HEBREW_CHAR.test(s);
}

/**
 * Light-weight BiDi: split a string into runs and reverse Hebrew runs so
 * pdf-lib (which draws LTR) produces visually-correct Hebrew text.
 *
 * - Pure-Hebrew runs get reversed.
 * - Latin/digit runs stay in order (so phone numbers, IDs, emails still
 *   read correctly).
 * - Line breaks are kept intact so multi-line text renders top-to-bottom.
 */
export function bidi(text: string): string {
  if (!text) return "";
  if (!containsHebrew(text)) return text;
  return text
    .split("\n")
    .map((line) => {
      // Split into Hebrew / non-Hebrew runs
      const parts = line.split(/([\u0590-\u05FF\uFB1D-\uFB4F][\u0590-\u05FF\uFB1D-\uFB4F\s.,'"()\-/:;!?]*)/);
      // Reverse the whole logical order so runs come out right-to-left,
      // then reverse each Hebrew run's glyphs internally.
      return parts
        .reverse()
        .map((part) => (containsHebrew(part) ? part.split("").reverse().join("") : part))
        .join("");
    })
    .join("\n");
}

// ==========================================
// Helpers — font / image loading
// ==========================================

let cachedFontBytes: Uint8Array | null = null;

async function loadHebrewFontBytes(): Promise<Uint8Array> {
  if (cachedFontBytes) return cachedFontBytes;
  const fontPath = path.join(process.cwd(), "public", "fonts", "SF-Hebrew.ttf");
  const buf = await fs.readFile(fontPath);
  cachedFontBytes = new Uint8Array(buf);
  return cachedFontBytes;
}

/**
 * Signature data is stored as a PNG data URL (or a JSON wrapper that
 * contains one). Normalise either form down to raw PNG bytes that we can
 * hand to pdf-lib's `embedPng`.
 */
function signatureToPngBytes(raw: unknown): Uint8Array | null {
  if (!raw) return null;
  let dataUrl: string | null = null;
  if (typeof raw === "string") {
    dataUrl = raw;
  } else if (typeof raw === "object" && raw !== null && "dataUrl" in raw) {
    const v = (raw as { dataUrl?: unknown }).dataUrl;
    if (typeof v === "string") dataUrl = v;
  }
  if (!dataUrl) return null;
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
  if (!match) return null;
  return Uint8Array.from(Buffer.from(match[2], "base64"));
}

/**
 * Fetch a remote PDF block's bytes. Origin-signed R2 URLs are public so
 * this works unauthenticated; fetch fail shouldn't block the signature
 * certificate from being generated.
 */
async function fetchPdfBytes(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  } catch (err) {
    console.warn("[contract-pdf] failed to fetch PDF block:", url, err);
    return null;
  }
}

// ==========================================
// Main entry
// ==========================================

export async function generateSignedContractPdf(
  contract: ContractForPdf,
  designer: DesignerForPdf,
): Promise<Buffer> {
  const outDoc = await PDFDocument.create();
  outDoc.registerFontkit(fontkit);

  // ---- Fonts ----
  const hebrewFontBytes = await loadHebrewFontBytes();
  const hebrewFont = await outDoc.embedFont(hebrewFontBytes, { subset: true });
  const latinFont = await outDoc.embedFont(StandardFonts.Helvetica);
  const latinBoldFont = await outDoc.embedFont(StandardFonts.HelveticaBold);

  // ---- 1. Copy original PDF content blocks ----
  const pdfBlocks = (contract.template?.contentBlocks || []).filter(
    (b) => b.type === "file" && b.fileType === "pdf" && b.fileUrl,
  );

  for (const block of pdfBlocks) {
    const bytes = await fetchPdfBytes(block.fileUrl!);
    if (!bytes) continue;
    try {
      const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pageIndices = srcDoc.getPageIndices();
      const copied = await outDoc.copyPages(srcDoc, pageIndices);
      copied.forEach((p) => outDoc.addPage(p));
    } catch (err) {
      console.warn("[contract-pdf] could not copy pages from", block.fileUrl, err);
    }
  }

  // ---- 2. Append certificate page ----
  await appendCertificatePage(outDoc, contract, designer, {
    hebrewFont,
    latinFont,
    latinBoldFont,
  });

  const bytes = await outDoc.save();
  return Buffer.from(bytes);
}

// ==========================================
// Certificate page renderer
// ==========================================

interface FontBundle {
  hebrewFont: PDFFont;
  latinFont: PDFFont;
  latinBoldFont: PDFFont;
}

async function appendCertificatePage(
  doc: PDFDocument,
  contract: ContractForPdf,
  designer: DesignerForPdf,
  fonts: FontBundle,
): Promise<void> {
  const page = doc.addPage([595, 842]); // A4 portrait in points
  const { width, height } = page.getSize();
  const { hebrewFont } = fonts;

  const marginX = 50;
  const gold = rgb(0.788, 0.659, 0.298);   // #C9A84C
  const ink = rgb(0.1, 0.1, 0.1);
  const mute = rgb(0.4, 0.4, 0.4);
  const line = rgb(0.85, 0.85, 0.85);

  // --- Header bar ---
  page.drawRectangle({
    x: 0, y: height - 80, width, height: 80,
    color: rgb(0.04, 0.04, 0.04),
  });
  page.drawText(bidi("אישור חתימה דיגיטלית"), {
    x: width - marginX - hebrewFont.widthOfTextAtSize(bidi("אישור חתימה דיגיטלית"), 20),
    y: height - 40,
    size: 20,
    font: hebrewFont,
    color: gold,
  });
  page.drawText(bidi("זירת האדריכלות"), {
    x: width - marginX - hebrewFont.widthOfTextAtSize(bidi("זירת האדריכלות"), 11),
    y: height - 62,
    size: 11,
    font: hebrewFont,
    color: rgb(0.75, 0.75, 0.75),
  });

  let y = height - 110;

  // --- Contract meta block ---
  const metaLines: Array<[string, string]> = [
    ["חוזה", contract.title],
    ["מספר", contract.contractNumber || "—"],
    ["תאריך יצירה", formatDateHebrew(contract.createdAt)],
    ["מעצב/ת", `${designer.fullName}${designer.companyName ? ` · ${designer.companyName}` : ""}`],
    ["לקוח/ה", contract.clientName || "—"],
    ["אימייל לקוח", contract.clientEmail || "—"],
    ["טלפון לקוח", contract.clientPhone || "—"],
    ["סכום כולל", contract.totalAmount > 0 ? `₪${contract.totalAmount.toLocaleString()}` : "—"],
  ];

  y = drawKeyValueBlock(page, metaLines, {
    y,
    widthArea: width - marginX * 2,
    marginX,
    ...fonts,
    keyColor: mute,
    valueColor: ink,
    lineColor: line,
  });

  // --- Filled fields section ---
  const filledFields = gatherFilledFields(contract);
  if (filledFields.length > 0) {
    y -= 10;
    page.drawText(bidi("פרטים שמולאו בחוזה"), {
      x: width - marginX - hebrewFont.widthOfTextAtSize(bidi("פרטים שמולאו בחוזה"), 13),
      y,
      size: 13,
      font: hebrewFont,
      color: ink,
    });
    y -= 18;

    y = drawKeyValueBlock(page, filledFields, {
      y,
      widthArea: width - marginX * 2,
      marginX,
      ...fonts,
      keyColor: mute,
      valueColor: ink,
      lineColor: line,
    });
  }

  // --- Signature images ---
  y -= 15;
  await drawSignatureBox(doc, page, {
    x: marginX,
    y: y - 120,
    width: (width - marginX * 2 - 20) / 2,
    height: 110,
    label: bidi("חתימת מעצב/ת"),
    subLabel: contract.designerSignedAt ? formatDateTimeHebrew(contract.designerSignedAt) : "",
    rawSignature: contract.designerSignatureData,
    fonts,
    gold,
    mute,
    line,
  });
  await drawSignatureBox(doc, page, {
    x: marginX + (width - marginX * 2 - 20) / 2 + 20,
    y: y - 120,
    width: (width - marginX * 2 - 20) / 2,
    height: 110,
    label: bidi("חתימת לקוח/ה"),
    subLabel: contract.clientSignedAt ? formatDateTimeHebrew(contract.clientSignedAt) : "",
    rawSignature: contract.clientSignatureData,
    fonts,
    gold,
    mute,
    line,
  });

  y -= 130;

  // --- Audit footer ---
  y -= 25;
  page.drawLine({
    start: { x: marginX, y: y + 10 },
    end: { x: width - marginX, y: y + 10 },
    thickness: 0.5,
    color: line,
  });
  const auditText = buildAuditText(contract);
  const auditLines = wrapText(auditText, hebrewFont, 9, width - marginX * 2);
  for (const ln of auditLines) {
    const txt = bidi(ln);
    const w = hebrewFont.widthOfTextAtSize(txt, 9);
    page.drawText(txt, { x: width - marginX - w, y, size: 9, font: hebrewFont, color: mute });
    y -= 12;
  }

  // Tiny footer
  page.drawText("zirat-design.vercel.app", {
    x: marginX,
    y: 30,
    size: 8,
    font: fonts.latinFont,
    color: mute,
  });
}

// ==========================================
// Drawing helpers
// ==========================================

interface KeyValueOpts extends FontBundle {
  y: number;
  widthArea: number;
  marginX: number;
  keyColor: ReturnType<typeof rgb>;
  valueColor: ReturnType<typeof rgb>;
  lineColor: ReturnType<typeof rgb>;
}

function drawKeyValueBlock(
  page: ReturnType<PDFDocument["addPage"]>,
  rows: Array<[string, string]>,
  opts: KeyValueOpts,
): number {
  const { widthArea, marginX, hebrewFont, keyColor, valueColor, lineColor } = opts;
  const fullWidth = page.getWidth();
  const right = fullWidth - marginX;
  const fontSize = 10.5;
  const rowHeight = 20;
  let y = opts.y;

  for (const [k, vRaw] of rows) {
    const keyText = bidi(k);
    const valueText = bidi(vRaw || "—");
    const keyWidth = hebrewFont.widthOfTextAtSize(keyText, fontSize);

    page.drawText(keyText, {
      x: right - keyWidth,
      y,
      size: fontSize,
      font: hebrewFont,
      color: keyColor,
    });

    const valueWidth = hebrewFont.widthOfTextAtSize(valueText, fontSize);
    // Right-aligned value under the key — but leave ~120px gap for the key label
    const valueRight = right - 130;
    page.drawText(valueText, {
      x: valueRight - valueWidth,
      y,
      size: fontSize,
      font: hebrewFont,
      color: valueColor,
    });

    y -= rowHeight;

    page.drawLine({
      start: { x: marginX, y: y + 12 },
      end: { x: marginX + widthArea, y: y + 12 },
      thickness: 0.25,
      color: lineColor,
    });
  }

  return y;
}

async function drawSignatureBox(
  doc: PDFDocument,
  page: ReturnType<PDFDocument["addPage"]>,
  opts: {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    subLabel: string;
    rawSignature: unknown;
    fonts: FontBundle;
    gold: ReturnType<typeof rgb>;
    mute: ReturnType<typeof rgb>;
    line: ReturnType<typeof rgb>;
  },
): Promise<void> {
  const { x, y, width, height, label, subLabel, rawSignature, fonts, mute, line } = opts;

  // Frame
  page.drawRectangle({
    x, y, width, height,
    borderColor: line,
    borderWidth: 0.5,
    color: rgb(0.99, 0.99, 0.99),
  });

  // Label (top-right of the box)
  const labelSize = 9;
  const labelWidth = fonts.hebrewFont.widthOfTextAtSize(label, labelSize);
  page.drawText(label, {
    x: x + width - labelWidth - 8,
    y: y + height - 14,
    size: labelSize,
    font: fonts.hebrewFont,
    color: mute,
  });

  // Signature image
  const pngBytes = signatureToPngBytes(rawSignature);
  if (pngBytes) {
    try {
      const img: PDFImage = await doc.embedPng(pngBytes);
      const maxW = width - 20;
      const maxH = height - 40;
      const ratio = Math.min(maxW / img.width, maxH / img.height);
      const drawW = img.width * ratio;
      const drawH = img.height * ratio;
      page.drawImage(img, {
        x: x + (width - drawW) / 2,
        y: y + 20,
        width: drawW,
        height: drawH,
      });
    } catch (err) {
      console.warn("[contract-pdf] couldn't embed signature:", err);
    }
  } else {
    const placeholder = bidi("— ממתין —");
    const pw = fonts.hebrewFont.widthOfTextAtSize(placeholder, 10);
    page.drawText(placeholder, {
      x: x + (width - pw) / 2,
      y: y + height / 2 - 5,
      size: 10,
      font: fonts.hebrewFont,
      color: mute,
    });
  }

  // Sub-label (timestamp)
  if (subLabel) {
    const subSize = 8;
    const subText = bidi(subLabel);
    const subWidth = fonts.hebrewFont.widthOfTextAtSize(subText, subSize);
    page.drawText(subText, {
      x: x + width - subWidth - 8,
      y: y + 6,
      size: subSize,
      font: fonts.hebrewFont,
      color: mute,
    });
  }
}

// ==========================================
// Text wrapping
// ==========================================

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/);
    let current = "";
    for (const w of words) {
      const trial = current ? `${current} ${w}` : w;
      if (font.widthOfTextAtSize(trial, size) <= maxWidth) {
        current = trial;
      } else {
        if (current) lines.push(current);
        current = w;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

// ==========================================
// Field + audit collectors
// ==========================================

function gatherFilledFields(contract: ContractForPdf): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const fields = contract.template?.fields || [];
  const designerValues = contract.designerFieldValues || {};
  const clientValues = contract.clientFieldValues || {};
  const ANNEX_KEY = "__annex__";

  for (const f of fields) {
    if (f.type === "signature") continue;
    const source = f.owner === "client" ? clientValues : designerValues;
    const raw = source[f.id];
    if (raw === undefined || raw === null || String(raw).trim() === "") continue;
    if (f.id === ANNEX_KEY) continue;
    out.push([f.label, String(raw)]);
  }
  return out;
}

function buildAuditText(contract: ContractForPdf): string {
  const parts: string[] = [];
  parts.push("חתימה דיגיטלית מאומתת. המסמך כולל את החוזה המקורי כפי שהוצג ללקוח/ה, וכן עמוד אישור חתימה עם חותמות זמן מלאות.");
  if (contract.designerSignedAt) {
    parts.push(`חתימת מעצב/ת: ${formatDateTimeHebrew(contract.designerSignedAt)}.`);
  }
  if (contract.clientSignedAt) {
    parts.push(`חתימת לקוח/ה: ${formatDateTimeHebrew(contract.clientSignedAt)}${contract.signatureIp ? ` · IP: ${contract.signatureIp}` : ""}.`);
  }
  return parts.join(" ");
}

// ==========================================
// Date formatting (Hebrew)
// ==========================================

function toDate(v: Date | string | null | undefined): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateHebrew(v: Date | string | null | undefined): string {
  const d = toDate(v);
  if (!d) return "—";
  return d.toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTimeHebrew(v: Date | string | null | undefined): string {
  const d = toDate(v);
  if (!d) return "—";
  return d.toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
