"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import TrendSourcesModal from "./TrendSourcesModal";
import TrendsHeroGlobe from "./TrendsHeroGlobe";
import styles from "./TrendsDashboard.module.css";

type Filters = {
  period: string;
  sources: string[];
  categories: string[];
  sort: string;
  keyword: string;
  startDate?: string;
  endDate?: string;
};

type Trend = {
  keyword: string;
  frequency: number;
  category: string;
  growth: number | null;
  firstSeen?: string;
  lastSeen?: string;
};

type HistoryPoint = { label: string; frequency: number };
type SourceArticle = { title: string; url: string; source: string; date: string; summary?: string };

const SOURCES = ["Telex", "444", "Index"];
const CATEGORIES = ["Politika", "Sport", "Gazdaság", "Tech", "Kultúra", "Egészségügy", "Oktatás", "Közélet"];
const NAVIGATION = [
  ["⌂", "Főoldal", "/"],
  ["⌘", "Insights", "/insights"],
  ["◎", "Kulcsszavak", "/trends"],
  ["⌁", "Trendek", "/trends"],
  ["△", "ÁSZF", "/aszf"],
  ["▧", "Impresszum", "/impresszum"],
  ["♧", "Adatvédelem", "/adatvedelem"],
  ["✉", "Kapcsolat", "/kapcsolat"],
] as const;

function finiteNumber(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeTrend(value: unknown): Trend | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const keyword = String(row.keyword ?? row.topic ?? row.name ?? "").trim();
  if (!keyword) return null;
  const frequency = Math.max(0, finiteNumber(row.freq ?? row.totalCount ?? row.frequency));
  const rawGrowth = Number(row.growth);
  return {
    keyword,
    frequency,
    category: typeof row.category === "string" && row.category.trim() ? row.category.trim() : "Egyéb",
    growth: Number.isFinite(rawGrowth) ? rawGrowth : null,
    firstSeen: typeof row.first_seen === "string" ? row.first_seen : undefined,
    lastSeen: typeof row.last_seen === "string" ? row.last_seen : undefined,
  };
}

function normalizeHistory(value: unknown): HistoryPoint[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    const frequency = finiteNumber(row.freq, -1);
    if (frequency < 0) return [];
    const hour = finiteNumber(row.hour, -1);
    const label = typeof row.day === "string" && row.day
      ? row.day
      : Number.isInteger(hour) && hour >= 0 && hour <= 23 ? `${hour}:00` : "";
    return label ? [{ label, frequency }] : [];
  });
}

function growthPercent(trend: Trend, history: HistoryPoint[]): number | null {
  if (trend.growth !== null) return Math.round(trend.growth * 100);
  if (history.length < 2 || history[0].frequency <= 0) return null;
  return Math.round(((history.at(-1)!.frequency - history[0].frequency) / history[0].frequency) * 100);
}

function relativeTime(value?: string): string {
  if (!value) return "friss adat";
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return "friss adat";
  const hours = Math.max(0, Math.floor((Date.now() - time) / 3_600_000));
  if (hours < 1) return "most";
  if (hours < 24) return `${hours} órája`;
  return `${Math.floor(hours / 24)} napja`;
}

function trendStrength(trend: Trend, maxFrequency: number): number {
  if (maxFrequency <= 0) return 0;
  return Math.max(8, Math.round((trend.frequency / maxFrequency) * 100));
}

function Icon({ children }: { children: React.ReactNode }) {
  return <span className={styles.iconTile} aria-hidden="true">{children}</span>;
}

function Sparkline({ points, tone = "blue" }: { points: HistoryPoint[]; tone?: "blue" | "purple" }) {
  const values = points.map((point) => point.frequency);
  if (values.length < 2) return <div className={styles.sparkEmpty}>Nincs idősor</div>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const path = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 150;
    const y = 39 - ((value - min) / span) * 31;
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
  return (
    <svg className={`${styles.sparkline} ${tone === "purple" ? styles.sparkPurple : ""}`} viewBox="0 0 150 44" role="img" aria-label="Trend idősor">
      <path className={styles.sparkArea} d={`${path} L150 44 L0 44 Z`} />
      <path className={styles.sparkPath} d={path} />
    </svg>
  );
}

