"use client";

import { useEffect, useState } from "react";
import InsightSparkline from "@/components/InsightSparkline";
import InsightSourceRing from "@/components/InsightSourceRing";
import InsightCard from "@/components/InsightCard";

export default function InsightPage({ params }: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const keyword = decodeURIComponent(params.keyword);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/insights/${keyword}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("InsightPage error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [keyword]);

  if (loading) {
    return <div className="container py-5">Betöltés…</div>;
  }

  if (!data?.success) {
    return <div className="container py-5">Nem található trend.</div>;
  }

  const trend = data;

  return (
    <main className="container py-5 insight-page">

      <h1 className="insight-page-title">{trend.keyword}</h1>

      <div className="insight-page-meta">
        <span className="badge bg-primary">{trend.meta.category}</span>
        <span className="insight-page-score">{trend.trendScore}</span>
        <span className="text-muted">
          Utolsó cikk: {new Date(trend.meta.last_article_at).toLocaleString()}
        </span>
      </div>

      <div className="insight-page-sparkline">
        <InsightSparkline
          trend={trend.sparklineData.map(
            (p: { bucket: string; count: number }) => p.count
          )}
        />
      </div>

      <div className="insight-page-ring">
        <InsightSourceRing sources={trend.sourceDominance} />
        <div className="text-muted small mt-2">
          Domináns forrás:{" "}
          <strong>
            {trend.sourceDominance[0]?.source || "Nincs adat"}
          </strong>
        </div>
      </div>

      <section className="insight-page-summary">
        <h2 className="fs-5 fw-bold mb-2">Kapcsolódó cikkek</h2>

        <ul className="list-group">
          {trend.relatedArticles.map(
            (a: {
              id: number;
              title: string;
              url_canonical: string;
              source: string | null;
              created_at: string;
              category: string;
            }) => (
              <li key={a.id} className="list-group-item">
                <a href={a.url_canonical} target="_blank">
                  {a.title}
                </a>
                <div className="small text-muted">
                  {a.source || "Ismeretlen forrás"} •{" "}
                  {new Date(a.created_at).toLocaleString()}
                </div>
              </li>
            )
          )}
        </ul>
      </section>

      <section className="insight-page-related mt-5">
        <h2 className="fs-5 fw-bold mb-3">Kapcsolódó trendek</h2>

        <div className="d-flex flex-column gap-3">
          {trend.relatedTrends.map(
            (item: {
              keyword: string;
              category: string;
              article_count: number;
            }) => (
              <InsightCard
                key={item.keyword}
                title={item.keyword}
                category={item.category}
                score={Math.round((item.article_count / 10) * 100)}
                sources={item.article_count}
                dominantSource={"?"}
                timeAgo={"—"}
              />
            )
          )}
        </div>
      </section>

    </main>
  );
}
