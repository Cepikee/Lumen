import InsightSparkline from "@/components/InsightSparkline";
import InsightSourceRing from "@/components/InsightSourceRing";
import InsightCard from "@/components/InsightCard";

export default async function CategoryInsightPage({ params }: any) {
  const category = decodeURIComponent(params.category);

  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://utom.hu";

const res = await fetch(
  `${base}/api/insights/category/${encodeURIComponent(category)}`,
  { cache: "no-store" }
);


  const data = await res.json();

  if (!data?.success) {
    return <div className="container py-5">Nincs ilyen kategória.</div>;
  }

  const trend = data;

  return (
    <main className="container py-5 insight-page">

      <h1 className="insight-page-title">{trend.category}</h1>

      <div className="insight-page-meta">
        <span className="badge bg-primary">Kategória</span>
        <span className="insight-page-score">{trend.trendScore}</span>
        <span className="text-muted">
          Utolsó cikk: {new Date(trend.meta.last_article_at).toLocaleString()}
        </span>
      </div>

      <div className="insight-page-sparkline">
        <InsightSparkline trend={trend.sparklineData.map((p: any) => p.count)} />
      </div>

      <div className="insight-page-ring">
        <InsightSourceRing sources={trend.sourceDominance} />
        <div className="text-muted small mt-2">
          Domináns forrás:{" "}
          <strong>{trend.sourceDominance[0]?.source || "Nincs adat"}</strong>
        </div>
      </div>

      <section className="insight-page-summary">
        <h2 className="fs-5 fw-bold mb-2">Kapcsolódó kulcsszavak</h2>

        <ul className="list-group">
          {trend.relatedKeywords
            .filter((k: any) => k?.keyword) // <-- EZ A FIX
            .map((k: any) => (
              <li key={k.keyword} className="list-group-item">
                <a href={`/insights/${encodeURIComponent(k.keyword)}`}>
                  {k.keyword}
                </a>
                <div className="small text-muted">{k.article_count} cikk</div>
              </li>
            ))}
        </ul>
      </section>

      <section className="insight-page-related mt-5">
        <h2 className="fs-5 fw-bold mb-3">Kapcsolódó cikkek</h2>

        <div className="d-flex flex-column gap-3">
          {trend.relatedArticles.map((a: any) => (
            <InsightCard
              key={a.id}
              title={a.title}
              category={trend.category}
              score={0}
              sources={0}
              dominantSource={a.source}
              timeAgo={new Date(a.created_at).toLocaleString()}
              href={a.url_canonical}
            />
          ))}
        </div>
      </section>

    </main>
  );
}
