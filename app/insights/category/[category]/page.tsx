// app/insights/category/[category]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import InsightList from "@/components/InsightList";
import InsightSparkline from "@/components/InsightSparkline";
import InsightSourceRing from "@/components/InsightSourceRing";

/* Típusok */
type ApiMeta = {
  category: string | null;
  articleCount: number;
  sourceCount: number;
  lastUpdated: string | null;
};

type ApiSummary = {
  trendSeries: number[];
  trendLabels: string[];
  trendScore: number;
};

type ApiItem = {
  id: string;
  title: string;
  published_at: string | null;
  dominantSource: string;
  sources: number;
  score: number;
  excerpt?: string;
  href: string;
};

export default function CategoryPage() {
  const params = useParams() as { category?: string };
  const search = useSearchParams();
  const router = useRouter();

  const categoryRaw = params?.category ?? "";
  const period = (search?.get("period") as string) || "7d";
  const sort = (search?.get("sort") as string) || "latest";
  const page = Number(search?.get("page") || 1);
  const limit = Number(search?.get("limit") || 20);

  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [summary, setSummary] = useState<ApiSummary | null>(null);
  const [items, setItems] = useState<ApiItem[]>([]);
  const [fullSources, setFullSources] = useState<any[]>([]);   // ÚJ
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const url = `/api/insights/category/${encodeURIComponent(
          categoryRaw
        )}?period=${encodeURIComponent(period)}&sort=${encodeURIComponent(
          sort
        )}&page=${page}&limit=${limit}`;

        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error("Hálózati hiba");

        const json = await res.json();
        if (!mounted) return;

        if (!json || json.success !== true) {
          setError("Nem sikerült betölteni az adatokat.");
          setMeta(null);
          setSummary(null);
          setItems([]);
          setFullSources([]);
          return;
        }

        setMeta(json.meta ?? null);
        setSummary(
          json.summary ?? {
            trendSeries: [],
            trendLabels: [],
            trendScore: 0,
          }
        );

        const mapped: ApiItem[] = (json.items || []).map((it: any) => ({
          id: String(it.id),
          title: it.title,
          published_at: it.published_at ?? null,
          dominantSource: it.dominantSource ?? "",
          sources: Number(it.sources ?? 1),
          score: Number(it.score ?? 0),
          excerpt: it.excerpt ?? "",
          href: it.href ?? `/insights/${it.id}`,
        }));

        setItems(mapped);
        setFullSources(json.sources || []);   // ÚJ: teljes forráslista mentése

      } catch (e) {
        console.error("Category load error:", e);
        if (mounted) setError("Szerverhiba vagy hálózati probléma.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [categoryRaw, period, sort, page, limit]);

  function formatDate(iso?: string | null) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  function setSort(newSort: string) {
    const q = new URLSearchParams(Array.from(search?.entries() || []));
    q.set("sort", newSort);
    q.set("page", "1");
    router.push(`/insights/category/${encodeURIComponent(categoryRaw)}?${q.toString()}`);
  }

  function setPeriod(newPeriod: string) {
    const q = new URLSearchParams(Array.from(search?.entries() || []));
    q.set("period", newPeriod);
    q.set("page", "1");
    router.push(`/insights/category/${encodeURIComponent(categoryRaw)}?${q.toString()}`);
  }

  return (
    <main className="container py-4">
      <header className="mb-4">
        <h1 className="h3">{meta?.category ?? decodeURIComponent(categoryRaw)}</h1>
        <div className="d-flex gap-3 align-items-center text-muted small">
          <span>{meta ? `${meta.articleCount} cikk` : "— cikk"}</span>
          <span>•</span>
          <span>{meta ? `${meta.sourceCount} forrás` : "— forrás"}</span>
          <span>•</span>
          <span>{meta ? `Utolsó frissítés: ${formatDate(meta.lastUpdated)}` : ""}</span>
        </div>
      </header>

      <section className="mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between gap-3">
          <div className="d-flex gap-3 align-items-center">
            <div className="metric-card p-2 border rounded text-center">
              <div className="metric-value fs-4">{meta?.articleCount ?? "—"}</div>
              <div className="metric-label small text-muted">Cikkek</div>
            </div>

            <div className="metric-card p-2 border rounded text-center">
              <div className="metric-value fs-4">{meta?.sourceCount ?? "—"}</div>
              <div className="metric-label small text-muted">Források</div>
            </div>

            <div className="metric-card p-2 border rounded text-center">
              <div className="metric-value fs-4">{summary ? summary.trendScore : "—"}</div>
              <div className="metric-label small text-muted">Trend pont</div>
            </div>

            <div className="p-2">
              <InsightSparkline trend={summary?.trendSeries ?? []} />
            </div>
          </div>

          <div className="d-flex gap-2 align-items-center">
            <div className="btn-group" role="group" aria-label="Rendezés">
              <button
                className={`btn btn-sm ${sort === "latest" ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => setSort("latest")}
              >
                Legfrissebb
              </button>
              <button
                className={`btn btn-sm ${sort === "popular" ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => setSort("popular")}
              >
                Legnépszerűbb
              </button>
            </div>

            <div className="btn-group" role="group" aria-label="Időszak">
              <button
                className={`btn btn-sm ${period === "7d" ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => setPeriod("7d")}
              >
                7 nap
              </button>
              <button
                className={`btn btn-sm ${period === "30d" ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => setPeriod("30d")}
              >
                30 nap
              </button>
              <button
                className={`btn btn-sm ${period === "90d" ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => setPeriod("90d")}
              >
                90 nap
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="row">
        <aside className="col-12 col-md-4 mb-4">
          <div className="p-3 border rounded">
            <h3 className="h6 mb-3">Források</h3>

            {loading ? (
              <div className="text-muted">Betöltés…</div>
            ) : items.length === 0 ? (
              <div className="text-muted">Nincs találat a kiválasztott időszakra.</div>
            ) : (
              <SourceBreakdown items={items} fullSources={fullSources} />
            )}
          </div>
        </aside>

        <div className="col-12 col-md-8">
          {error ? (
            <div className="alert alert-danger">{error}</div>
          ) : loading ? (
            <div>
              <div className="mb-2 text-muted">Betöltés…</div>
              <InsightList
                items={Array.from({ length: 6 }).map((_, i) => ({
                  id: `skeleton-${i}`,
                  title: "Betöltés…",
                  score: 0,
                  sources: 0,
                  dominantSource: "",
                  timeAgo: "",
                  href: undefined,
                }))}
                loading={true}
              />
            </div>
          ) : items.length === 0 ? (
            <div className="text-muted">Nincs megjeleníthető cikk a kiválasztott szűrőkkel.</div>
          ) : (
            <InsightList items={items.map(mapToInsightListItem)} loading={false} />
          )}
        </div>
      </section>
    </main>
  );
}

function mapToInsightListItem(it: any) {
  return {
    id: it.id,
    title: it.title,
    score: Number(it.score || 0),
    sources: Number(it.sources || 0),
    dominantSource: it.dominantSource || "",
    timeAgo: it.published_at ? new Date(it.published_at).toLocaleString() : "",
    href: it.href,
  };
}

/* ÚJ: SourceBreakdown teljes forráslistával */
function SourceBreakdown({
  items,
  fullSources,
}: {
  items: ApiItem[];
  fullSources?: any[];
}) {
  const sourceData =
    fullSources && fullSources.length > 0
      ? fullSources.map((s) => ({
          name: s.source || "Ismeretlen",
          count: s.count || 0,
        }))
      : items.map((it) => ({
          name: it.dominantSource || "Ismeretlen",
          count: 1,
        }));

  const map = new Map<string, number>();
  for (const s of sourceData) {
    map.set(s.name, (map.get(s.name) || 0) + s.count);
  }

  const total = Array.from(map.values()).reduce((a, b) => a + b, 0) || 1;
  const list = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);

  const ringSources = list.map(([name, cnt]) => ({
    name,
    percent: Math.round((cnt / total) * 100),
  }));

  return (
    <div>
      <InsightSourceRing sources={ringSources} />
      <ul className="list-unstyled mt-3 small">
        {list.map(([name, cnt]) => (
          <li key={name} className="d-flex justify-content-between">
            <span>{name}</span>
            <span className="text-muted">{cnt}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
