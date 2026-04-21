/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // The 3D conversion route (api/designer/crm/models/[id]/convert) lazily
  // imports three WASM-heavy libraries. Next.js's default nft tracer picks
  // up the .js entry points but sometimes misses the .wasm siblings —
  // explicitly include them so they ship with the serverless function.
  experimental: {
    outputFileTracingIncludes: {
      "/api/designer/crm/models/**": [
        "./node_modules/assimpjs/dist/assimpjs.wasm",
        "./node_modules/web-ifc/*.wasm",
        "./node_modules/draco3dgltf/*.wasm",
      ],
    },
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
