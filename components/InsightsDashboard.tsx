"use client";
import { Component, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { CategoryTrendChart, ClickbaitChart, SentimentDonut, ActivityHeatmap, CategorySentimentChart, SentimentTimelineChart } from "./InsightsCharts";
import { useUserStore } from "@/store/useUserStore";
import { useInsightsSnapshot } from "@/hooks/useInsightsSnapshot";
import InsightsIntelligence from "./InsightsIntelligence";
import InsightsAdvancedSections from "./InsightsAdvancedSections";

import { useForecast } from "@/hooks/useForecast";
import InsightsEmptyState from "./InsightsEmptyState";
import UtomModal from "@/components/UtomModal";







import { rows, count, sentimentCounts, clickbaitRows, categorySeries, categorySentiments, sentimentSeries, forecastPoints, timeLabel } from "@/lib/insights-dashboard";
import { categoryQuality, categorySentimentQuality, hasEnoughTimelinePoints, hasEnoughTrendBuckets, sentimentQuality, sourceClickbaitQuality } from "@/lib/insights-quality";
import styles from "./InsightsDashboard.module.css";

type Period = "today" | "24h" | "7d" | "30d" | "90d";
const PERIOD_LABELS: Record<Period, string> = { today: "Ma", "24h": "Elmúlt 24 óra", "7d": "7 nap", "30d": "30 nap", "90d": "90 nap" };
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
function Glyph({ kind = 0 }: { kind?: number }) {
  const paths = ["M4 18l5-12 6 10 5-13M15 3h5v5", "M5 3h11l3 3v15H5zM8 8h6M8 12h8M8 16h5", "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 4a4 4 0 0 1 0 7M22 21v-2a4 4 0 0 0-3-4", "M3 3h8l10 10-8 8L3 11zM7 7h.01", "M8 14s1 3 4 3 4-3 4-3M8 9h.01M16 9h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0"];
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind % paths.length]} /></svg>;
}
class PanelBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p role="alert" className={styles.empty}>Az adatok jelenleg nem érhetők el.</p> : this.props.children; }
}
function Card({ title, info, scope, children, className = "", expandable = false }: { title: string; info?: string; scope?: string; children: ReactNode; className?: string; expandable?: boolean }) {
  const [openInfo, setOpenInfo] = useState(false);
  const [expanded, setExpanded] = useState(false);
  return <section className={`${styles.card} ${className} ${expanded ? styles.cardExpanded : ""}`}>
    <div className={styles.cardHeader}>
      <h2>{title}</h2>
      {info && <button type="button" className={styles.info} aria-label={`${title} – információ`} title="Magyarázat" aria-expanded={openInfo} onClick={() => setOpenInfo(true)}>ⓘ</button>}
      {scope && <span className={styles.scope}>{scope}</span>}
      {expandable && <button type="button" className={styles.expandChart} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? "Kisebb nézet" : "Nagyítás"}</button>}
    </div>
    <PanelBoundary>{children}</PanelBoundary>
    {info && <UtomModal show={openInfo} onClose={() => setOpenInfo(false)} title={`${title} – mit mutat?`}>
      <p className={styles.infoText}>{info}</p>
    </UtomModal>}
  </section>;
}
function QualityNotice({ title, detail }: { title: string; detail: string }) {
  return <div className={styles.qualityNotice} role="status"><span aria-hidden="true">◌</span><div><strong>{title}</strong><p>{detail}</p></div></div>;
}
function State({ loading, error, hasData, period = "24h", empty, children }: { loading?: boolean; error?: unknown; hasData: boolean; period?: string; empty?: ReactNode; children: ReactNode }) {
  if (loading) return <div className={styles.skeleton} role="status" aria-label="Adatok betöltése" />;
  if (error) return <p role="alert" className={styles.empty}>Az adat jelenleg nem elérhető.</p>;
  if (!hasData) return <>{empty ?? <InsightsEmptyState period={period} />}</>;
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
  const period: Period = requestedPeriod === "today" || requestedPeriod === "7d" || requestedPeriod === "30d" || requestedPeriod === "90d" ? requestedPeriod : "24h";
  const [sort, setSort] = useState("Legfrissebb");
  const [filtersOpen, setFiltersOpen] = useState(false);
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
    if (saved !== "today" && saved !== "24h" && saved !== "7d" && saved !== "30d" && saved !== "90d") return;
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
  const crossFilter=(field:string,value:string)=>{const q=new URLSearchParams(searchParams.toString());q.set(field,value);router.push(`${pathname}?${q}`,{scroll:false});};
  const updateFilter=(field:string,value:string)=>{const q=new URLSearchParams(searchParams.toString());const normalized=value.trim();if(normalized)q.set(field,normalized);else q.delete(field);q.delete('page');router.push(`${pathname}?${q}`,{scroll:false});};
  const snapshot=useInsightsSnapshot();
  const views=snapshot.data?.views;
  const state={error:snapshot.error,loading:snapshot.isLoading,isLoading:snapshot.isLoading};
  const insights={...state,data:views?.overview};
  const series={...state,data:views?.timeseries};
  const forecast=useForecast();
  // Calendar-day modules remain explicitly labelled; the analytical cards share one snapshot.
  const keywords={...state,data:views?.keywords};
  const sentiment={...state,data:views?.sentiment};
  const categorySentiment={...state,data:views?.categorySentiment};
  const hourly={...state,data:views?.timeline};
  const clickbait={...state,data:views?.clickbait};
  const categories = rows(insights.data?.categories).sort((a,b)=>sort==="Cikkszám"?b.articleCount-a.articleCount:sort==="Legtöbb forrás"?b.sourceDiversity-a.sourceDiversity:String(b.lastArticleAt).localeCompare(String(a.lastArticleAt)));
  const articles = count(snapshot.data?.counts.current);
  const keywordRows = rows(keywords.data?.keywords).filter(k => typeof k.keyword === "string" && count(k.count) > 0);
  const sentimentData = sentimentCounts(sentiment.data);
  const chart = categorySeries(series.data?.categories, period);
  const categoryGate = categoryQuality(count(snapshot.data?.quality.category.analyzed), count(snapshot.data?.quality.category.eligible), count(snapshot.data?.counts.sources));
  const categoryChartReady = categoryGate.canVisualize && hasEnoughTrendBuckets(chart.points);
  const clickbaitSources = rows(clickbait.data?.sources);
  const qualifiedClickbaitSources = clickbaitSources.filter(source => sourceClickbaitQuality(count(source.quality?.analyzed), count(source.quality?.eligible)).canVisualize);
  const clickbaitData = clickbaitRows({sources: qualifiedClickbaitSources});
  const clickbaitAnalyzed = clickbaitSources.reduce((total,source)=>total+count(source.quality?.analyzed),0);
  const clickbaitEligible = clickbaitSources.reduce((total,source)=>total+count(source.quality?.eligible),0);
  const negativeRows = categorySentiments(categorySentiment.data?.categories).filter(row=>categorySentimentQuality(row.total,row.total).canVisualize);
  const hourlyRows = sentimentSeries(hourly.data?.timeline, period);
  const sentimentGate = sentimentQuality(count(snapshot.data?.quality.sentiment.analyzed), count(snapshot.data?.quality.sentiment.eligible), count(snapshot.data?.counts.sources));
  const sentimentTimelineReady = sentimentGate.canVisualize && hasEnoughTimelinePoints(hourlyRows);
  const forecasts = forecastPoints(forecast.data?.forecast);
  const forecastStatus = useSWR("/api/forecast-status", fetcher, { refreshInterval: 10000, revalidateOnFocus: false });
  const forecastState = forecast.error || forecastStatus.error || forecastStatus.data?.status === "error" ? "error"
    : forecastStatus.data?.status === "running" ? "running" : forecasts.length ? "ready" : "empty";
  const realSentimentMood = moodFromSentiment(sentimentData.average);
  const sentimentMood = SENTIMENT_FACE_TEST_MODE ? testMood : realSentimentMood;
  const sentimentMoodColor = sentimentMood === "positive" ? "#21d99b"
    : sentimentMood === "neutral" ? "#f4c35c"
      : sentimentMood === "negative" ? "#ff5a67" : "#8eaac5";
  const periodLabel = PERIOD_LABELS[period];
  const kpis = [
    { title: "Publikált hírek", value: !insights.error && articles > 0 ? articles.toLocaleString("hu-HU") : "—", note: `${periodLabel} · RSS publikálási idő alapján`, loading: insights.loading, error: insights.error },
    { title: "Aktív források", value: !insights.error && count(snapshot.data?.counts.sources) ? String(count(snapshot.data?.counts.sources)) : "—", note: `${periodLabel} · egyedi publikáló források`, loading: insights.loading, error: insights.error },
    { title: "Kiemelt kulcsszavak", value: !keywords.error && keywordRows.length ? String(count(keywords.data?.total ?? keywordRows.length)) : "—", note: `${periodLabel} · legalább 3 említés`, loading: keywords.isLoading, error: keywords.error },
    { title: "Átlagos hangulat", value: !sentiment.error && sentimentGate.canVisualize && sentimentData.average !== null ? sentimentData.average.toFixed(2) : "—", note: sentimentGate.canVisualize ? `${periodLabel} · −1 és +1 között` : `${sentimentGate.analyzed} / ${sentimentGate.eligible} cikk elemezve · nincs elég adat`, loading: sentiment.isLoading, error: sentiment.error },
  ];
  return <div className={styles.page}><div className={styles.shell}>
    <header className={styles.heading}><div className={styles.title}><span className={styles.pageIcon}><Glyph /></span><div><h1>Insights</h1><p>Kategória trendek, forráseloszlás és hangulatelemzés a magyar hírekben.</p></div></div><div className={styles.toolbar}>
      <div className={styles.pills} role="group" aria-label="Időszak">{(["today", "24h", "7d", "30d", "90d"] as Period[]).map(p => <button type="button" key={p} aria-pressed={period === p} title={p === "today" ? "Mai budapesti naptári nap 00:00-tól" : p === "24h" ? "Gördülő 24 óra, ezért tegnapi időpontot is tartalmazhat" : undefined} onClick={() => changePeriod(p)}>{PERIOD_LABELS[p]}</button>)}</div>
      <button type="button" className={styles.filterToggle} aria-expanded={filtersOpen} onClick={()=>setFiltersOpen(open=>!open)}>Szűrők {Object.keys(snapshot.data?.filters||{}).length>0&&<span>{Object.keys(snapshot.data?.filters||{}).length}</span>}</button>
    </div></header>
    {filtersOpen&&<section className={styles.filterDrawer} aria-label="Insights szűrők"><label>Kategória <input defaultValue={searchParams.get('category')||''} key={'category'+searchParams.get('category')} onBlur={event=>updateFilter('category',event.target.value)} placeholder="pl. Gazdaság" /></label><label>Forrás <input defaultValue={searchParams.get('source')||''} key={'source'+searchParams.get('source')} onBlur={event=>updateFilter('source',event.target.value)} placeholder="pl. telex.hu" /></label>{Object.entries(snapshot.data?.filters||{}).map(([field,value])=><button type="button" key={field} onClick={()=>updateFilter(field,'')}>{String(value)} ×</button>)}</section>}
    <div className={`${styles.grid} ${styles.kpiGrid}`} key={'kpis'+period}>
      {kpis.map((k, i) => {
        const isSentimentKpi = i === 3;
        const iconColor = isSentimentKpi ? sentimentMoodColor : colors[i];
        return <section key={k.title} className={`${styles.card} ${styles.kpi}`}>
          <span className={styles.kpiIcon} data-mood={isSentimentKpi ? sentimentMood : undefined} style={{ color: iconColor, borderColor: iconColor }}>
            {isSentimentKpi ? <MoodFace mood={sentimentMood} /> : <Glyph kind={i + 1} />}
          </span>
          <div><h2>{k.title}</h2><strong>{k.loading ? "…" : k.value}</strong><p>{k.error ? "Az adat jelenleg nem elérhető." : k.note}</p></div>
        </section>;
      })}</div>
    <PanelBoundary key={'intelligence'+searchParams.toString()+snapshot.data?.window.end}><InsightsIntelligence data={snapshot.data} error={snapshot.error} loading={snapshot.isLoading} /></PanelBoundary>
    <div className={`${styles.grid} ${styles.analyticsGrid}`} key={'analytics'+period}>
      <Card title="Kategória trendek" scope={periodLabel} info="Csak valódi, megfelelő lefedettségű kategóriák és legalább három időbeli pont jelenik meg." className={styles.third} expandable><State loading={series.loading} error={series.error} hasData={categoryChartReady} period={period} empty={<QualityNotice title="Még nincs elegendő kategória-idősor." detail={`${categoryGate.analyzed} / ${categoryGate.eligible} cikk kategorizálva.`}/>}><CategoryTrendChart chart={chart} period={period} onCategory={value=>crossFilter("category",value)} /></State></Card>
      <Card title="Források átlagos clickbait pontszáma" scope={periodLabel} info="Forrás csak legalább 5 elemzett cikkel és 20%-os lefedettséggel kerül a rangsorba." className={styles.third}><State loading={clickbait.isLoading} error={clickbait.error} hasData={clickbaitData.length>0} period={period} empty={<QualityNotice title="Nincs elég adat megbízható rangsorhoz." detail={`${clickbaitAnalyzed} / ${clickbaitEligible} forráscikk elemezve.`}/>}><ClickbaitChart data={clickbaitData} onSource={value=>crossFilter("source",value)} /></State></Card>
      <Card title="Hangulatelemzés" scope={periodLabel} info="A megoszlás legalább 20 elemzett cikk és 20%-os lefedettség esetén látható." className={styles.third}><State loading={sentiment.isLoading} error={sentiment.error} hasData={sentimentGate.canVisualize} period={period} empty={<QualityNotice title="További adat szükséges a megoszlás megjelenítéséhez." detail={`${sentimentGate.analyzed} / ${sentimentGate.eligible} cikk rendelkezik hangulatelemzéssel.`}/>}><SentimentDonut data={sentimentData} /></State></Card>
      <Card title={period==="24h"||period==="today"?"Kategóriák aktivitása óránként":"Kategóriák aktivitása naponta"} scope={PERIOD_LABELS[period]} info="Az ismeretlen kategória adatminőségi állapot, ezért nem része a diagramnak." className={styles.third} expandable><State loading={series.loading} error={series.error} hasData={categoryChartReady} period={period} empty={<QualityNotice title="A kategóriaaktivitás még nem jeleníthető meg." detail={`${categoryGate.eligible-categoryGate.analyzed} cikk még nincs kategorizálva.`}/>}><ActivityHeatmap chart={chart} period={period} /></State></Card>
      <Card title="Kategóriahangulat – negatív arány" scope={periodLabel} info="Csak legalább 10 sentimentméréssel rendelkező valódi kategóriák jelennek meg." className={styles.third}><State loading={categorySentiment.isLoading} error={categorySentiment.error} hasData={sentimentGate.canVisualize&&negativeRows.length>0} period={period} empty={<QualityNotice title="Nincs elég kategóriaszintű hangulatadat." detail="A nagyon kis mintákból nem készül százalékos rangsor."/>}><CategorySentimentChart data={negativeRows} /></State></Card>
      <Card title="Hangulat időbeli alakulása" scope={periodLabel} info="Idősor legalább három mért időpontból és megfelelő teljes lefedettséggel készül." className={styles.third} expandable><State loading={hourly.isLoading} error={hourly.error} hasData={sentimentTimelineReady} period={period} empty={<QualityNotice title="Még nincs elegendő hangulat-idősor." detail={`${sentimentGate.analyzed} / ${sentimentGate.eligible} cikk elemezve.`}/>}><SentimentTimelineChart data={hourlyRows} period={period} /></State></Card>
    </div>
    <section className={styles.categoryLinks} aria-label="Kategóriák részletes elemzése"><div className={styles.categoryHeader}><div><h2>Kategóriák részletesen <small>{periodLabel}</small></h2><p>{categoryGate.analyzed} / {categoryGate.eligible} kategorizálva · {categoryGate.eligible-categoryGate.analyzed} még nincs kategorizálva</p></div><div className={`${styles.pills} ${styles.sort}`} role="group" aria-label="Kategóriák rendezése">{["Legfrissebb", "Cikkszám", "Legtöbb forrás"].map(value => <button type="button" key={value} aria-pressed={sort === value} onClick={() => setSort(value)}>{value}</button>)}</div></div>
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
    <section className={styles.forecastSection} aria-labelledby="forecast-title">
      <Card title="Aktivitás-előrejelzés" scope="Statisztikai baseline" info="Azonos budapesti napszak korábbi aktivitásának mediánja. Ez statisztikai előrejelzés, nem LLM-magyarázat. A sáv korábbi visszamérési hibákból származik; nem AI-bizonyosság." className={styles.forecast}>
        <div className={styles.forecastContent}><span className={styles.orb} data-state={forecastState} aria-hidden="true"/><div>
          {searchParams.has('source')||searchParams.has('keyword')||searchParams.has('cluster') ? <p>Ehhez a szűréshez nincs előrejelzési modell.</p> : <>
            <strong>{forecast.isLoading?'Előrejelzés betöltése…':forecast.error?'Az előrejelzés nem elérhető.':forecast.data?.freshness==='expired'?'Az utolsó előrejelzés lejárt.':forecasts.length?'Következő aktivitási ablak':'Még nincs elkészült előrejelzés.'}</strong>
            {!forecast.error && forecasts.slice(0,3).map((p,i)=><p key={i}>{p.category} · {timeLabel(p.time,'24h',true)} · {p.predicted.toLocaleString('hu-HU',{maximumFractionDigits:1})} cikk</p>)}
            {forecast.data?.generatedAt && <p className={styles.caption}>Frissítve: {new Date(forecast.data.generatedAt).toLocaleString('hu-HU',{timeZone:'Europe/Budapest'})}</p>}
            <details><summary>Részletes módszer és becslési sávok</summary><p>Legutóbbi futás: {forecastStatus.data?.status||'nem ismert'}. Csak teljesen sikeres futás válik aktuálissá.</p>{forecast.data?.backtest&&<p>{forecast.data.backtest.samples} visszamérési pont · átlagos abszolút hiba: {forecast.data.backtest.mae===null?'még nincs':Number(forecast.data.backtest.mae).toFixed(2)+' cikk'}</p>}<p>A sáv a történeti 90. percentilis abszolút hibából készül legalább 30 visszamérési ponttal; nem eseményvalószínűség.</p>{Object.entries(forecast.data?.forecast||{}).flatMap(([category,points])=>Array.isArray(points)?points.map((p:any,i:number)=><p key={category+i}>{category} · {new Date(p.date).toLocaleString('hu-HU',{timeZone:'Europe/Budapest'})} · {p.lower==null?'Nincs elegendő sávbecslési minta':`${p.lower}–${p.upper} cikk`} · {p.calibrationSamples} történeti pont</p>):[])}</details>
          </>}
        </div></div>
      </Card>
    </section>
    {snapshot.data && !snapshot.error && <PanelBoundary key={'sources'+searchParams.toString()+snapshot.data.window.end}><InsightsAdvancedSections data={snapshot.data} /></PanelBoundary>}
  </div></div>;
}

