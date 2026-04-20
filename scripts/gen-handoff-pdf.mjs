#!/usr/bin/env node
/**
 * Generates docs/zirat-community-handoff.pdf from the sibling .md file.
 * Run: node scripts/gen-handoff-pdf.mjs
 *
 * Uses md-to-pdf (puppeteer-backed) so Hebrew/RTL renders correctly via CSS.
 */
import { mdToPdf } from "md-to-pdf";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mdPath = path.resolve(__dirname, "..", "docs", "zirat-community-handoff.md");
const pdfPath = path.resolve(__dirname, "..", "docs", "zirat-community-handoff.pdf");
const rootPdfPath = path.resolve(__dirname, "..", "הסבר על האתר למתכנת.pdf");

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700&display=swap');
  html, body { direction: rtl; font-family: 'Heebo', sans-serif; font-size: 11pt; color: #1a1a1a; line-height: 1.55; }
  h1 { border-bottom: 2px solid #C9A84C; padding-bottom: 6px; color: #8b6508; font-size: 22pt; }
  h2 { color: #8b6508; margin-top: 28px; font-size: 16pt; border-right: 4px solid #C9A84C; padding-right: 10px; }
  h3 { color: #1a1a1a; font-size: 13pt; margin-top: 20px; }
  h4 { color: #555; font-size: 11pt; }
  a { color: #B8860B; text-decoration: none; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 10pt; }
  th, td { border: 1px solid #e4d9b8; padding: 6px 8px; text-align: right; vertical-align: top; }
  th { background: #faf5e8; font-weight: 700; }
  code { font-family: 'Consolas', 'Courier New', monospace; background: #faf5e8; padding: 1px 5px; border-radius: 3px; font-size: 9.5pt; direction: ltr; unicode-bidi: embed; }
  pre { background: #faf5e8; border: 1px solid #e4d9b8; border-radius: 6px; padding: 10px; direction: ltr; text-align: left; overflow-x: auto; font-size: 9.5pt; }
  pre code { background: transparent; padding: 0; }
  blockquote { border-right: 4px solid #C9A84C; padding: 4px 12px; background: #faf5e8; margin: 8px 0; }
  ul, ol { padding-right: 20px; }
  hr { border: 0; border-top: 1px dashed #e4d9b8; margin: 20px 0; }
  strong { color: #1a1a1a; font-weight: 700; }
`;

const pdf = await mdToPdf(
  { path: mdPath },
  {
    dest: pdfPath,
    css,
    pdf_options: {
      format: "A4",
      margin: { top: "18mm", right: "15mm", bottom: "18mm", left: "15mm" },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `<div style="width:100%; font-family:'Heebo',sans-serif; font-size:8pt; color:#8b6508; padding:4px 15mm; direction:rtl; text-align:center;">זירת האדריכלות — מסמך מפרט טכני</div>`,
      footerTemplate: `<div style="width:100%; font-family:'Heebo',sans-serif; font-size:8pt; color:#999; padding:4px 15mm; direction:rtl; text-align:center;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
    },
    launch_options: { args: ["--no-sandbox"] },
  }
);

if (!pdf) {
  console.error("md-to-pdf returned no result");
  process.exit(1);
}

// Copy to the root pdf that the user maintains
import { copyFileSync } from "node:fs";
copyFileSync(pdfPath, rootPdfPath);

console.log(`PDF written:\n  ${pdfPath}\n  ${rootPdfPath}`);
