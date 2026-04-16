// Copy pdfjs-dist runtime assets from node_modules to public/pdfjs/
// so they're served same-origin by Next.js.
//
// Why: pdf.js v5 is ESM-only and its worker is a module worker. Module
// workers have stricter cross-origin rules than classic workers — loading
// them from a CDN (even with CORS) fails silently in most browsers, so
// rendering hangs. Serving the worker from our own /public/pdfjs/ keeps
// it same-origin and sidesteps the issue entirely.
//
// We also copy cmaps/ and standard_fonts/ so non-Latin PDFs (Hebrew,
// Arabic, CJK) render with correct glyphs — without them pdf.js falls
// back to bogus character maps and text looks scrambled.
//
// Runs automatically via the `predev` and `prebuild` npm scripts, so
// developers and Vercel's build pipeline both get the files without any
// manual step.

import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const src = path.join(root, "node_modules", "pdfjs-dist");
const dst = path.join(root, "public", "pdfjs");

if (!existsSync(src)) {
  console.error(
    `✗ pdfjs-dist not found at ${src}. Did you run \`npm install\`?`
  );
  process.exit(1);
}

// Start clean so renames / removed files in a pdfjs upgrade don't leave
// stale copies around.
if (existsSync(dst)) {
  await rm(dst, { recursive: true, force: true });
}
await mkdir(dst, { recursive: true });

const targets = [
  ["legacy/build/pdf.min.mjs", "pdf.min.mjs"],
  ["legacy/build/pdf.worker.min.mjs", "pdf.worker.min.mjs"],
  ["cmaps", "cmaps"],
  ["standard_fonts", "standard_fonts"],
];

for (const [from, to] of targets) {
  const fromPath = path.join(src, from);
  const toPath = path.join(dst, to);
  if (!existsSync(fromPath)) {
    console.error(`✗ Missing pdf.js asset: ${fromPath}`);
    process.exit(1);
  }
  await cp(fromPath, toPath, { recursive: true });
}

console.log(`✓ Copied pdf.js assets to ${path.relative(root, dst)}`);