function TrendListPreview({ reason }: { reason: "loading" | "error" | "empty" }) {
  const message = reason === "loading"
    ? "A trendadatok betöltése folyamatban van."
    : reason === "error"
      ? "A trendadatok most nem érhetők el. A lista szerkezeti előnézete látható."
      : "A jelenlegi szűrők mellett nincs találat. A lista szerkezeti előnézete látható.";

  return (
    <div className={styles.previewList} data-state="preview">
      <p className={styles.previewNotice} role={reason === "error" ? "alert" : "status"}>{message}</p>
      {Array.from({ length: 8 }, (_, index) => (
        <div className={styles.previewTrendCard} key={index} aria-hidden="true">
          <span className={styles.previewRank}>{index + 1}</span>
          <div className={styles.previewInfo}>
            <i className={styles.previewTitle} />
            <div><i /><i /><i /></div>
            <i className={styles.previewDescription} />
          </div>
          <div className={styles.previewSparkline}><i /><i /><i /><i /><i /><i /><i /></div>
          <div className={styles.previewMetric}><i /><strong /></div>
          <div className={styles.previewStrength}><i /><div>{Array.from({ length: 10 }, (_, bar) => <b key={bar} className={bar < 6 - (index % 3) ? styles.previewStrengthOn : ""} />)}</div></div>
          <span className={styles.previewExpand}>⌄</span>
        </div>
      ))}
    </div>
  );
}

