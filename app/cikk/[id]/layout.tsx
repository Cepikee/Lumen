import type { Metadata } from "next";
import mysql, { RowDataPacket } from "mysql2/promise";

export const dynamic = "force-dynamic";

type ArticleSeoRow = RowDataPacket & {
  id: number;
  title: string | null;
  content: string | null;
  url: string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
};

function baseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

function validDate(value: Date | string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function cleanText(value: string | null, max: number) {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  return text ? text.slice(0, max) : null;
}

async function loadArticle(id: string): Promise<ArticleSeoRow | null> {
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1) return null;
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "utom_app",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "utom_dev",
    connectionLimit: 2,
  });
  try {
    const [rows] = await pool.query<ArticleSeoRow[]>(
      "SELECT id,title,content,url,created_at,updated_at FROM summaries WHERE id=? LIMIT 1",
      [Number(id)],
    );
    return rows[0] || null;
  } catch (error) {
    console.error("article_metadata_query_failed", error instanceof Error ? error.message : error);
    return null;
  } finally {
    await pool.end();
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const article = await loadArticle(id);
  const canonical = `${baseUrl()}/cikk/${encodeURIComponent(id)}`;
  if (!article) return { title: "Cikk nem található | Utom.hu", robots: { index: false, follow: false }, alternates: { canonical } };
  const title = cleanText(article.title, 200) || "Utom.hu cikk";
  const descriptionText = cleanText(article.content, 160);
  const published = validDate(article.created_at);
  const modified = validDate(article.updated_at);
  const openGraph = {
    title,
    url: canonical,
    siteName: "Utom.hu",
    locale: "hu_HU",
    type: "article" as const,
    ...(descriptionText ? { description: descriptionText } : {}),
    ...(published ? { publishedTime: published.toISOString() } : {}),
    ...(published && modified && modified.getTime() >= published.getTime() ? { modifiedTime: modified.toISOString() } : {}),
  };
  const metadata: Metadata = { title: `${title} | Utom.hu`, alternates: { canonical }, openGraph, twitter: { card: "summary", title }, robots: { index: true, follow: true } };
  if (descriptionText) metadata.description = descriptionText;
  return metadata;
}

export default async function ArticleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await loadArticle(id);
  const title = article ? cleanText(article.title, 200) : null;
  const published = article ? validDate(article.created_at) : null;
  const canonical = `${baseUrl()}/cikk/${encodeURIComponent(id)}`;
  const structuredData = title && published ? {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
    datePublished: published.toISOString(),
    ...(article && validDate(article.updated_at) && validDate(article.updated_at)!.getTime() >= published.getTime() ? { dateModified: validDate(article.updated_at)!.toISOString() } : {}),
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    publisher: { "@type": "Organization", name: "Utom.hu" },
  } : null;
  return <>
    {structuredData ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} /> : null}
    {children}
  </>;
}
