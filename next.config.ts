import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },

  distDir: ".next",

  // 🔥 Turbopack kikapcsolása TS hiba nélkül
  // @ts-expect-error – Next.js 16 még boolean-t is elfogad runtime-ban
  turbopack: false,

  webpack: (config) => {
    return config;
  },
};

export default nextConfig;
