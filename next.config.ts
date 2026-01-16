// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Turbopack explicit engedélyezése (kötelező Next.js 16-ban)
  turbopack: {
    root: "/var/www/utom/Lumen",
  },

  // Sourcemap-ek kikapcsolása buildben
  productionBrowserSourceMaps: false,

  // Sourcemap-ek kikapcsolása fejlesztés alatt
  webpack(config, { dev }) {
    if (dev) {
      config.devtool = false;
    }
    return config;
  },
};

export default nextConfig;
