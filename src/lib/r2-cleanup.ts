import { deleteFromR2 } from "./r2";

/**
 * Delete an R2 file and its thumbnail/medium variants.
 * Silently handles errors (logs warning but doesn't throw).
 */
export async function deleteR2WithVariants(r2Key: string): Promise<void> {
  // Given a key like "portfolio/abc/123-file.webp"
  // Also try to delete "portfolio/abc/123-file_thumb.webp" and "portfolio/abc/123-file_medium.webp"
  const variants = [r2Key];
  const dotIdx = r2Key.lastIndexOf(".");
  if (dotIdx > 0) {
    const base = r2Key.substring(0, dotIdx);
    const ext = r2Key.substring(dotIdx);
    variants.push(`${base}_thumb${ext}`);
    variants.push(`${base}_medium${ext}`);
  }

  await Promise.allSettled(
    variants.map(async (key) => {
      try {
        await deleteFromR2(key);
      } catch (err) {
        console.warn(`[r2-cleanup] שגיאה במחיקת ${key}:`, err);
      }
    })
  );
}
