import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

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

  webpack: (config) => {
    return config;
  },
};

export default nextConfig;
