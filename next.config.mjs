/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
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
