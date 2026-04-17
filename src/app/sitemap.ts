import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.ziratadrichal.co.il";

/**
 * Dynamic sitemap — includes only public-facing pages.
 * Admin/auth/client-portal routes are excluded (also blocked in robots.ts).
 * Dynamic entities (designers, projects, suppliers, events) can be appended
 * here by querying the DB; kept static for now to avoid runtime coupling.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`,               lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE_URL}/experience`,     lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/projects`,       lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${BASE_URL}/accessibility`,  lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE_URL}/terms`,          lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE_URL}/privacy`,        lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE_URL}/data-deletion`,  lastModified: now, changeFrequency: "yearly",  priority: 0.2 },
  ];

  return staticRoutes;
}
