import type { MetadataRoute } from "next";

// .trim() defends against env vars saved with trailing \n — that would produce
// invalid Host/Sitemap values like "https://www.ziratadrichalut.co.il\n/sitemap.xml".
const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://www.ziratadrichalut.co.il").trim();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/client-portal/",
          "/contract/sign/",
          "/designer/*/onboarding",
          "/designer/*/subscription",
          "/_next/",
          "/*.json$",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
