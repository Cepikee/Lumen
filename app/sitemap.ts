import type { MetadataRoute } from "next";
import mysql, { RowDataPacket } from "mysql2/promise";

export const dynamic = "force-dynamic";

function baseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

type SitemapRow = RowDataPacket & { id: number; updated_at: Date | string | null };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();
  const publicRoutes: MetadataRoute.Sitemap = [
    "",
    "/trends",
    "/insights",
    "/premium",
    "/premium-faq",
    "/adatvedelem",
    "/aszf",
    "/impresszum",
    "/kapcsolat",
  ].map((path) => ({ url: `${base}${path}`, changeFrequency: "hourly", priority: path === "" ? 1 : 0.5 }));

  const pool = mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "utom_app",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "utom_dev",
    connectionLimit: 2,
  });
  try {
    const [rows] = await pool.query<SitemapRow[]>(
      "SELECT id, updated_at FROM summaries WHERE id > 0 ORDER BY id DESC LIMIT 50000",
    );
    const articles = rows.map((row) => {
      const date = row.updated_at ? new Date(row.updated_at) : null;
      return {
        url: `${base}/cikk/${Number(row.id)}`,
        lastModified: date && !Number.isNaN(date.getTime()) ? date : undefined,
        changeFrequency: "daily" as const,
        priority: 0.7,
      };
    });
    return [...publicRoutes, ...articles];
  } catch (error) {
    console.error("sitemap_query_failed", error instanceof Error ? error.message : error);
    return publicRoutes;
  } finally {
    await pool.end();
  }
}
