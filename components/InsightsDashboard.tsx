"use client";
import { Component, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { CategoryTrendChart, ClickbaitChart, SentimentDonut, ActivityHeatmap, CategorySentimentChart, SentimentTimelineChart } from "./InsightsCharts";
import { useUserStore } from "@/store/useUserStore";
import { useInsights } from "@/hooks/useInsights";
import { useTimeseriesAll } from "@/hooks/useTimeseriesAll";
import { useForecast } from "@/hooks/useForecast";
import InsightsEmptyState from "./InsightsEmptyState";
import UtomModal from "@/components/UtomModal";

import WSourceCategoryDistribution from "./WSourceCategoryDistribution";
import WSourceDuplication from "./WSourceDuplication";
import WSourceSpeedIndexLeaderboard from "./WSourceSpeedIndexLeaderboard";
import WSourceClickbait from "./WSourceClickbait";
import WSourceClickbaitRatio from "./WSourceClickbaitRatio";
import WhatHappenedTodaySourceActivity from "./WhatHappenedTodaySourceActivity";
import { rows, count, sentimentCounts, activityRows, clickbaitRows, categorySeries, categorySentiments, sentimentSeries, forecastPoints, timeLabel, timestamp } from "@/lib/insights-dashboard";
import styles from "./InsightsDashboard.module.css";

type Period = "24h" | "7d" | "30d" | "90d";
const colors = ["#0787ff", "#8b5cf6", "#ff7a32", "#21d99b", "#63d4ec", "#ee79ae", "#f4c35c", "#92a8cf"];

async function fetcher(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`insights_${response.status}`);
  const value = await response.json();
  if (!value || typeof value !== "object" || Array.isArray(value) || value.success === false) throw new Error("invalid_insights_response");
  const path = url.split("?")[0];
  const arrayKey = path.endsWith("/trending-keywords") ? "keywords" : path.endsWith("/timeline") ? "timeline" : path.endsWith("/clickbait") ? "sources" : path.endsWith("/spike-detection") ? "spikes" : null;
  if (arrayKey && !Array.isArray(value[arrayKey])) throw new Error("invalid_insights_response");
  if (path.endsWith("/by-category") && (!value.categories || typeof value.categories !== "object" || Array.isArray(value.categories))) throw new Error("invalid_insights_response");
  return value;
}
function useMetric(path: string) { return useSWR(`/api/premium-insights/${path}`, fetcher, { keepPreviousData: false, revalidateOnFocus: false, dedupingInterval: 60000 }); }
function Glyph({ kind = 0 }: { kind?: number }) {
  const paths = ["M4 18l5-12 6 10 5-13M15 3h5v5", "M5 3h11l3 3v15H5zM8 8h6M8 12h8M8 16h5", "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 4a4 4 0 0 1 0 7M22 21v-2a4 4 0 0 0-3-4", "M3 3h8l10 10-8 8L3 11zM7 7h.01", "M8 14s1 3 4 3 4-3 4-3M8 9h.01M16 9h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0"];
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind % paths.length]} /></svg>;
}
class PanelBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p role="alert" className={styles.empty}>Az adatok jelenleg nem érhetők el.</p> : this.props.children; }
}
function Card({ title, info, scope, children, className = "" }: { title: string; info?: string; scope?: string; children: ReactNode; className?: string }) {
  const [openInfo, setOpenInfo] = useState(false);
  return <section className={`${styles.card} ${className}`}>
    <div className={styles.cardHeader}>
      <h2>{title}</h2>
      {info && <button type="button" className={styles.info} aria-label={`${title} – információ`} title="Magyarázat" aria-expanded={openInfo} onClick={() => setOpenInfo(true)}>ⓘ</button>}
      {scope && <span className={styles.scope}>{scope}</span>}
    </div>
    <PanelBoundary>{children}</PanelBoundary>
    {info && <UtomModal show={openInfo} onClose={() => setOpenInfo(false)} title={`${title} – mit mutat?`}>
      <p className={styles.infoText}>{info}</p>
    </UtomModal>}
  </section>;
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requestedPeriod = searchParams.get("period");
  const period: Period = requestedPeriod === "7d" || requestedPeriod === "30d" || requestedPeriod === "90d" ? requestedPeriod : "24h";
  const [sort, setSort] = useState("Legfrissebb");
  useEffect(() => {
    if (requestedPeriod) return;
    const saved = window.localStorage.getItem("utom.insights.period");
    if (saved !== "7d" && saved !== "30d" && saved !== "90d") return;
    const query = new URLSearchParams(searchParams.toString());
    query.set("period", saved);
    router.replace(`${pathname}?${query.toString()}`, { scroll: false });
  }, [pathname, requestedPeriod, router, searchParams]);
  const changePeriod = (nextPeriod: Period) => {
    window.localStorage.setItem("utom.insights.period", nextPeriod);
    const query = new URLSearchParams(searchParams.toString());
    query.set("period", nextPeriod);
    router.replace(`${pathname}?${query.toString()}`, { scroll: false });
  };
  const insights = useInsights(period, sort);
  const series = useTimeseriesAll(period);
  const forecast = useForecast();
  const heatmap = useMetric("heatmap");
  const spikes = useMetric("spike-detection");
  const todayKeywords = useMetric("trending-keywords");
  const keywords = useMetric(`trending-keywords?period=${period}`);
  const sentiment = useMetric(`sentiment/today?period=${period}`);
  const categorySentiment = useMetric(`sentiment/by-category?period=${period}`);
  const hourly = useMetric(`sentiment/timeline?period=${period}`);
  const clickbait = useMetric(`clickbait?period=${period}`);
  const categories = rows(insights.data?.categories);
  const articles = categories.reduce((total, c) => total + count(c.articleCount), 0);
  const sources = new Set(categories.flatMap(c => rows(c.ringSources).map(s => s.label).filter(v => typeof v === "string" && v && v !== "ismeretlen")));
  const todayKeywordRows = rows(todayKeywords.data?.keywords).filter(k => typeof k.keyword === "string" && count(k.count) > 0);
  const keywordRows = rows(keywords.data?.keywords).filter(k => typeof k.keyword === "string" && count(k.count) > 0);
  const sentimentData = sentimentCounts(sentiment.data);
  const activity = activityRows(heatmap.data);
  const spikeRows = rows(spikes.data?.spikes).filter(s => typeof s.label === "string" && count(s.value) > 0);
  const chart = categorySeries(series.data?.categories, period);
  const clickbaitData = clickbaitRows(clickbait.data);
  const negativeRows = categorySentiments(categorySentiment.data?.categories);
  const hourlyRows = sentimentSeries(hourly.data?.timeline, period);
  const forecasts = forecastPoints(forecast.data?.forecast);
  const forecastStatus = useSWR("/api/forecast-status", fetcher, { refreshInterval: 10000, revalidateOnFocus: false });
  const forecastState = forecast.error || forecastStatus.error || forecastStatus.data?.status === "error" ? "error"
    : forecastStatus.data?.status === "running" ? "running" : forecasts.length ? "ready" : "empty";
  const forecastLabel = { error: "Az előrejelzés jelenleg nem elérhető.", running: "Elemzés folyamatban", ready: "Előrejelzés elkészült", empty: "Még nincs elkészült előrejelzés" }[forecastState];
  const topActivity = [...activity].map(c=>({category:c.category,total:c.values.reduce((sum: number,v: {value:number})=>sum+v.value,0)})).sort((a,b)=>b.total-a.total);
  const kpis = [
    { title: "Feldolgozott hírek", value: !insights.error && articles > 0 ? articles.toLocaleString("hu-HU") : "—", note: `${period} · feldolgozott összefoglalók`, loading: insights.loading, error: insights.error },
    { title: "Aktív források", value: !insights.error && sources.size ? String(sources.size) : "—", note: `${period} · egyedi források`, loading: insights.loading, error: insights.error },
    { title: "Kiemelt kulcsszavak", value: !keywords.error && keywordRows.length ? String(count(keywords.data?.total ?? keywordRows.length)) : "—", note: `${period} · legalább 3 említés`, loading: keywords.isLoading, error: keywords.error },
    { title: "Átlagos hangulat", value: !sentiment.error && sentimentData.average !== null ? sentimentData.average.toFixed(2) : "—", note: `${period} · −1 és +1 között`, loading: sentiment.isLoading, error: sentiment.error },
  ];
  return <div className={styles.page}><div className={styles.shell}>
    <header className={styles.heading}><div className={styles.title}><span className={styles.pageIcon}><Glyph /></span><div><h1>Insights</h1><p>Kategória trendek, forráseloszlás és hangulatelemzés a magyar hírekben.</p></div></div><div className={styles.toolbar}>
      <div className={styles.pills} role="group" aria-label="Időszak">{(["24h", "7d", "30d", "90d"] as Period[]).map(p => <button type="button" key={p} aria-pressed={period === p} onClick={() => changePeriod(p)}>{p}</button>)}</div>
      <div className={`${styles.pills} ${styles.sort}`} role="group" aria-label="Rendezés">{["Legfrissebb", "Növekvő", "Legtöbb forrás"].map(s => <button type="button" key={s} aria-pressed={sort === s} onClick={() => setSort(s)}>{s}</button>)}</div>
    </div></header>
    <div className={styles.grid} key={period}>
      {kpis.map((k, i) => <section key={k.title} className={`${styles.card} ${styles.kpi}`}><span className={styles.kpiIcon} style={{ color: colors[i], borderColor: colors[i] }}><Glyph kind={i + 1} /></span><div><h2>{k.title}</h2><strong>{k.loading ? "…" : k.value}</strong><p>{k.error ? "Az adat jelenleg nem elérhető." : k.note}</p></div></section>)}
      <Card title="Mi történt ma valójában?" scope="Ma · Budapest" className={styles.today}>
        <div className={styles.todayColumns}>
          <div><span className={styles.miniIcon}><Glyph kind={1} /></span><h3>Kategóriák aktivitása</h3><State loading={heatmap.isLoading} error={heatmap.error} hasData={activity.length > 0} period="today"><ul>{topActivity.slice(0,3).map(c=><li key={c.category}><strong>{c.category}</strong> · {c.total} hír</li>)}</ul></State></div>
          <div><span className={styles.miniIcon}><Glyph /></span><h3>Kiemelkedő esemény</h3><State loading={spikes.isLoading} error={spikes.error} hasData={spikeRows.length > 0} period="today"><ul>{spikeRows.map((s, i) => <li key={i}>{s.label} · {s.value} hír ({s.hour}:00)</li>)}</ul></State></div>
          <div><span className={styles.miniIcon}><Glyph kind={3} /></span><h3>Felkapott kulcsszavak</h3><State loading={todayKeywords.isLoading} error={todayKeywords.error} hasData={todayKeywordRows.length > 0} period="today"><div className={styles.tags}>{todayKeywordRows.slice(0,5).map(k => <Link key={k.keyword} href="/trends">{k.keyword} <small>{k.count}×</small></Link>)}</div></State></div>
        </div>
      </Card>
      <Card title="AI előrejelzés" scope="Automatikus trendbecslés" info="Az UTOM háttérben futó előrejelző modellje a korábbi híraktivitás alapján becsli a következő időszak várható kategória-aktivitását. Az oldal megnyitása nem indít új AI-futtatást: mindig a legutóbb elmentett modellkimenetet jeleníti meg." className={styles.forecast}>
        <div className={styles.forecastContent}><div className={styles.orb} data-state={forecastState} role="img" aria-label={forecastLabel} />
          <div><strong role="status">{forecast.isLoading ? "Előrejelzés betöltése…" : forecastLabel}</strong>
            {!forecast.error && forecasts.slice(0,2).map((p,i)=><p key={i}>{p.category}: {timeLabel(p.time,"7d",true)} napjára {p.predicted.toLocaleString("hu-HU",{maximumFractionDigits:1})} hírt jelez a modell.</p>)}
            {(["lastRun","nextRun"] as const).map(key=>{
              const time=timestamp(forecastStatus.data?.[key]);
              return time===null ? null : <p className={styles.caption} key={key}>{key==="lastRun"?"Utolsó futás":"Következő futás"}: {timeLabel(time,"7d",true)}</p>;
            })}
            <p className={styles.caption}>{forecasts.length ? "Megbízhatósági becslést az API jelenleg nem szolgáltat." : "Az UTOM a kategóriák várható híraktivitását becsli. Amint elkészül és elmentésre kerül egy eredmény, itt automatikusan megjelenik."}</p>
          </div>
        </div>
        {!forecast.error && forecasts.length>0 && <details><summary>Összes mentett előrejelzés ({forecasts.length})</summary><ul className={styles.scrollList}>{forecasts.map((p,i)=><li key={i}>{p.category} · {timeLabel(p.time,"7d",true)} · {p.predicted}</li>)}</ul></details>}
      </Card>
      <Card title="Kategória trendek" scope={period} info="Megmutatja, hogyan változott a legaktívabb hírtémák aktivitása a kiválasztott időszakban. A magasabb érték azt jelenti, hogy az adott kategóriában több feldolgozott hír jelent meg." className={styles.third}><State loading={series.loading} error={series.error} hasData={chart.points.length>0} period={period}><CategoryTrendChart chart={chart} period={period} /></State></Card>
      <Card title="Források átlagos clickbait pontszáma" scope={period} info="Az UTOM minden elemzett cikkhez 0–100 közötti clickbait pontszámot rendel. A grafikon forrásonként ezek átlagát mutatja; a magasabb érték erősebb figyelemfelkeltő címadást jelez. Ez nem minőségi rangsor." className={styles.third}><State loading={clickbait.isLoading} error={clickbait.error} hasData={clickbaitData.length>0} period={period}><ClickbaitChart data={clickbaitData} /></State></Card>
      <Card title="Hangulatelemzés" scope={period} info="Az elemzett híreket az UTOM pozitív, semleges vagy negatív hangulatba sorolja. Az átlagos hangulat −1 és +1 közötti érték: −1 negatív, 0 semleges, +1 pozitív." className={styles.third}><State loading={sentiment.isLoading} error={sentiment.error} hasData={sentimentData.total>0} period={period}><SentimentDonut data={sentimentData} /></State></Card>
      <Card title={period==="24h"?"Kategóriák aktivitása óránként":"Kategóriák aktivitása naponta"} scope={period} info="Megmutatja, hogy a kiválasztott időszak egyes óráiban vagy napjain mely hírtémák voltak a legaktívabbak. Minél intenzívebb egy mező, annál több feldolgozott hír tartozik hozzá." className={styles.five}><State loading={series.loading} error={series.error} hasData={chart.points.length>0} period={period}><ActivityHeatmap chart={chart} period={period} /></State></Card>
      <Card title="Kategóriahangulat – negatív arány" scope={period} info="Azt mutatja meg, hogy az adott kategóriában hangulatelemzett hírek mekkora része kapott negatív besorolást. A százalék mindig az adott kategória elemzett cikkeire vonatkozik." className={styles.three}><State loading={categorySentiment.isLoading} error={categorySentiment.error} hasData={negativeRows.length>0} period={period}><CategorySentimentChart data={negativeRows} /></State></Card>
      <Card title="Hangulat időbeli alakulása" scope={period} info="Az átlagos hírsentiment változását mutatja az időben. −1 negatív, 0 semleges, +1 pozitív; a hiányzó mérés nem számít semleges hangulatnak." className={styles.third}><State loading={hourly.isLoading} error={hourly.error} hasData={hourlyRows.some(r=>r.total>0)} period={period}><SentimentTimelineChart data={hourlyRows} period={period} /></State></Card>
    </div>
    <section className={styles.categoryLinks} aria-label="Kategóriák részletes elemzése"><h2>Kategóriák részletesen <small>{period}</small></h2>
      <State loading={insights.loading} error={insights.error} hasData={categories.some(c=>c.category && count(c.articleCount)>0)} period={period}>
        <div className={styles.categoryGrid}>{categories.filter(c=>typeof c.category==="string" && c.category.trim() && count(c.articleCount)>0).map(c=>{
          const mood=negativeRows.find(n=>n.category.toLocaleLowerCase("hu-HU")===c.category.toLocaleLowerCase("hu-HU"));
          return <Link className={styles.categoryCard} key={c.category} href={`/insights/category/${encodeURIComponent(c.category)}?period=${encodeURIComponent(period)}`}>
            <h3>{c.category}<span aria-hidden="true">↗</span></h3><strong>{count(c.articleCount).toLocaleString("hu-HU")} <small>hír</small></strong>
            <p>{count(c.sourceDiversity)} forrás</p><p>Átlagos hangulat: {categorySentiment.error ? "nem elérhető" : mood?.average?.toFixed(2) ?? "nincs mérés"}</p>
          </Link>;
        })}</div>
      </State>
    </section>
    <details className={styles.more}><summary>További forrásmetrikák és részletes elemzések</summary><div className={styles.detailsGrid}><Card title="Források kategóriaeloszlása" scope={period}><WSourceCategoryDistribution dark period={period} /></Card><Card title="Duplikáció" scope={period}><WSourceDuplication dark period={period} /></Card><Card title="Források átlagos clickbait pontszáma" scope={period} info="Forrásonként a cikkek átlagos 0–100-as clickbait pontszáma. A tooltip és a lista a mintanagyságot is mutatja, ezért kis elemszámnál az eredmény óvatosan értelmezendő."><WSourceClickbait dark period={period} embedded /></Card><Card title="Források clickbait aránya" scope={period} info="Azt mutatja, hogy az adott forrás kiválasztott időszakban elemzett cikkeinek hány százaléka érte el a clickbait küszöböt. A mintanagyságot is megjelenítjük, mert 1–2 cikkből a 100% még nem stabil minta."><WSourceClickbaitRatio dark period={period} embedded /></Card><Card title="Speed Index" scope="Teljes időszak"><WSourceSpeedIndexLeaderboard dark /></Card><Card title="Forrásaktivitás" scope="Ma"><WhatHappenedTodaySourceActivity dark /></Card></div></details>
  </div></div>;
}
