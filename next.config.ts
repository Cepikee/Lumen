import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
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
      bodySizeLimit: "1mb",
      // Do not widen Server Actions to arbitrary origins. Next.js defaults to
      // same-origin validation, which is the safe behavior if actions are added later.
    },
  },

  generateEtags: false,
  onDemandEntries: {
    maxInactiveAge: 0,
    pagesBufferLength: 0,
  },
  distDir: ".next",
};

export default nextConfig;
