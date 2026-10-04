import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return {
    rules: [{ userAgent: "*", allow: ["/", "/cikk/", "/insights/", "/trends", "/premium"], disallow: ["/api/", "/admin/", "/reset-password", "/reset-pin", "/verify-email"] }],
    sitemap: `${base.replace(/\/$/, "")}/sitemap.xml`,
    host: base,
  };
}
