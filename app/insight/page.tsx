"use client";

import { useEffect, useState } from "react";
import InsightCard from "@/components/InsightCard";
import InsightCategoryBar from "@/components/InsightCategoryBar";
import InsightFilters from "@/components/InsightFilters";
import InsightList from "@/components/InsightList";

export default function InsightFeedPage() {
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Kategória és szűrő állapot
  const [activeCategory, setActiveCategory] = useState<string>("Összes");
  const [activeFilter, setActiveFilter] = useState<string>("Legfrissebb");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/insights");
        const json = await res.json();
        if (json.success) {
          setTrends(json.trends);
        }
      } catch (err) {
        console.error("InsightFeed error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Kategória lista
  const categories = ["Összes", ...new Set(trends.map((t) => t.category))];

  // Szűrés kategória szerint
  let filtered = activeCategory === "Összes"
    ? trends
    : trends.filter((t) => t.category === activeCategory);

  // Szűrés filter szerint
  if (activeFilter === "Legfrissebb") {
    filtered = [...filtered].sort(
      (a, b) => new Date(b.lastArticleAt).getTime() - new Date(a.lastArticleAt).getTime()
    );
  }

  if (activeFilter === "Növekvő") {
    filtered = [...filtered].sort((a, b) => b.trendScore - a.trendScore);
  }

  if (activeFilter === "Legtöbb forrás") {
    filtered = [...filtered].sort((a, b) => b.sourceDiversity - a.sourceDiversity);
  }

  // InsightList formátumra alakítás
  const listItems = filtered.map((t) => ({
    id: t.keyword,
    title: t.keyword,
    category: t.category,
    score: t.trendScore,
    sources: t.articleCount,
    dominantSource: `${t.sourceDiversity} forrás`,
    timeAgo: new Date(t.lastArticleAt).toLocaleString(),
  }));

  return (
    <main className="container py-5">
      <h1 className="mb-4 text-center">Trendek</h1>

      {/* Kategória sáv */}
      <InsightCategoryBar
        categories={categories}
        active={activeCategory}
        onSelect={(cat: string) => setActiveCategory(cat)}
      />

      {/* Szűrők */}
      <InsightFilters
        active={activeFilter}
        onChange={(filter: string) => setActiveFilter(filter)}
      />

      {/* Lista */}
      <InsightList items={listItems} loading={loading} />
    </main>
  );
}
