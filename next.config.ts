import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  async headers() {
    return [
      {
        // Generated filenames contain a content fingerprint and are never
        // overwritten, so a year-long immutable cache is safe.
        source: "/article-images/:year(\\d{4})/:month(\\d{2})/:day(\\d{2})/:file([1-9]\\d*-[a-f0-9]{12}\\.(?:jpe?g|png|webp))",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },

  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
      allowedOrigins: ["*"], // ⭐ fontos!
    },
  },

  // ⭐ ETag kikapcsolása → kevesebb verzióütközés
  generateEtags: false,

  // ⭐ Dev-szerű viselkedés: ne cache-eljen agresszívan
  onDemandEntries: {
    maxInactiveAge: 0,
    pagesBufferLength: 0,
  },

  distDir: ".next",
};

export default nextConfig;
