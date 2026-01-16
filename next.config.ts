import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Turbopack teljes kikapcsolása
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  // Webpack kényszerítése
  distDir: ".next",
  webpack: (config) => {
    return config;
  },
};

export default nextConfig;
