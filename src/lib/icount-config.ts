/**
 * iCount configuration loader
 * Reads credentials from DB (SystemSetting) with in-memory cache,
 * falling back to process.env.
 */

import prisma from "@/lib/prisma";

export interface IcountConfig {
  apiKey: string;
  companyId: string;
  user: string;
  pass: string;
}

const SETTINGS_KEY = "admin_settings";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cachedConfig: IcountConfig | null = null;
let cacheTimestamp = 0;

/**
 * Load iCount config. Priority:
 *   1. process.env (Vercel env vars)
 *   2. DB SystemSetting (admin settings page)
 *   3. Empty strings (triggers mock mode)
 */
export async function getIcountConfig(): Promise<IcountConfig> {
  // If all env vars are set, use them directly (fastest path)
  if (
    process.env.ICOUNT_API_KEY &&
    process.env.ICOUNT_COMPANY_ID &&
    process.env.ICOUNT_USER &&
    process.env.ICOUNT_PASS
  ) {
    return {
      apiKey: process.env.ICOUNT_API_KEY,
      companyId: process.env.ICOUNT_COMPANY_ID,
      user: process.env.ICOUNT_USER,
      pass: process.env.ICOUNT_PASS,
    };
  }

  // Check cache
  if (cachedConfig && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedConfig;
  }

  // Load from DB
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: SETTINGS_KEY },
    });

    if (setting?.value) {
      const data = setting.value as Record<string, unknown>;
      const icount = (data.icount || {}) as Record<string, string>;

      cachedConfig = {
        apiKey: process.env.ICOUNT_API_KEY || icount.apiKey || "",
        companyId: process.env.ICOUNT_COMPANY_ID || icount.companyId || "",
        user: process.env.ICOUNT_USER || icount.user || "",
        pass: process.env.ICOUNT_PASS || icount.pass || "",
      };
      cacheTimestamp = Date.now();
      return cachedConfig;
    }
  } catch (err) {
    console.error("[icount-config] Failed to load from DB:", err);
  }

  // Fallback to whatever env vars exist
  return {
    apiKey: process.env.ICOUNT_API_KEY || "",
    companyId: process.env.ICOUNT_COMPANY_ID || "",
    user: process.env.ICOUNT_USER || "",
    pass: process.env.ICOUNT_PASS || "",
  };
}

/** Clear the cache (call after admin settings are updated) */
export function clearIcountConfigCache() {
  cachedConfig = null;
  cacheTimestamp = 0;
}
