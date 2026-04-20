/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // Hosts we serve images from. The /api/image-proxy route is a same-origin
    // relative URL so it works without an entry here. External hosts (R2 public
    // bucket, Cloudflare R2 endpoints) must be listed explicitly.
    remotePatterns: [
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "**.ziratadrichalut.co.il" },
    ],
  },
  async redirects() {
    return [
      // 301 redirect — הדומיין הישן הוחלף בחדש. שומר SEO ולא שובר קישורים.
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "(www\\.)?ziratadrichal\\.co\\.il",
          },
        ],
        destination: "https://www.ziratadrichalut.co.il/:path*",
        permanent: true,
      },
      // apex → www על הדומיין החדש
      {
        source: "/:path*",
        has: [{ type: "host", value: "ziratadrichalut.co.il" }],
        destination: "https://www.ziratadrichalut.co.il/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