export default function TrendsDashboard() {
  const [filters, setFilters] = useState<Filters>({ period: "30d", sources: [], categories: [], sort: "freq", keyword: "" });
  const [trends, setTrends] = useState<Trend[]>([]);
  const [history, setHistory] = useState<Record<string, HistoryPoint[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sourceKeyword, setSourceKeyword] = useState<string | null>(null);
  const [sourceArticles, setSourceArticles] = useState<SourceArticle[]>([]);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceError, setSourceError] = useState(false);
  const sourceRequest = useRef(0);
  const topSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const keyword = query.get("keyword")?.trim();
    if (keyword) window.queueMicrotask(() => setFilters((current) => ({ ...current, keyword })));
  }, []);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        topSearchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let rejectTimeout: number | undefined;
    const query = new URLSearchParams({ period: filters.period });
    if (filters.sources.length) query.set("sources", filters.sources.join(","));
    if (filters.categories.length) query.set("categories", filters.categories.join(","));
    if (filters.startDate) query.set("startDate", filters.startDate);
    if (filters.endDate) query.set("endDate", filters.endDate);
    window.queueMicrotask(() => {
      if (!active) return;
      setLoading(true);
      setError(null);
      setHistory({});
    });
    const request = fetch(`/api/trends?${query}`, { cache: "no-store", signal: controller.signal });
    const timeout = new Promise<Response>((_, reject) => {
      rejectTimeout = window.setTimeout(() => reject(new Error("trends_timeout")), 12_000);
    });
    Promise.race([request, timeout])
      .then(async (response) => {
        if (!response.ok) throw new Error(`trends_http_${response.status}`);
        const payload: unknown = await response.json();
        if (!payload || typeof payload !== "object") throw new Error("trends_invalid_response");
        const object = payload as { trends?: unknown };
        const rows = Array.isArray(object.trends) ? object.trends : Array.isArray(payload) ? payload : [];
        setTrends(rows.map(normalizeTrend).filter((trend): trend is Trend => trend !== null));
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setTrends([]);
        setError(reason instanceof Error ? reason.message : "trends_load_failed");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; if (rejectTimeout !== undefined) window.clearTimeout(rejectTimeout); controller.abort(); };
  }, [filters.period, filters.sources, filters.categories, filters.startDate, filters.endDate]);

  const filteredTrends = useMemo(() => {
    const needle = filters.keyword.trim().toLocaleLowerCase("hu-HU");
    const result = trends.filter((trend) => !needle || trend.keyword.toLocaleLowerCase("hu-HU").includes(needle));
    return [...result].sort((a, b) => {
      if (filters.sort === "growth") return finiteNumber(b.growth, -Infinity) - finiteNumber(a.growth, -Infinity) || b.frequency - a.frequency || a.keyword.localeCompare(b.keyword, "hu");
      if (filters.sort === "relevance" && needle) return a.keyword.toLocaleLowerCase("hu-HU").indexOf(needle) - b.keyword.toLocaleLowerCase("hu-HU").indexOf(needle) || b.frequency - a.frequency;
      return b.frequency - a.frequency || a.keyword.localeCompare(b.keyword, "hu");
    });
  }, [trends, filters.keyword, filters.sort]);

  const visibleTrends = filteredTrends.slice(0, 12);
  const historyKey = JSON.stringify(visibleTrends.map((trend) => trend.keyword));
  useEffect(() => {
    const keywords = JSON.parse(historyKey) as string[];
    if (keywords.length === 0) return;
    const controller = new AbortController();
    Promise.all(keywords.map(async (keyword) => {
      const query = new URLSearchParams({ keyword, period: filters.period });
      if (filters.sources.length) query.set("sources", filters.sources.join(","));
      if (filters.startDate) query.set("startDate", filters.startDate);
      if (filters.endDate) query.set("endDate", filters.endDate);
      const response = await fetch(`/api/trend-history?${query}`, { cache: "no-store", signal: controller.signal });
      if (!response.ok) return [keyword, []] as const;
      const payload = await response.json() as { history?: unknown };
      return [keyword, normalizeHistory(payload.history)] as const;
    })).then((entries) => { if (!controller.signal.aborted) setHistory(Object.fromEntries(entries)); }).catch(() => undefined);
    return () => controller.abort();
  }, [historyKey, filters.period, filters.sources, filters.startDate, filters.endDate]);

  const totalHits = filteredTrends.reduce((sum, trend) => sum + trend.frequency, 0);
  const growing = filteredTrends.filter((trend) => finiteNumber(trend.growth) > 0).sort((a, b) => finiteNumber(b.growth) - finiteNumber(a.growth)).slice(0, 5);
  const maxFrequency = Math.max(0, ...filteredTrends.map((trend) => trend.frequency));
  const activity = Object.values(history).flatMap((points) => points.map((point) => point.frequency)).slice(-24);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function toggleFilter(key: "sources" | "categories", value: string) {
    setFilters((current) => ({
      ...current,
      [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value],
    }));
  }

  function openSources(keyword: string, period = filters.period) {
    const requestId = ++sourceRequest.current;
    const safePeriod = period === "custom" ? "all" : period;
    setSourceKeyword(keyword);
    setSourceArticles([]);
    setSourceLoading(true);
    setSourceError(false);
    fetch(`/api/trends/trend-sources?keyword=${encodeURIComponent(keyword)}&period=${encodeURIComponent(safePeriod)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`trend_sources_${response.status}`);
        const payload: unknown = await response.json();
        if (!Array.isArray(payload)) throw new Error("trend_sources_invalid_response");
        if (requestId === sourceRequest.current) setSourceArticles(payload as SourceArticle[]);
      })
      .catch(() => { if (requestId === sourceRequest.current) setSourceError(true); })
      .finally(() => { if (requestId === sourceRequest.current) setSourceLoading(false); });
  }

  function closeSources() {
    ++sourceRequest.current;
    setSourceKeyword(null);
  }

  return (
    <div className={styles.dashboard}>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand} aria-label="UTOM főoldal">
          <Image src="/web-app-manifest-512x512.png" width={34} height={34} alt="" />
          <strong>Utom</strong>
        </Link>
        <nav className={styles.nav} aria-label="Fő navigáció">
          {NAVIGATION.map(([icon, label, href], index) => (
            <Link key={`${label}-${index}`} href={href} className={label === "Kulcsszavak" ? styles.navParent : label === "Trendek" ? styles.navActive : ""} aria-current={label === "Trendek" ? "page" : undefined}>
              <span aria-hidden="true">{icon}</span>{label}
            </Link>
          ))}
        </nav>
        <div className={styles.filterDivider} />
        <div className={styles.filters} aria-label="Trendszűrők">
          <h2>Szűrés</h2>
          <label><span>▣ Időszak</span><select value={filters.period} onChange={(event) => updateFilter("period", event.target.value)}><option value="24h">24 óra</option><option value="7d">7 nap</option><option value="30d">30 nap</option><option value="365d">365 nap</option><option value="custom">Egyedi</option></select></label>
          {filters.period === "custom" && <div className={styles.dateInputs}><input aria-label="Kezdődátum" type="date" value={filters.startDate || ""} onChange={(event) => updateFilter("startDate", event.target.value)} /><input aria-label="Záródátum" type="date" value={filters.endDate || ""} onChange={(event) => updateFilter("endDate", event.target.value)} /></div>}
          <fieldset><legend>▤ Források</legend><label className={styles.check}><input type="checkbox" checked={filters.sources.length === 0} onChange={() => updateFilter("sources", [])} />Mind</label>{SOURCES.map((source) => <label className={styles.check} key={source}><input type="checkbox" checked={filters.sources.includes(source)} onChange={() => toggleFilter("sources", source)} />{source}</label>)}</fieldset>
          <fieldset><legend>▰ Kategóriák</legend>{CATEGORIES.map((category, index) => <label className={styles.check} key={category}><input type="checkbox" checked={filters.categories.includes(category)} onChange={() => toggleFilter("categories", category)} /><i style={{ "--filter-color": ["#ff4f79", "#24d7ff", "#0be6ad", "#9f62ff", "#ffbf3f", "#22d3a7", "#38bdf8", "#f472d0"][index] } as React.CSSProperties} />{category}</label>)}</fieldset>
          <label><span>↕ Rendezés</span><select value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value)}><option value="freq">Gyakoriság</option><option value="growth">Növekedés</option><option value="relevance">Relevancia</option></select></label>
          <label><span>⌕ Kulcsszó kereső</span><input type="search" value={filters.keyword} onChange={(event) => updateFilter("keyword", event.target.value)} placeholder="Írj be egy kulcsszót..." /></label>
        </div>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <label className={styles.globalSearch}><span aria-hidden="true">⌕</span><input ref={topSearchRef} aria-label="Kulcsszó, téma vagy forrás keresése" value={filters.keyword} onChange={(event) => updateFilter("keyword", event.target.value)} placeholder="Kulcsszó, téma vagy forrás keresése..." /><kbd>Ctrl + K</kbd></label>
          <div className={styles.topActions}><span className={styles.periodDisplay}>▣ {filters.period === "custom" ? `${filters.startDate || "…"} – ${filters.endDate || "…"}` : `Utolsó ${filters.period}`}</span><button type="button" aria-label="Értesítések">♧</button><span className={styles.avatar}><Image src="/web-app-manifest-512x512.png" width={32} height={32} alt="Profil" /></span></div>
        </header>

        <div className={styles.content}>
          <main className={styles.mainColumn}>
            <section className={styles.hero}>
              <div className={styles.heroTitle}><span className={styles.flame} aria-hidden="true">🔥</span><div><h1>Trendek</h1><p>Valós idejű témák és kulcsszavak a magyar online médiában</p></div></div>
              <TrendsHeroGlobe />
              <div className={styles.heroCopy}><strong>Figyeljük a webet.<br/><em>Te lásd a lényeget.</em></strong><p>Valós idejű elemzések, megbízható források, mélyebb összefüggések.</p></div>
            </section>

            <section className={styles.stats} aria-label="Trendstatisztikák">
              <article><Icon>▤</Icon><div><span>Összes találat</span><strong>{totalHits.toLocaleString("hu-HU")}</strong><small>az aktuális időszakban</small></div></article>
              <article><Icon>↗</Icon><div><span>Aktív kulcsszavak</span><strong>{filteredTrends.length.toLocaleString("hu-HU")}</strong><small>megfigyelt témák száma</small></div></article>
              <article><Icon>♧</Icon><div><span>Források</span><strong>{filters.sources.length || SOURCES.length}</strong><small>{filters.sources.length ? filters.sources.join(", ") : "Telex, 444, Index"}</small></div></article>
              <article><Icon>ϟ</Icon><div><span>Új trendek</span><strong>—</strong><small>külön klasszifikáció szükséges</small></div></article>
            </section>

            <div className={styles.topicToolbar}>
              <div className={styles.chips}><button className={styles.chipActive} type="button" onClick={() => updateFilter("keyword", "")}>Összes téma</button>{filteredTrends.slice(0, 7).map((trend) => <button type="button" key={trend.keyword} onClick={() => updateFilter("keyword", trend.keyword)}>{trend.keyword}<b>{trend.frequency}</b></button>)}</div>
              <select aria-label="Trendek rendezése" value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value)}><option value="freq">Rendezés: Népszerűség</option><option value="growth">Rendezés: Növekedés</option><option value="relevance">Rendezés: Relevancia</option></select>
            </div>

            <section className={styles.trendList} aria-live="polite" aria-busy={loading}>
              {loading && <TrendListPreview reason="loading" />}
              {!loading && error && <TrendListPreview reason="error" />}
              {!loading && !error && visibleTrends.length === 0 && <TrendListPreview reason="empty" />}
              {!loading && !error && visibleTrends.map((trend, index) => {
                const points = history[trend.keyword] || [];
                const growth = growthPercent(trend, points);
                const strength = trendStrength(trend, maxFrequency);
                const isOpen = expanded === trend.keyword;
                return <article key={`${trend.keyword}-${trend.category}`} className={`${styles.trendCard} ${index === 0 ? styles.trendCardFeatured : ""}`}>
                  <span className={styles.rank}>{index + 1}</span>
                  <div className={styles.trendInfo}><div className={styles.keywordRow}><h3>{trend.keyword}</h3><span className={styles.category}>{trend.category}</span></div><div className={styles.sourceTags}>{(filters.sources.length ? filters.sources : ["Minden forrás"]).map((source) => <span key={source}>{source}</span>)}<button type="button" onClick={() => openSources(trend.keyword)}>Cikkek</button></div><p>{trend.keyword} említéseinek aktivitása és alakulása a kiválasztott magyar online forrásokban.</p></div>
                  <button type="button" className={styles.sparkButton} onClick={() => setExpanded(isOpen ? null : trend.keyword)} aria-expanded={isOpen} aria-label={`${trend.keyword} grafikon részletei`}><Sparkline points={points} tone={index % 2 ? "purple" : "blue"} /></button>
                  <div className={styles.hitStat}><span>Összes találat</span><strong>{trend.frequency.toLocaleString("hu-HU")}</strong><b className={growth !== null && growth < 0 ? styles.negative : ""}>{growth === null ? "—" : `${growth >= 0 ? "+" : ""}${growth}%`}</b></div>
                  <div className={styles.strength}><span>Trend erősség</span><div>{Array.from({ length: 10 }, (_, bar) => <i key={bar} className={bar < Math.ceil(strength / 10) ? styles.strengthOn : ""} />)}<b>{strength}</b></div></div>
                  <button type="button" className={styles.expandButton} onClick={() => setExpanded(isOpen ? null : trend.keyword)} aria-expanded={isOpen} aria-label={`${trend.keyword} részletei`}>⌄</button>
                  {isOpen && <div className={styles.expandedRow}><span>Első észlelés: {trend.firstSeen ? new Date(trend.firstSeen).toLocaleString("hu-HU") : "nincs adat"}</span><span>Legutóbbi aktivitás: {relativeTime(trend.lastSeen)}</span><button type="button" onClick={() => openSources(trend.keyword)}>Kapcsolódó cikkek megnyitása →</button></div>}
                </article>;
              })}
            </section>
          </main>

          <aside className={styles.rightRail}>
            <section className={`${styles.sideCard} ${styles.growingCard}`}><header><span>↗</span><div><h2>Top növekvő témák</h2><p>Az aktuális időszakban</p></div></header>{growing.length ? <ol>{growing.map((trend, index) => <li key={trend.keyword}><i>{index + 1}</i><button type="button" onClick={() => updateFilter("keyword", trend.keyword)}>{trend.keyword}</button><b>↑ +{Math.round(finiteNumber(trend.growth) * 100)}%</b></li>)}</ol> : <ol className={styles.sidePreview} data-state="preview">{Array.from({ length: 5 }, (_, index) => <li key={index}><i>{index + 1}</i><span /><b>—</b></li>)}</ol>}</section>
            <section className={`${styles.sideCard} ${styles.newTopicsCard}`}><header><span>✦</span><div><h2>Új témák</h2><p>Frissen megjelent kulcsszavak</p></div></header><ul className={styles.sidePreview} data-state="preview">{Array.from({ length: 5 }, (_, index) => <li key={index}><em>Új</em><span /><time>—</time></li>)}</ul><p className={styles.compactFallback}>Nincs hiteles új-téma klasszifikáció.</p></section>
            <section className={styles.sideCard}><header><span>◉</span><div><h2>Források megoszlása</h2><p>Hiteles aggregált adatra vár</p></div></header><div className={styles.sourceEmpty}><div className={styles.emptyDonut}><span>—</span></div><p>A jelenlegi trend API nem ad forrásonkénti darabszámot, ezért nem jelenítünk meg becsült arányokat.</p></div></section>
            <section className={styles.sideCard}><header><span>⌁</span><div><h2>Trend aktivitás</h2><p>Idősorok összesített intenzitása</p></div></header>{activity.length ? <div className={styles.activityBars}>{activity.map((value, index) => <i key={index} style={{ height: `${Math.max(14, Math.min(100, value * 8))}%` }} />)}</div> : <div className={`${styles.activityBars} ${styles.activityPreview}`} data-state="preview">{Array.from({ length: 18 }, (_, index) => <i key={index} />)}</div>}</section>
          </aside>
        </div>
      </section>

      <TrendSourcesModal key={`${sourceKeyword ?? "closed"}-${filters.period}`} show={sourceKeyword !== null} onHide={closeSources} keyword={sourceKeyword || ""} sources={sourceArticles} defaultPeriod={filters.period === "custom" ? "all" : filters.period} onPeriodChange={openSources} loading={sourceLoading} error={sourceError} />
    </div>
  );
}
