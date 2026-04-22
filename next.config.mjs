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
    // obj2gltf imports Cesium with a `require('./Build/Cesium/index.cjs')`
    // that webpack rewrites to an absolute path under `.next/server/chunks/`
    // but doesn't actually emit the file there — breaking OBJ conversion
    // in prod with "Cannot find module '/var/task/.next/server/chunks/
    // Build/Cesium/index.cjs'". Keeping obj2gltf external makes webpack
    // leave the require alone and Node's normal resolver finds cesium
    // inside node_modules/ at runtime. We pair this with explicit trace
    // includes below so nft actually ships the cesium files.
    serverComponentsExternalPackages: ["obj2gltf", "cesium"],
    outputFileTracingIncludes: {
      "/api/designer/crm/models/**": [
        "./node_modules/assimpjs/dist/assimpjs.wasm",
        "./node_modules/web-ifc/*.wasm",
        "./node_modules/draco3dgltf/*.wasm",
        // obj2gltf is marked external above so Node's resolver handles
        // its require() calls at runtime. Cesium's Build/Cesium dir
        // contains Workers/, ThirdParty/, and index.cjs that the obj2gltf
        // loader pulls dynamically — ship the whole minified build.
        "./node_modules/cesium/Build/Cesium/**/*",
        "./node_modules/obj2gltf/**/*",
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
