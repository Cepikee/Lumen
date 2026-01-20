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

/** Type guard: ellenőrzi, hogy egy objektum RawCategory-szerű-e */
function isRawCategory(obj: unknown): obj is RawCategory {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  // category lehet string vagy null; trendScore és articleCount számok
  return (
    ("category" in o) &&
    (typeof o.category === "string" || o.category === null) &&
    ("trendScore" in o) &&
    (typeof o.trendScore === "number") &&
    ("articleCount" in o) &&
    (typeof o.articleCount === "number")
  );
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
          if (mounted) setCategoryTrends([]);
          return;
        }
        const json: unknown = await res.json();
        if (!mounted) return;

        // Ha van categories tömb, használjuk (biztonságosan szűrve és cast-olva)
        if (Array.isArray((json as any)?.categories) && (json as any).categories.length > 0) {
          const rawCats = (json as any).categories as unknown[];
          const filtered: RawCategory[] = rawCats.filter(isRawCategory).filter(
            (c) => normalizeCategory(c.category) !== null
          );
          if (mounted) setCategoryTrends(filtered);
          return;
        }

        // Ha nincs categories, de vannak items, deriváljuk
        if (Array.isArray((json as any)?.items) && (json as any).items.length > 0) {
          const items = (json as any).items as any[];
          const derived = items.reduce((acc: Record<string, RawCategory>, it: any) => {
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
            acc[cat].sourceDiversity = (Number(acc[cat].sourceDiversity || 0) || 0) + (Number(it.sources || 0) || 0);
            if (it.timeAgo && (!acc[cat].lastArticleAt || it.timeAgo > acc[cat].lastArticleAt)) {
              acc[cat].lastArticleAt = it.timeAgo;
            }
            return acc;
          }, {});
          // Object.values eredménye unknown lehet, ezért castoljuk és szűrjük
          const values = Object.values(derived).filter((v): v is RawCategory => {
            return isRawCategory(v) && normalizeCategory(v.category) !== null;
          }) as RawCategory[];
          if (mounted) setCategoryTrends(values);
          return;
        }

        // alapértelmezett
        if (mounted) setCategoryTrends([]);
      } catch (e) {
        if (mounted) setCategoryTrends([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // Szűrjük ki a null kategóriákat, mielőtt UI elemeket készítünk
  const categoryItems = categoryTrends
    .filter((c) => normalizeCategory(c.category) !== null)
    .map((c) => {
      const cat = normalizeCategory(c.category)!; // itt már nem lehet null
      return {
        id: `cat-${cat}`,
        title: cat,
        score: Number(c.trendScore || 0),
        sources: Number(c.articleCount || 0),
        dominantSource: `${c.sourceDiversity ?? 0} forrás`,
        timeAgo: c.lastArticleAt ? new Date(c.lastArticleAt).toLocaleString() : "",
        href: `/insights/category/${encodeURIComponent(cat)}`,
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
