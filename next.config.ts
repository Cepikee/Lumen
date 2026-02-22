import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },

  distDir: ".next",

  webpack: (config) => {
    return config;
  },
};

export default nextConfig;
