"use client";

import { useEffect, useState } from "react";
import InsightList from "@/components/InsightList";

export default function InsightFeedPage() {
  const [categoryTrends, setCategoryTrends] = useState<any[]>([]);
  const [keywordTrends, setKeywordTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // ❗ Csak a létező API-t hívjuk
        const catRes = await fetch("/api/insights/categories");
        const catJson = await catRes.json();

        if (catJson.success) setCategoryTrends(catJson.categories);

        // ❗ Keyword feed egyelőre nincs API-ból
        setKeywordTrends([]);

      } catch (err) {
        console.error("InsightFeed error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const categoryItems = categoryTrends.map((c) => ({
    id: `cat-${c.category}`,
    title: c.category,
    category: "Kategória",
    score: c.trendScore,
    sources: c.articleCount,
    dominantSource: `${c.sourceDiversity} forrás`,
    timeAgo: new Date(c.lastArticleAt).toLocaleString(),
    href: `/insights/category/${encodeURIComponent(c.category)}`,
  }));

  const keywordItems: any[] = []; // egyelőre nincs keyword feed

  return (
    <main className="container py-5">
      <h1 className="mb-4 text-center">Trendek</h1>

      <h2 className="fs-5 fw-bold mb-2">Kategória trendek</h2>
      <InsightList items={categoryItems} loading={loading} />

      <h2 className="fs-5 fw-bold mt-5 mb-2">Kulcsszó trendek</h2>
      <InsightList items={keywordItems} loading={loading} />
    </main>
  );
}
