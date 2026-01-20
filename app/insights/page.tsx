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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/insights", { cache: "no-store" });
        if (!res.ok) {
          setCategoryTrends([]);
          return;
        }
        const json = await res.json();
        if (!mounted) return;

        // API most categories objektumokat ad vissza
        if (Array.isArray(json.categories) && json.categories.length > 0) {
          setCategoryTrends(json.categories as RawCategory[]);
        } else if (Array.isArray(json.items) && json.items.length > 0) {
          // derive from items if categories missing
          const derived = json.items.reduce((acc: Record<string, RawCategory>, it: any) => {
            const cat = normalizeCategory(it.category) ?? "__NULL__";
            if (!acc[cat]) {
              acc[cat] = {
                category: cat === "__NULL__" ? null : cat,
                trendScore: 0,
                articleCount: 0,
                sourceDiversity: 0,
                lastArticleAt: it.timeAgo ?? null,
              };
            }
            acc[cat].articleCount += 1;
            acc[cat].sourceDiversity = (acc[cat].sourceDiversity || 0) + (it.sources || 0);
            if (it.timeAgo && (!acc[cat].lastArticleAt || it.timeAgo > acc[cat].lastArticleAt)) {
              acc[cat].lastArticleAt = it.timeAgo;
            }
            return acc;
          }, {});
          setCategoryTrends(Object.values(derived));
        } else {
          setCategoryTrends([]);
        }
      } catch (e) {
        setCategoryTrends([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const categoryItems = categoryTrends.map((c) => {
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
  });

  return (
    <main className="container py-5">
      <h1 className="mb-4 text-center">Trendek</h1>

      <section aria-labelledby="category-trends">
        <h2 id="category-trends" className="fs-5 fw-bold mb-2">
          Kategória trendek
        </h2>
        <InsightList items={categoryItems} loading={loading} />
      </section>
    </main>
  );
}
