/**
 * Generates all PWA / TWA / Play Store icons from the source logo.
 * Run: node scripts/gen-pwa-icons.mjs
 *
 * Sizes rationale:
 *  - 192, 512: manifest.json required
 *  - 384: recommended for installed PWA icon swapping
 *  - 144, 96, 72, 48: older Android home-screen densities
 *  - maskable-512: Android adaptive icon with 80% safe zone
 *  - playstore-512: Play Console hi-res icon (must be 512x512 PNG, <1MB)
 */
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

const SRC = "public/logo.webp";
const OUT = "public/icons";

await fs.mkdir(OUT, { recursive: true });

const standardSizes = [48, 72, 96, 144, 192, 384, 512];

// Standard (no padding — full-bleed icons for devices that show them in a circle crop anyway)
for (const s of standardSizes) {
  const outPath = path.join(OUT, `icon-${s}.png`);
  await sharp(SRC)
    .resize(s, s, { fit: "contain", background: { r: 5, g: 5, b: 5, alpha: 1 } })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.log(`✓ ${outPath}`);
}

// Maskable — Android adaptive icon. Needs 80% safe zone; put the logo on a
// dark background and pad 20% so the OS can crop it into a circle/rounded
// square without chopping the logo.
const maskableSize = 512;
const innerSize = Math.floor(maskableSize * 0.64); // ~327px — conservative safe zone

const logoBuffer = await sharp(SRC).resize(innerSize, innerSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();

await sharp({
  create: {
    width: maskableSize,
    height: maskableSize,
    channels: 4,
    background: { r: 5, g: 5, b: 5, alpha: 1 },
  },
})
  .composite([{ input: logoBuffer, gravity: "center" }])
  .png({ compressionLevel: 9 })
  .toFile(path.join(OUT, "icon-maskable-512.png"));
console.log(`✓ ${OUT}/icon-maskable-512.png (maskable, 64% safe zone)`);

// Play Store hi-res icon — exactly 512x512 PNG, no transparency allowed
await sharp(SRC)
  .resize(512, 512, { fit: "contain", background: { r: 5, g: 5, b: 5, alpha: 1 } })
  .flatten({ background: { r: 5, g: 5, b: 5 } })
  .png()
  .toFile(path.join(OUT, "playstore-icon-512.png"));
console.log(`✓ ${OUT}/playstore-icon-512.png (for Play Console)`);

// Apple touch icon
await sharp(SRC)
  .resize(180, 180, { fit: "contain", background: { r: 5, g: 5, b: 5, alpha: 1 } })
  .png()
  .toFile(path.join(OUT, "apple-touch-icon.png"));
console.log(`✓ ${OUT}/apple-touch-icon.png`);

// Favicon 32
await sharp(SRC)
  .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(path.join(OUT, "favicon-32.png"));
console.log(`✓ ${OUT}/favicon-32.png`);

console.log("\nDone. All icons generated.");
