// app/insights/page.tsx
"use client";

import { useEffect, useState } from "react";
import InsightList from "@/components/InsightList";

type RawCategory = {
  category: string | null;
  trendScore: number;
  articleCount: number;
  sourceDiversity?: number | string;
  lastArticleAt?: string | null;
};

function normalizeCategory(raw?: string | null) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (s.toLowerCase() === "null") return null;
  return s;
}

export default function InsightFeedPage() {
  const [categoryTrends, setCategoryTrends] = useState<RawCategory[]>([]);
  const [keywordTrends, setKeywordTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const catRes = await fetch("/api/insights", { cache: "no-store" });
        if (!catRes.ok) {
          if (!mounted) return;
          setCategoryTrends([]);
          return;
        }
        const catJson = await catRes.json();
        if (!mounted) return;
        if (catJson && Array.isArray(catJson.items)) {
          // API returns items and categories; we prefer categories summary if present
          if (Array.isArray(catJson.categories) && catJson.categories.length > 0) {
            setCategoryTrends(catJson.categories as RawCategory[]);
          } else {
            // derive minimal structure from items
            const derived = (catJson.items || []).map((it: any) => ({
              category: it.category ?? null,
              trendScore: it.score ?? 0,
              articleCount: it.sources ?? 0,
              sourceDiversity: it.dominantSource ?? "",
              lastArticleAt: it.timeAgo ?? null,
            }));
            setCategoryTrends(derived);
          }
        } else {
          setCategoryTrends([]);
        }

        setKeywordTrends([]);
      } catch (err) {
        if (mounted) {
          setCategoryTrends([]);
          setKeywordTrends([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const categoryItems = categoryTrends
    .map((c) => {
      const cat = normalizeCategory(c.category);
      return {
        id: `cat-${cat ?? "unknown"}`,
        title: cat ?? "Ismeretlen kategória",
        score: Number(c.trendScore || 0),
        sources: Number(c.articleCount || 0),
        dominantSource: `${c.sourceDiversity ?? 0} forrás`,
        timeAgo: c.lastArticleAt ? new Date(c.lastArticleAt).toLocaleString() : "",
        href: cat ? `/insights/category/${encodeURIComponent(cat)}` : undefined,
      };
    })
    .slice(0, 200);

  const keywordItems: any[] = [];

  return (
    <main className="container py-5">
      <h1 className="mb-4 text-center">Trendek</h1>

      <section aria-labelledby="category-trends">
        <h2 id="category-trends" className="fs-5 fw-bold mb-2">
          Kategória trendek
        </h2>
        <InsightList items={categoryItems} loading={loading} />
      </section>

      <section aria-labelledby="keyword-trends" className="mt-5">
        <h2 id="keyword-trends" className="fs-5 fw-bold mb-2">
          Kulcsszó trendek
        </h2>
        <InsightList items={keywordItems} loading={loading} />
      </section>
    </main>
  );
}
