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

type SentimentMood = "positive" | "neutral" | "negative" | "unknown";

// TEMPORARY VISUAL TEST: while true, only the KPI face changes every second.
// Set this to false after the visual check; then the real backend average drives the face.
const SENTIMENT_FACE_TEST_MODE = false;

function moodFromSentiment(value: number | null): SentimentMood {
  if (value === null || !Number.isFinite(value)) return "unknown";
  if (value >= 0.25) return "positive";
  if (value <= -0.25) return "negative";
  return "neutral";
}

function MoodFace({ mood }: { mood: SentimentMood }) {
  const mouth = mood === "positive"
    ? "M7.5 14c1.1 1.8 2.6 2.7 4.5 2.7s3.4-.9 4.5-2.7"
    : mood === "negative"
      ? "M7.5 17c1.1-1.8 2.6-2.7 4.5-2.7s3.4.9 4.5 2.7"
      : "M8 15h8";

  return <svg className={styles.moodFace} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    {mood === "unknown" ? <path d="M9.8 9.3a2.4 2.4 0 0 1 4.6.8c0 1.8-2.4 2-2.4 3.7M12 17.2h.01" /> : <><path d="M9 9.5h.01M15 9.5h.01" /><path d={mouth} /></>}
  </svg>;
}

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
  render() { return this.state.failed ? <p role="alert" className={styles.empty}>Az adatok jelenleg nem Ă©rhetĹ‘k el.</p> : this.props.children; }
}
function Card({ title, info, scope, children, className = "" }: { title: string; info?: string; scope?: string; children: ReactNode; className?: string }) {
  const [openInfo, setOpenInfo] = useState(false);
  return <section className={`${styles.card} ${className}`}>
    <div className={styles.cardHeader}>
      <h2>{title}</h2>
      {info && <button type="button" className={styles.info} aria-label={`${title} â€“ informĂˇciĂł`} title="MagyarĂˇzat" aria-expanded={openInfo} onClick={() => setOpenInfo(true)}>â“</button>}
      {scope && <span className={styles.scope}>{scope}</span>}
    </div>
    <PanelBoundary>{children}</PanelBoundary>
    {info && <UtomModal show={openInfo} onClose={() => setOpenInfo(false)} title={`${title} â€“ mit mutat?`}>
      <p className={styles.infoText}>{info}</p>
    </UtomModal>}
  </section>;
}
function State({ loading, error, hasData, period = "24h", children }: { loading?: boolean; error?: unknown; hasData: boolean; period?: string; children: ReactNode }) {
  if (loading) return <div className={styles.skeleton} role="status" aria-label="Adatok betĂ¶ltĂ©se" />;
  if (error) return <p role="alert" className={styles.empty}>Az adat jelenleg nem elĂ©rhetĹ‘.</p>;
  if (!hasData) return <InsightsEmptyState period={period} />;
  return <>{children}</>;
}
export default function InsightsDashboard() {
  const user = useUserStore(s => s.user);
  const loading = useUserStore(s => s.loading);
  if (loading) return <div className={styles.page}><div className={styles.shell}><div className={styles.skeleton} role="status">Profil betĂ¶ltĂ©seâ€¦</div></div></div>;
  if (!user?.isPremium) return <div className={styles.page}><div className={styles.shell}><Card title="PrĂ©mium tartalom"><p>Az Insights elemzĂ©seihez PrĂ©mium hozzĂˇfĂ©rĂ©s szĂĽksĂ©ges.</p><Link href="/premium">PrĂ©mium tudnivalĂłk â†’</Link></Card></div></div>;
  return <DashboardContent />;
}
function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requestedPeriod = searchParams.get("period");
  const period: Period = requestedPeriod === "7d" || requestedPeriod === "30d" || requestedPeriod === "90d" ? requestedPeriod : "24h";
  const [sort, setSort] = useState("Legfrissebb");
  const [testMood, setTestMood] = useState<SentimentMood>("positive");
  useEffect(() => {
    if (!SENTIMENT_FACE_TEST_MODE) return;
    const testMoods: SentimentMood[] = ["positive", "neutral", "negative"];
    const timer = window.setInterval(() => {
      setTestMood(previous => {
        const choices = testMoods.filter(mood => mood !== previous);
        return choices[Math.floor(Math.random() * choices.length)];
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);
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
  const forecastLabel = { error: "Az elĹ‘rejelzĂ©s jelenleg nem elĂ©rhetĹ‘.", running: "ElemzĂ©s folyamatban", ready: "ElĹ‘rejelzĂ©s elkĂ©szĂĽlt", empty: "MĂ©g nincs elkĂ©szĂĽlt elĹ‘rejelzĂ©s" }[forecastState];
  const topActivity = [...activity].map(c=>({category:c.category,total:c.values.reduce((sum: number,v: {value:number})=>sum+v.value,0)})).sort((a,b)=>b.total-a.total);
  const realSentimentMood = moodFromSentiment(sentimentData.average);
  const sentimentMood = SENTIMENT_FACE_TEST_MODE ? testMood : realSentimentMood;
  const sentimentMoodColor = sentimentMood === "positive" ? "#21d99b"
    : sentimentMood === "neutral" ? "#f4c35c"
      : sentimentMood === "negative" ? "#ff5a67" : "#8eaac5";
  const kpis = [
    { title: "Feldolgozott hĂ­rek", value: !insights.error && articles > 0 ? articles.toLocaleString("hu-HU") : "â€”", note: `${period} Â· feldolgozott Ă¶sszefoglalĂłk`, loading: insights.loading, error: insights.error },
    { title: "AktĂ­v forrĂˇsok", value: !insights.error && sources.size ? String(sources.size) : "â€”", note: `${period} Â· egyedi forrĂˇsok`, loading: insights.loading, error: insights.error },
    { title: "Kiemelt kulcsszavak", value: !keywords.error && keywordRows.length ? String(count(keywords.data?.total ?? keywordRows.length)) : "â€”", note: `${period} Â· legalĂˇbb 3 emlĂ­tĂ©s`, loading: keywords.isLoading, error: keywords.error },
    { title: "Ătlagos hangulat", value: !sentiment.error && sentimentData.average !== null ? sentimentData.average.toFixed(2) : "â€”", note: `${period} Â· â’1 Ă©s +1 kĂ¶zĂ¶tt`, loading: sentiment.isLoading, error: sentiment.error },
  ];
  return <div className={styles.page}><div className={styles.shell}>
    <header className={styles.heading}><div className={styles.title}><span className={styles.pageIcon}><Glyph /></span><div><h1>Insights</h1><p>KategĂłria trendek, forrĂˇseloszlĂˇs Ă©s hangulatelemzĂ©s a magyar hĂ­rekben.</p></div></div><div className={styles.toolbar}>
      <div className={styles.pills} role="group" aria-label="IdĹ‘szak">{(["24h", "7d", "30d", "90d"] as Period[]).map(p => <button type="button" key={p} aria-pressed={period === p} onClick={() => changePeriod(p)}>{p}</button>)}</div>
      <div className={`${styles.pills} ${styles.sort}`} role="group" aria-label="RendezĂ©s">{["Legfrissebb", "NĂ¶vekvĹ‘", "LegtĂ¶bb forrĂˇs"].map(s => <button type="button" key={s} aria-pressed={sort === s} onClick={() => setSort(s)}>{s}</button>)}</div>
    </div></header>
    <div className={styles.grid} key={period}>
      {kpis.map((k, i) => {
        const isSentimentKpi = i === 3;
        const iconColor = isSentimentKpi ? sentimentMoodColor : colors[i];
        return <section key={k.title} className={`${styles.card} ${styles.kpi}`}>
          <span className={styles.kpiIcon} data-mood={isSentimentKpi ? sentimentMood : undefined} style={{ color: iconColor, borderColor: iconColor }}>
            {isSentimentKpi ? <MoodFace mood={sentimentMood} /> : <Glyph kind={i + 1} />}
          </span>
          <div><h2>{k.title}</h2><strong>{k.loading ? "â€¦" : k.value}</strong><p>{k.error ? "Az adat jelenleg nem elĂ©rhetĹ‘." : k.note}</p></div>
        </section>;
      })}
      <Card title="Mi tĂ¶rtĂ©nt ma valĂłjĂˇban?" scope="Ma Â· Budapest" className={styles.today}>
        <div className={styles.todayColumns}>
          <div><span className={styles.miniIcon}><Glyph kind={1} /></span><h3>KategĂłriĂˇk aktivitĂˇsa</h3><State loading={heatmap.isLoading} error={heatmap.error} hasData={activity.length > 0} period="today"><ul>{topActivity.slice(0,3).map(c=><li key={c.category}><strong>{c.category}</strong> Â· {c.total} hĂ­r</li>)}</ul></State></div>
          <div><span className={styles.miniIcon}><Glyph /></span><h3>KiemelkedĹ‘ esemĂ©ny</h3><State loading={spikes.isLoading} error={spikes.error} hasData={spikeRows.length > 0} period="today"><ul>{spikeRows.map((s, i) => <li key={i}>{s.label} Â· {s.value} hĂ­r ({s.hour}:00)</li>)}</ul></State></div>
          <div><span className={styles.miniIcon}><Glyph kind={3} /></span><h3>Felkapott kulcsszavak</h3><State loading={todayKeywords.isLoading} error={todayKeywords.error} hasData={todayKeywordRows.length > 0} period="today"><div className={styles.tags}>{todayKeywordRows.slice(0,5).map(k => <Link key={k.keyword} href="/trends">{k.keyword} <small>{k.count}Ă—</small></Link>)}</div></State></div>
        </div>
      </Card>
      <Card title="AI elĹ‘rejelzĂ©s" scope="Automatikus trendbecslĂ©s" info="Az UTOM hĂˇttĂ©rben futĂł elĹ‘rejelzĹ‘ modellje a korĂˇbbi hĂ­raktivitĂˇs alapjĂˇn becsli a kĂ¶vetkezĹ‘ idĹ‘szak vĂˇrhatĂł kategĂłria-aktivitĂˇsĂˇt. Az oldal megnyitĂˇsa nem indĂ­t Ăşj AI-futtatĂˇst: mindig a legutĂłbb elmentett modellkimenetet jelenĂ­ti meg." className={styles.forecast}>
        <div className={styles.forecastContent}><div className={styles.orb} data-state={forecastState} role="img" aria-label={forecastLabel} />
          <div><strong role="status">{forecast.isLoading ? "ElĹ‘rejelzĂ©s betĂ¶ltĂ©seâ€¦" : forecastLabel}</strong>
            {!forecast.error && forecasts.slice(0,2).map((p,i)=><p key={i}>{p.category}: {timeLabel(p.time,"7d",true)} napjĂˇra {p.predicted.toLocaleString("hu-HU",{maximumFractionDigits:1})} hĂ­rt jelez a modell.</p>)}
            {(["lastRun","nextRun"] as const).map(key=>{
              const time=timestamp(forecastStatus.data?.[key]);
              return time===null ? null : <p className={styles.caption} key={key}>{key==="lastRun"?"UtolsĂł futĂˇs":"KĂ¶vetkezĹ‘ futĂˇs"}: {timeLabel(time,"7d",true)}</p>;
            })}
            <p className={styles.caption}>{forecasts.length ? "MegbĂ­zhatĂłsĂˇgi becslĂ©st az API jelenleg nem szolgĂˇltat." : "Az UTOM a kategĂłriĂˇk vĂˇrhatĂł hĂ­raktivitĂˇsĂˇt becsli. Amint elkĂ©szĂĽl Ă©s elmentĂ©sre kerĂĽl egy eredmĂ©ny, itt automatikusan megjelenik."}</p>
          </div>
        </div>
        {!forecast.error && forecasts.length>0 && <details><summary>Ă–sszes mentett elĹ‘rejelzĂ©s ({forecasts.length})</summary><ul className={styles.scrollList}>{forecasts.map((p,i)=><li key={i}>{p.category} Â· {timeLabel(p.time,"7d",true)} Â· {p.predicted}</li>)}</ul></details>}
      </Card>
      <Card title="KategĂłria trendek" scope={period} info="Megmutatja, hogyan vĂˇltozott a legaktĂ­vabb hĂ­rtĂ©mĂˇk aktivitĂˇsa a kivĂˇlasztott idĹ‘szakban. A magasabb Ă©rtĂ©k azt jelenti, hogy az adott kategĂłriĂˇban tĂ¶bb feldolgozott hĂ­r jelent meg." className={styles.third}><State loading={series.loading} error={series.error} hasData={chart.points.length>0} period={period}><CategoryTrendChart chart={chart} period={period} /></State></Card>
      <Card title="ForrĂˇsok Ăˇtlagos clickbait pontszĂˇma" scope={period} info="Az UTOM minden elemzett cikkhez 0â€“100 kĂ¶zĂ¶tti clickbait pontszĂˇmot rendel. A grafikon forrĂˇsonkĂ©nt ezek ĂˇtlagĂˇt mutatja; a magasabb Ă©rtĂ©k erĹ‘sebb figyelemfelkeltĹ‘ cĂ­madĂˇst jelez. Ez nem minĹ‘sĂ©gi rangsor." className={styles.third}><State loading={clickbait.isLoading} error={clickbait.error} hasData={clickbaitData.length>0} period={period}><ClickbaitChart data={clickbaitData} /></State></Card>
      <Card title="HangulatelemzĂ©s" scope={period} info="Az elemzett hĂ­reket az UTOM pozitĂ­v, semleges vagy negatĂ­v hangulatba sorolja. Az Ăˇtlagos hangulat â’1 Ă©s +1 kĂ¶zĂ¶tti Ă©rtĂ©k: â’1 negatĂ­v, 0 semleges, +1 pozitĂ­v." className={styles.third}><State loading={sentiment.isLoading} error={sentiment.error} hasData={sentimentData.total>0} period={period}><SentimentDonut data={sentimentData} /></State></Card>
      <Card title={period==="24h"?"KategĂłriĂˇk aktivitĂˇsa ĂłrĂˇnkĂ©nt":"KategĂłriĂˇk aktivitĂˇsa naponta"} scope={period} info="Megmutatja, hogy a kivĂˇlasztott idĹ‘szak egyes ĂłrĂˇiban vagy napjain mely hĂ­rtĂ©mĂˇk voltak a legaktĂ­vabbak. MinĂ©l intenzĂ­vebb egy mezĹ‘, annĂˇl tĂ¶bb feldolgozott hĂ­r tartozik hozzĂˇ." className={styles.five}><State loading={series.loading} error={series.error} hasData={chart.points.length>0} period={period}><ActivityHeatmap chart={chart} period={period} /></State></Card>
      <Card title="KategĂłriahangulat â€“ negatĂ­v arĂˇny" scope={period} info="Azt mutatja meg, hogy az adott kategĂłriĂˇban hangulatelemzett hĂ­rek mekkora rĂ©sze kapott negatĂ­v besorolĂˇst. A szĂˇzalĂ©k mindig az adott kategĂłria elemzett cikkeire vonatkozik." className={styles.three}><State loading={categorySentiment.isLoading} error={categorySentiment.error} hasData={negativeRows.length>0} period={period}><CategorySentimentChart data={negativeRows} /></State></Card>
      <Card title="Hangulat idĹ‘beli alakulĂˇsa" scope={period} info="Az Ăˇtlagos hĂ­rsentiment vĂˇltozĂˇsĂˇt mutatja az idĹ‘ben. â’1 negatĂ­v, 0 semleges, +1 pozitĂ­v; a hiĂˇnyzĂł mĂ©rĂ©s nem szĂˇmĂ­t semleges hangulatnak." className={styles.third}><State loading={hourly.isLoading} error={hourly.error} hasData={hourlyRows.some(r=>r.total>0)} period={period}><SentimentTimelineChart data={hourlyRows} period={period} /></State></Card>
    </div>
    <section className={styles.categoryLinks} aria-label="KategĂłriĂˇk rĂ©szletes elemzĂ©se"><h2>KategĂłriĂˇk rĂ©szletesen <small>{period}</small></h2>
      <State loading={insights.loading} error={insights.error} hasData={categories.some(c=>c.category && count(c.articleCount)>0)} period={period}>
        <div className={styles.categoryGrid}>{categories.filter(c=>typeof c.category==="string" && c.category.trim() && count(c.articleCount)>0).map(c=>{
          const mood=negativeRows.find(n=>n.category.toLocaleLowerCase("hu-HU")===c.category.toLocaleLowerCase("hu-HU"));
          return <Link className={styles.categoryCard} key={c.category} href={`/insights/category/${encodeURIComponent(c.category)}?period=${encodeURIComponent(period)}`}>
            <h3>{c.category}<span aria-hidden="true">â†—</span></h3><strong>{count(c.articleCount).toLocaleString("hu-HU")} <small>hĂ­r</small></strong>
            <p>{count(c.sourceDiversity)} forrĂˇs</p><p>Ătlagos hangulat: {categorySentiment.error ? "nem elĂ©rhetĹ‘" : mood?.average?.toFixed(2) ?? "nincs mĂ©rĂ©s"}</p>
          </Link>;
        })}</div>
      </State>
    </section>
    <details className={styles.more}><summary>TovĂˇbbi forrĂˇsmetrikĂˇk Ă©s rĂ©szletes elemzĂ©sek</summary><div className={styles.detailsGrid}><Card title="ForrĂˇsok kategĂłriaeloszlĂˇsa" scope={period}><WSourceCategoryDistribution dark period={period} /></Card><Card title="DuplikĂˇciĂł" scope={period}><WSourceDuplication dark period={period} /></Card><Card title="ForrĂˇsok Ăˇtlagos clickbait pontszĂˇma" scope={period} info="ForrĂˇsonkĂ©nt a cikkek Ăˇtlagos 0â€“100-as clickbait pontszĂˇma. A tooltip Ă©s a lista a mintanagysĂˇgot is mutatja, ezĂ©rt kis elemszĂˇmnĂˇl az eredmĂ©ny Ăłvatosan Ă©rtelmezendĹ‘."><WSourceClickbait dark period={period} embedded /></Card><Card title="ForrĂˇsok clickbait arĂˇnya" scope={period} info="Azt mutatja, hogy az adott forrĂˇs kivĂˇlasztott idĹ‘szakban elemzett cikkeinek hĂˇny szĂˇzalĂ©ka Ă©rte el a clickbait kĂĽszĂ¶bĂ¶t. A mintanagysĂˇgot is megjelenĂ­tjĂĽk, mert 1â€“2 cikkbĹ‘l a 100% mĂ©g nem stabil minta."><WSourceClickbaitRatio dark period={period} embedded /></Card><Card title="Speed Index" scope="Teljes idĹ‘szak"><WSourceSpeedIndexLeaderboard dark /></Card><Card title="ForrĂˇsaktivitĂˇs" scope="Ma"><WhatHappenedTodaySourceActivity dark /></Card></div></details>
  </div></div>;
}

