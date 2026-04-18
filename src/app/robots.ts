import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.ziratadrichalut.co.il";

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
