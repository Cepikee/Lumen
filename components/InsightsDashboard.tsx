"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell, PieChart, Pie } from "recharts";
import { useUserStore } from "@/store/useUserStore";
import { useInsights } from "@/hooks/useInsights";
import { useTimeseriesAll } from "@/hooks/useTimeseriesAll";
import { useForecast } from "@/hooks/useForecast";
import InsightsEmptyState from "./InsightsEmptyState";
import ForecastStatus from "./ForecastStatus";
import WSourceCategoryDistribution from "./WSourceCategoryDistribution";
import WSourceDuplication from "./WSourceDuplication";
import WSourceSpeedIndexLeaderboard from "./WSourceSpeedIndexLeaderboard";
import WSourceClickbait from "./WSourceClickbait";
import WSourceClickbaitRatio from "./WSourceClickbaitRatio";
import WhatHappenedTodaySourceActivity from "./WhatHappenedTodaySourceActivity";
import { rows, count, sentimentCounts, activityRows, clickbaitRows, categorySeries } from "@/lib/insights-dashboard";
import styles from "./InsightsDashboard.module.css";

type Period = "24h" | "7d" | "30d" | "90d";
const colors = ["#0787ff", "#8b5cf6", "#ff7a32", "#21d99b", "#63d4ec", "#ee79ae", "#f4c35c", "#92a8cf"];
const tooltip = { background: "#0c2034", border: "1px solid #295173", color: "#eef6ff", borderRadius: 8, fontSize: 12 };
async function fetcher(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`insights_${response.status}`);
  const value = await response.json();
  if (!value || typeof value !== "object" || value.success === false) throw new Error("invalid_insights_response");
  return value;
}
function useMetric(path: string) { return useSWR(`/api/premium-insights/${path}`, fetcher, { keepPreviousData: false, revalidateOnFocus: false, dedupingInterval: 60000 }); }
function Glyph({ kind = 0 }: { kind?: number }) {
  const paths = ["M4 18l5-12 6 10 5-13M15 3h5v5", "M5 3h11l3 3v15H5zM8 8h6M8 12h8M8 16h5", "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 4a4 4 0 0 1 0 7M22 21v-2a4 4 0 0 0-3-4", "M3 3h8l10 10-8 8L3 11zM7 7h.01", "M8 14s1 3 4 3 4-3 4-3M8 9h.01M16 9h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0"];
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind % paths.length]} /></svg>;
}
function Card({ title, info, scope, children, className = "" }: { title: string; info?: string; scope?: string; children: ReactNode; className?: string }) {
  return <section className={`${styles.card} ${className}`}><div className={styles.cardHeader}><h2>{title}</h2>{info && <button type="button" className={styles.info} aria-label={info} title={info}>ⓘ</button>}{scope && <span className={styles.scope}>{scope}</span>}</div>{children}</section>;
}
function State({ loading, error, hasData, period = "24h", children }: { loading?: boolean; error?: unknown; hasData: boolean; period?: string; children: ReactNode }) {
  if (loading) return <div className={styles.skeleton} role="status" aria-label="Adatok betöltése" />;
  if (error) return <p role="alert" className={styles.empty}>Az adat jelenleg nem elérhető.</p>;
  if (!hasData) return <InsightsEmptyState period={period} />;
  return <>{children}</>;
}
export default function InsightsDashboard() {
  const user = useUserStore(s => s.user);
  const loading = useUserStore(s => s.loading);
  if (loading) return <div className={styles.page}><div className={styles.shell}><div className={styles.skeleton} role="status">Profil betöltése…</div></div></div>;
  if (!user?.isPremium) return <div className={styles.page}><div className={styles.shell}><Card title="Prémium tartalom"><p>Az Insights elemzéseihez Prémium hozzáférés szükséges.</p><Link href="/premium">Prémium tudnivalók →</Link></Card></div></div>;
  return <DashboardContent />;
}
function DashboardContent() {
  const [period, setPeriod] = useState<Period>("24h");
  const [sort, setSort] = useState("Legfrissebb");
  const insights = useInsights(period, sort);
  const series = useTimeseriesAll(period);
  const forecast = useForecast();
  const heatmap = useMetric("heatmap");
  const spikes = useMetric("spike-detection");
  const keywords = useMetric("trending-keywords");
  const sentiment = useMetric("sentiment/today");
  const categorySentiment = useMetric("sentiment/by-category");
  const hourly = useMetric("sentiment/timeline");
  const clickbait = useMetric(`clickbait?period=${period}`);
  const categories = rows(insights.data?.categories);
  const articles = categories.reduce((total, c) => total + count(c.articleCount), 0);
  const sources = new Set(categories.flatMap(c => rows(c.ringSources).map(s => s.label).filter(v => typeof v === "string" && v && v !== "ismeretlen")));
  const keywordRows = rows(keywords.data?.keywords).filter(k => typeof k.keyword === "string" && count(k.count) > 0);
  const sentimentData = sentimentCounts(sentiment.data);
  const activity = activityRows(heatmap.data);
  const spikeRows = rows(spikes.data?.spikes).filter(s => typeof s.label === "string" && count(s.value) > 0);
  const chart = categorySeries(series.data?.categories, period);
  const clickbaitData = clickbaitRows(clickbait.data);
  const negativeRows = Object.entries(categorySentiment.data?.categories ?? {}).flatMap(([category, value]) => {
    const s = sentimentCounts(value as Record<string, unknown>);
    return s.total ? [{ category, ratio: s.values[2] / s.total * 100 }] : [];
  });
  const hourlyRows = rows(hourly.data?.timeline).filter(r => Number.isInteger(Number(r.hour)) && Number(r.hour) >= 0 && Number(r.hour) < 24).map(r => ({ hour: Number(r.hour), positive: count(r.positive), negative: count(r.negative), neutral: count(r.neutral) }));
  const forecasts = Object.entries(forecast.data?.forecast ?? {}).flatMap(([category, value]) => rows(value).filter(p => p.date && Number.isFinite(new Date(p.date).getTime()) && Number.isFinite(Number(p.predicted))).map(p => ({ category, date: p.date, predicted: Number(p.predicted) })));
  const kpis = [
    { title: "Feldolgozott hírek", value: !insights.error && articles > 0 ? articles.toLocaleString("hu-HU") : "—", note: `${period} · feldolgozott összefoglalók`, loading: insights.loading, error: insights.error },
    { title: "Aktív források", value: !insights.error && sources.size ? String(sources.size) : "—", note: `${period} · egyedi források`, loading: insights.loading, error: insights.error },
    { title: "Kiemelt kulcsszavak", value: !keywords.error && keywordRows.length ? String(keywordRows.length) : "—", note: "Ma · legalább 3 említés", loading: keywords.isLoading, error: keywords.error },
    { title: "Átlagos hangulat", value: !sentiment.error && sentimentData.average !== null ? sentimentData.average.toFixed(2) : "—", note: "Ma · Budapest · −1 és +1 között", loading: sentiment.isLoading, error: sentiment.error },
  ];
  return <div className={styles.page}><div className={styles.shell}>
    <header className={styles.heading}><div className={styles.title}><span className={styles.pageIcon}><Glyph /></span><div><h1>Insights</h1><p>Kategória trendek, forráseloszlás és hangulatelemzés a magyar hírekben.</p></div></div><div className={styles.toolbar}>
      <div className={styles.pills} role="group" aria-label="Időszak">{(["24h", "7d", "30d", "90d"] as Period[]).map(p => <button type="button" key={p} aria-pressed={period === p} onClick={() => setPeriod(p)}>{p}</button>)}</div>
      <div className={`${styles.pills} ${styles.sort}`} role="group" aria-label="Rendezés">{["Legfrissebb", "Növekvő", "Legtöbb forrás"].map(s => <button type="button" key={s} aria-pressed={sort === s} onClick={() => setSort(s)}>{s}</button>)}</div>
    </div></header>
    <div className={styles.grid}>
      {kpis.map((k, i) => <section key={k.title} className={`${styles.card} ${styles.kpi}`}><span className={styles.kpiIcon} style={{ color: colors[i], borderColor: colors[i] }}><Glyph kind={i + 1} /></span><div><h2>{k.title}</h2><strong>{k.loading ? "…" : k.value}</strong><p>{k.error ? "Az adat jelenleg nem elérhető." : k.note}</p></div></section>)}
      <Card title="Mi történt ma valójában?" scope="Ma · Budapest" className={styles.today}>
        <div className={styles.todayColumns}>
          <div><span className={styles.miniIcon}><Glyph kind={1} /></span><h3>Kategóriák aktivitása</h3><State loading={heatmap.isLoading} error={heatmap.error} hasData={activity.length > 0} period="today"><p>{activity.length} aktív kategória.</p><p>{activity.reduce((s, c) => s + c.values.reduce((n: number, v: { value: number }) => n + v.value, 0), 0)} feldolgozott hír a mai nap során.</p></State></div>
          <div><span className={styles.miniIcon}><Glyph /></span><h3>Kiemelkedő esemény</h3><State loading={spikes.isLoading} error={spikes.error} hasData={spikeRows.length > 0} period="today"><ul>{spikeRows.map((s, i) => <li key={i}>{s.label} · {s.value} hír ({s.hour}:00)</li>)}</ul></State></div>
          <div><span className={styles.miniIcon}><Glyph kind={3} /></span><h3>Felkapott kulcsszavak</h3><State loading={keywords.isLoading} error={keywords.error} hasData={keywordRows.length > 0} period="today"><div className={styles.tags}>{keywordRows.map(k => <Link key={k.keyword} href="/trends">{k.keyword} <small>{k.count}×</small></Link>)}</div></State></div>
        </div>
      </Card>
      <Card title="AI előrejelzés" scope="BETA" className={styles.forecast}><div className={styles.forecastContent}><div className={styles.orb} aria-hidden="true" /><div>{forecast.error ? <p role="alert">Az előrejelzés jelenleg nem elérhető.</p> : forecast.isLoading ? <p>Előrejelzés betöltése…</p> : forecasts.length ? <><strong>{forecasts.length} előrejelzési pont</strong><p>A kategóriák várható aktivitása.</p></> : <><strong>Még nincs megjeleníthető előrejelzés.</strong><p>A futás állapota és az elérhető eredmények itt követhetők.</p></>}<ForecastStatus /></div></div>{forecasts.length > 0 && <details><summary>Előrejelzési adatok</summary><ul className={styles.scrollList}>{forecasts.map((p, i) => <li key={i}>{p.category} · {new Date(p.date).toLocaleString("hu-HU")} · {p.predicted}</li>)}</ul></details>}</Card>
      <Card title="Kategória trendek" scope={period} info="Feldolgozott hírek száma időpontonként, kategóriánként." className={styles.third}><State loading={series.loading} error={series.error} hasData={chart.points.some(p => Object.keys(p).some(k => k !== "time" && count(p[k]) > 0))} period={period}><div className={styles.chart}><ResponsiveContainer width="100%" height="100%"><LineChart data={chart.points}><CartesianGrid stroke="#183653" strokeDasharray="3 4" /><XAxis dataKey="time" tickFormatter={v => period === "24h" ? new Date(v).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" }) : new Date(v).toLocaleDateString("hu-HU", { month: "short", day: "numeric" })} tick={{ fill: "#a8c1dc", fontSize: 10 }} minTickGap={32} /><YAxis width={28} allowDecimals={false} tick={{ fill: "#a8c1dc", fontSize: 10 }} /><Tooltip contentStyle={tooltip} labelFormatter={v => new Date(Number(v)).toLocaleString("hu-HU")} />{chart.categories.map((c, i) => <Line key={c} dataKey={`v${i}`} name={c} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} isAnimationActive={false} />)}</LineChart></ResponsiveContainer></div><div className={styles.legend}>{chart.categories.map((c, i) => <span key={c}><i style={{ background: colors[i % colors.length] }} />{c}</span>)}</div></State></Card>
      <Card title="Források átlagos clickbait pontszáma" scope={period} info="Cikkenkénti pontszámok forrásonkénti átlaga; nem minőségi rangsor." className={styles.third}><State loading={clickbait.isLoading} error={clickbait.error} hasData={clickbaitData.length > 0} period={period}><div className={styles.chart}><ResponsiveContainer width="100%" height="100%"><BarChart data={clickbaitData.slice(0, 7)} layout="vertical" margin={{ right: 20, left: 0 }}><XAxis type="number" domain={[0, 100]} tick={{ fill: "#a8c1dc", fontSize: 10 }} /><YAxis dataKey="name" type="category" width={82} tick={{ fill: "#c9dbee", fontSize: 11 }} /><Tooltip contentStyle={tooltip} /><Bar barSize={18} dataKey="score" name="Pontszám" radius={[0, 4, 4, 0]} isAnimationActive={false}>{clickbaitData.slice(0, 7).map(r => <Cell key={r.name} fill={r.score >= 60 ? "#ff4d57" : r.score >= 45 ? "#ff7a32" : "#348aff"} />)}</Bar></BarChart></ResponsiveContainer></div>{clickbaitData.length > 7 && <details><summary>Összes forrás ({clickbaitData.length})</summary><ul className={styles.scrollList}>{clickbaitData.map(r => <li key={r.name}>{r.name}: {r.score.toFixed(1)}</li>)}</ul></details>}</State></Card>
      <Card title="Napi hangulatmegoszlás" scope="Ma" className={styles.third}><State loading={sentiment.isLoading} error={sentiment.error} hasData={sentimentData.total > 0} period="today"><div className={styles.donutRow}><div className={styles.donut}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={sentimentData.values.map((value, i) => ({ value, name: ["Pozitív", "Semleges", "Negatív"][i] }))} dataKey="value" innerRadius="65%" outerRadius="95%" stroke="none" isAnimationActive={false}>{["#1dd78a", "#98b9e9", "#ff4d57"].map(c => <Cell key={c} fill={c} />)}</Pie><Tooltip contentStyle={tooltip} /></PieChart></ResponsiveContainer><div className={styles.donutLabel}><strong>{sentimentData.total}</strong><span>hír</span></div></div><div className={styles.donutLegend}>{["Pozitív", "Semleges", "Negatív"].map((label, i) => <div key={label}><i style={{ background: ["#1dd78a", "#98b9e9", "#ff4d57"][i] }} />{label}<strong>{(sentimentData.values[i] / sentimentData.total * 100).toFixed(0)}%</strong></div>)}</div></div></State></Card>
      <Card title="Kategóriák aktivitása óránként" scope="Ma" className={styles.five}><State loading={heatmap.isLoading} error={heatmap.error} hasData={activity.length > 0} period="today"><div className={styles.heatmap}>{activity.map(c => <div className={styles.heatRow} key={c.category}><span>{c.category}</span><div>{c.values.map((v: { hour: number; value: number }) => <i key={v.hour} title={`${c.category}, ${v.hour}:00: ${v.value} hír`} style={{ background: v.value ? `rgba(0,153,255,${.25 + .75 * v.value / Math.max(...c.values.map((x: { value: number }) => x.value))})` : "#122b47" }} />)}</div></div>)}<div className={styles.heatTicks}><span>0:00</span><span>6:00</span><span>12:00</span><span>18:00</span><span>23:00</span></div></div></State></Card>
      <Card title="Kategóriahangulat – negatív arány" scope="Ma" className={styles.three}><State loading={categorySentiment.isLoading} error={categorySentiment.error} hasData={negativeRows.length > 0} period="today"><div className={styles.ratios}>{negativeRows.map(c => <div key={c.category}><span>{c.category}</span><meter min={0} max={100} value={c.ratio} aria-label={`${c.category}: negatív arány`} /><strong>{c.ratio.toFixed(0)}%</strong></div>)}</div></State></Card>
      <Card title="Hangulat időbeli alakulása (óra)" scope="Ma" info="Óránkénti pozitív és negatív hírszám, budapesti idő szerint." className={styles.third}><State loading={hourly.isLoading} error={hourly.error} hasData={hourlyRows.some(r => r.positive + r.neutral + r.negative > 0)} period="today"><div className={styles.chart}><ResponsiveContainer width="100%" height="100%"><LineChart data={hourlyRows}><CartesianGrid stroke="#183653" strokeDasharray="3 4" /><XAxis dataKey="hour" tickFormatter={v => `${v}:00`} tick={{ fill: "#a8c1dc", fontSize: 10 }} /><YAxis width={28} allowDecimals={false} tick={{ fill: "#a8c1dc", fontSize: 10 }} /><Tooltip contentStyle={tooltip} /><Line dataKey="positive" name="Pozitív" stroke="#1dd78a" dot={false} isAnimationActive={false} /><Line dataKey="negative" name="Negatív" stroke="#ff4d57" dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div><div className={styles.legend}><span><i style={{ background: "#1dd78a" }} />Pozitív</span><span><i style={{ background: "#ff4d57" }} />Negatív</span></div></State></Card>
    </div>
    <section className={styles.categoryLinks} aria-label="Kategóriák részletes elemzése"><h2>Kategóriák részletesen</h2><State loading={insights.loading} error={insights.error} hasData={categories.some(c => c.category && count(c.articleCount) > 0)} period={period}><div className={styles.tags}>{categories.filter(c => typeof c.category === "string" && c.category.trim() && count(c.articleCount) > 0).map(c => <Link key={c.category} href={`/insights/category/${encodeURIComponent(c.category)}`}>{c.category} <small>{c.articleCount} hír · {c.sourceDiversity} forrás</small></Link>)}</div></State></section>
    <details className={styles.more}><summary>További forrásmetrikák és részletes elemzések</summary><div className={styles.detailsGrid}><Card title="Források kategóriaeloszlása" scope={period}><WSourceCategoryDistribution dark period={period} /></Card><Card title="Duplikáció" scope={period}><WSourceDuplication dark period={period} /></Card><Card title="Clickbait részletesen" scope={period}><WSourceClickbait dark period={period} /></Card><Card title="Clickbait arány" scope={period}><WSourceClickbaitRatio dark period={period} /></Card><Card title="Speed Index" scope="Teljes időszak"><WSourceSpeedIndexLeaderboard dark /></Card><Card title="Forrásaktivitás" scope="Ma"><WhatHappenedTodaySourceActivity dark /></Card></div></details>
  </div></div>;
}
