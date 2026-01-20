// app/insight/page.tsx
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
        const [catRes, kwRes] = await Promise.all([
          fetch("/api/insights/categories"),
          fetch("/api/insights"),
        ]);

        const catJson = await catRes.json();
        const kwJson = await kwRes.json();

        if (catJson.success) setCategoryTrends(catJson.categories);
        if (kwJson.success) setKeywordTrends(kwJson.trends);
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
    href: `/insight/category/${encodeURIComponent(c.category)}`,
  }));

  const keywordItems = keywordTrends.map((t: any) => ({
    id: `kw-${t.keyword}`,
    title: t.keyword,
    category: t.category,
    score: t.trendScore,
    sources: t.articleCount,
    dominantSource: `${t.sourceDiversity} forrás`,
    timeAgo: new Date(t.lastArticleAt).toLocaleString(),
    href: `/insight/${encodeURIComponent(t.keyword)}`,
  }));

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
