"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import ProfileMenu from "./ProfileMenu";
import LoginModal from "./LoginModal";
import { useUserStore } from "@/store/useUserStore";
import TrendsIcon from "./TrendsIcon";
import SparklineMini from "./SparklineMini";
import TrendIntelligencePanel from "./TrendIntelligencePanel";
import { pointLabel, trendIdentity, TREND_UNIT, type TrendHistory } from "@/lib/trend-intelligence";
import { intelligenceParams, loadTrendHistory, loadVisibleHistories } from "@/lib/trend-intelligence-client";
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
  sources: string[];
  status: string;
  relatedTopics: string[];
};

type SourceShare = { source: string; count: number };
type ActivityPoint = { label: string; count: number };
const SOURCE_PALETTE = ["#188bff", "#9650ff", "#22c4f5", "#f12fbb", "#586f9a"];

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
  const rawGrowth = row.growth == null ? NaN : Number(row.growth);
  return {
    keyword,
    frequency,
    category: typeof row.category === "string" && row.category.trim() ? row.category.trim() : "Egyéb",
    growth: Number.isFinite(rawGrowth) ? rawGrowth : null,
    status: typeof row.status === "string" ? row.status : "Nincs összehasonlítható adat",
    firstSeen: typeof row.first_seen === "string" ? row.first_seen : undefined,
    lastSeen: typeof row.last_seen === "string" ? row.last_seen : undefined,
    sources: typeof row.sources === "string" ? row.sources.split("|").map((item) => item.trim()).filter(Boolean).slice(0, 5) : [],
    relatedTopics: Array.isArray(row.relatedTopics) ? row.relatedTopics.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [],
  };
}

function relativeTime(value?: string): string {
  if (!value) return "nincs időadat";
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return "nincs időadat";
  const hours = Math.max(0, Math.floor((Date.now() - time) / 3_600_000));
  if (hours < 1) return "most";
  if (hours < 24) return `${hours} órája`;
  return `${Math.floor(hours / 24)} napja`;
}
function activityRangeLabel(points: ActivityPoint[], period: string) {
  if (!points.length) return "Idősor nem érhető el";
  const hourly=period==="24h";
  return `${pointLabel(points[0].label,hourly)} – ${pointLabel(points.at(-1)!.label,hourly)}`;
}

function SourceDonut({ rows, total }: { rows: SourceShare[]; total: number }) {
  const segments = rows.map((row, index) => ({
    row,
    index,
    percent: total ? row.count / total * 100 : 0,
    start: total ? rows.slice(0, index).reduce((sum, item) => sum + item.count, 0) / total * 100 : 0,
  }));
  return <svg className={styles.donutSvg} viewBox="0 0 42 42" role="img" aria-label={`${total.toLocaleString("hu-HU")} cikk–kulcsszó kapcsolat forrásonként`}>
    <circle cx="21" cy="21" r="15.9" fill="none" stroke="#17364f" strokeWidth="7" />
    {segments.map(({ row, index, percent, start }) =>
      <circle key={row.source} cx="21" cy="21" r="15.9" fill="none" pathLength="100" stroke={SOURCE_PALETTE[index % SOURCE_PALETTE.length]} strokeWidth="7" strokeDasharray={`${percent} ${100-percent}`} strokeDashoffset={-start} transform="rotate(-90 21 21)">
        <title>{row.source}: {row.count.toLocaleString("hu-HU")} kapcsolat ({percent.toLocaleString("hu-HU",{maximumFractionDigits:1})}%)</title>
      </circle>)}
  </svg>;
}

function trendStrength(trend: Trend, maxFrequency: number): number {
  if (maxFrequency <= 0) return 0;
  return Math.max(8, Math.round((trend.frequency / maxFrequency) * 100));
}

const CATEGORY_ICON: Record<string, string> = {
  Politika: "category-politika", Sport: "category-sport", Gazdaság: "category-gazdasag",
  Tech: "category-tech", Kultúra: "category-kultura", Egészségügy: "category-egeszseg",
  Oktatás: "category-oktatas", Közélet: "category-kozelet",
};
const CATEGORY_COLOR: Record<string, string> = {
  Politika: "#ff4d7c", Sport: "#2bd5ff", Gazdaság: "#08e1b4", Tech: "#a46eff",
  Kultúra: "#ffbf3e", Egészségügy: "#18d2ae", Oktatás: "#37b8ff", Közélet: "#ef5fc0",
};
function CategoryIcon({ category }: { category: string }) {
  return <TrendsIcon name={CATEGORY_ICON[category] ?? "category-other"} />;
}
function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function DateRangePicker({ period, startDate, endDate, onPreset, onRange }: {
  period: string; startDate?: string; endDate?: string;
  onPreset: (period: string) => void; onRange: (start: string, end: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selection, setSelection] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", down); document.removeEventListener("keydown", key); };
  }, [open]);
  const today = dateKey(new Date());
  const firstWeekday = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const label = period === "custom" && startDate && endDate
    ? `${startDate.replaceAll("-", ".")} – ${endDate.replaceAll("-", ".")}`
    : ({ "24h": "Utolsó 24 óra", "7d": "Utolsó 7 nap", "30d": "Utolsó 30 nap", "90d": "Utolsó 90 nap", "365d": "Utolsó 365 nap" } as Record<string,string>)[period] ?? "Időszak";
  function chooseDay(key: string) {
    if (!selection || key < selection) { setSelection(key); return; }
    if ((Date.parse(`${key}T00:00:00Z`) - Date.parse(`${selection}T00:00:00Z`)) > 366 * 86_400_000) {
      setSelection(key); return;
    }
    onRange(selection, key); setSelection(null); setOpen(false);
  }
  return <div className={styles.datePicker} ref={root}>
    <button type="button" className={styles.dateTrigger} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(!open)}><TrendsIcon name="calendar" /><span>{label}</span><TrendsIcon name="chevron" /></button>
    {open && <div className={styles.datePopover} role="dialog" aria-label="Időszak kiválasztása">
      <div className={styles.dateQuick}>{[["24h", "24 óra"], ["7d", "7 nap"], ["30d", "30 nap"], ["90d", "90 nap"], ["365d", "365 nap"]].map(([id, text]) => <button className={id === period ? styles.dateQuickActive : ""} type="button" key={id} onClick={() => { onPreset(id); setSelection(null); setOpen(false); }}>{text}</button>)}</div>
      <p className={styles.calendarHeading}>Egyedi időszak <small>{selection ? "Válaszd ki a zárónapot" : "Válaszd ki a kezdőnapot"}</small></p>
      <div className={styles.calendarMonth}><button type="button" aria-label="Előző hónap" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button><strong>{month.toLocaleDateString("hu-HU", { year: "numeric", month: "long" })}</strong><button type="button" aria-label="Következő hónap" disabled={month.getFullYear() === new Date().getFullYear() && month.getMonth() === new Date().getMonth()} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button></div>
      <div className={styles.calendarGrid}>{["H", "K", "Sze", "Cs", "P", "Szo", "V"].map((name) => <span className={styles.calendarWeekday} key={name}>{name}</span>)}{Array.from({length: firstWeekday}, (_, i) => <span key={`empty-${i}`} />)}{Array.from({length: daysInMonth}, (_, i) => { const day = i+1; const key = dateKey(new Date(month.getFullYear(), month.getMonth(), day)); return <button type="button" key={key} disabled={key > today} className={[selection === key || (period === "custom" && (startDate === key || endDate === key)) ? styles.calendarSelected : "", period === "custom" && startDate && endDate && key > startDate && key < endDate ? styles.calendarInRange : ""].join(" ")} aria-label={key} onClick={() => chooseDay(key)}>{day}</button>; })}</div>
      <p className={styles.dateHelp}>Kezdő- és zárónap kiválasztása · legfeljebb 366 nap.</p>
    </div>}
  </div>;
}

function Icon({ children }: { children: React.ReactNode }) {
  return <span className={styles.iconTile} aria-hidden="true"><TrendsIcon name={String(children)} /></span>;
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
  const user = useUserStore((state) => state.user);
  useEffect(() => { useUserStore.getState().loadUser?.(); }, []);
  const [filters, setFilters] = useState<Filters>({ period: "30d", sources: [], categories: [], sort: "freq", keyword: "" });
  const [trends, setTrends] = useState<Trend[]>([]);
  const [history, setHistory] = useState<Record<string, TrendHistory>>({});
  const [historyErrors,setHistoryErrors] = useState<Record<string,boolean>>({});
  const [loadedScope,setLoadedScope] = useState("");
  const [asOf,setAsOf] = useState<string>();
  const scopeKey = JSON.stringify([filters.period,filters.sources,filters.categories,filters.startDate,filters.endDate]);
  const [sourceBreakdown, setSourceBreakdown] = useState<SourceShare[]>([]);
  const [activitySeries, setActivitySeries] = useState<ActivityPoint[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount,setVisibleCount] = useState(12);
  const [expanded, setExpanded] = useState<string | null>(null);
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
    const query = intelligenceParams({period:filters.period,sources:filters.sources,categories:filters.categories,startDate:filters.startDate,endDate:filters.endDate});
    if (filters.sources.length) query.set("sources", filters.sources.join(","));
    if (filters.categories.length) query.set("categories", filters.categories.join(","));
    if (filters.period === "custom" && filters.startDate) query.set("startDate", filters.startDate);
    if (filters.period === "custom" && filters.endDate) query.set("endDate", filters.endDate);
    window.queueMicrotask(() => {
      if (!active) return;
      setLoading(true);
      setError(null);
      setHistory({});
      setHistoryErrors({});
      setExpanded(null);
      setVisibleCount(12);
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
        const object = payload as { version?:number; unit?:string; window?:{asOf:string}; trends?: unknown; sourceBreakdown?: unknown; activity?: unknown };
        if(object.version!==2 || object.unit!==TREND_UNIT || !object.window?.asOf || !Array.isArray(object.trends)) throw new Error("trends_invalid_contract");
        const rows = Array.isArray(object.trends) ? object.trends : Array.isArray(payload) ? payload : [];
        if (!active) return;
        setLoadedScope(scopeKey);
        setAsOf(object.window.asOf);
        setTrends(rows.map(normalizeTrend).filter((trend): trend is Trend => trend !== null));
        setSourceBreakdown(Array.isArray(object.sourceBreakdown) ? object.sourceBreakdown.flatMap((entry): SourceShare[] => {
          if (!entry || typeof entry !== "object") return [];
          const row = entry as Record<string, unknown>;
          const source = typeof row.source === "string" ? row.source.trim() : "";
          const count = finiteNumber(row.count);
          return source && count > 0 ? [{ source, count }] : [];
        }) : []);
        setActivitySeries(Array.isArray(object.activity) ? object.activity.flatMap((entry): ActivityPoint[] => {
          if (!entry || typeof entry !== "object") return [];
          const row = entry as Record<string, unknown>;
          return typeof row.label === "string" ? [{ label: row.label, count: Math.max(0, finiteNumber(row.count)) }] : [];
        }) : []);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setTrends([]);
        setSourceBreakdown([]);
        setActivitySeries([]);
        setError(reason instanceof Error ? reason.message : "trends_load_failed");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; if (rejectTimeout !== undefined) window.clearTimeout(rejectTimeout); controller.abort(); };
  }, [filters.period, filters.sources, filters.categories, filters.startDate, filters.endDate, scopeKey]);

  const filteredTrends = useMemo(() => {
    const needle = filters.keyword.trim().toLocaleLowerCase("hu-HU");
    const result = trends.filter((trend) => !needle || trend.keyword.toLocaleLowerCase("hu-HU").includes(needle));
    return [...result].sort((a, b) => {
      if (filters.sort === "growth") return finiteNumber(b.growth, -Infinity) - finiteNumber(a.growth, -Infinity) || b.frequency - a.frequency || a.keyword.localeCompare(b.keyword, "hu");
      if (filters.sort === "relevance" && needle) return a.keyword.toLocaleLowerCase("hu-HU").indexOf(needle) - b.keyword.toLocaleLowerCase("hu-HU").indexOf(needle) || b.frequency - a.frequency;
      return b.frequency - a.frequency || a.keyword.localeCompare(b.keyword, "hu");
    });
  }, [trends, filters.keyword, filters.sort]);

  const visibleTrends = loadedScope === scopeKey ? filteredTrends.slice(0, visibleCount) : [];
  const historyKey = JSON.stringify(visibleTrends.map(({keyword,category}) => ({keyword,category})));
  useEffect(() => {
    const identities = JSON.parse(historyKey) as {keyword:string;category:string}[];
    const controller = new AbortController();
    const scope = {period:filters.period,sources:filters.sources,categories:filters.categories,startDate:filters.startDate,endDate:filters.endDate,asOf};
    void loadVisibleHistories(identities,controller.signal,async ({keyword,category}) => {
      const key = trendIdentity(keyword,category);
      try {
        const data = await loadTrendHistory(scope,keyword,category,controller.signal);
        if(!controller.signal.aborted) setHistory(prev=>({...prev,[key]:data}));
      } catch { if(!controller.signal.aborted) setHistoryErrors(prev=>({...prev,[key]:true})); }
    });
    return ()=>controller.abort();
  }, [historyKey,filters.period,filters.sources,filters.categories,filters.startDate,filters.endDate,asOf]);

  const totalHits = filteredTrends.reduce((sum, trend) => sum + trend.frequency, 0);
  const growing = filteredTrends.filter((trend) => finiteNumber(trend.growth) > 0).sort((a, b) => finiteNumber(b.growth) - finiteNumber(a.growth)).slice(0, 5);
  const maxFrequency = Math.max(0, ...filteredTrends.map((trend) => trend.frequency));
  const lastWeek = Date.parse(asOf ?? "") - 7 * 24 * 60 * 60 * 1000;
  const newlySeen = filteredTrends.filter((trend) => trend.firstSeen && Date.parse(trend.firstSeen) >= lastWeek);
  const topicSidebarRows = newlySeen.slice(0,5);
  const activityPoints = activitySeries.slice(-30);
  const activity = activityPoints.map((point) => point.count);
  const sourceTotal = sourceBreakdown.reduce((sum, entry) => sum + entry.count, 0);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function toggleFilter(key: "sources" | "categories", value: string) {
    setFilters((current) => ({
      ...current,
      [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value],
    }));
  }

  return (
    <div className={styles.dashboard}>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand} aria-label="UTOM főoldal">
          <span className={styles.brandCrop}><Image src="/web-app-manifest-512x512.png" width={155} height={155} alt="Utom" /></span>
        </Link>
        <nav className={styles.nav} aria-label="Fő navigáció">
          {NAVIGATION.map(([icon, label, href], index) => (
            <Link key={`${label}-${index}`} href={href} className={label === "Trendek" ? styles.navCurrent : ""} aria-current={label === "Trendek" ? "page" : undefined}>
              <TrendsIcon name={icon} />{label}
            </Link>
          ))}
        </nav>
        <div className={styles.filterDivider} />
        <div className={styles.filters} aria-label="Trendszűrők">
          <h2>Szűrés</h2>
          <label><span className={styles.filterLabel}><TrendsIcon name="calendar" /> Időszak</span><select value={filters.period} onChange={(event) => event.target.value === "custom" ? document.querySelector<HTMLButtonElement>("[data-trends-date-trigger] button")?.click() : updateFilter("period", event.target.value)}><option value="24h">24 óra</option><option value="7d">7 nap</option><option value="30d">30 nap</option><option value="90d">90 nap</option><option value="365d">365 nap</option><option value="custom">Egyedi</option></select></label>
          {filters.period === "custom" && <div className={styles.dateInputs}><input aria-label="Kezdődátum" type="date" value={filters.startDate || ""} onChange={(event) => updateFilter("startDate", event.target.value)} /><input aria-label="Záródátum" type="date" value={filters.endDate || ""} onChange={(event) => updateFilter("endDate", event.target.value)} /></div>}
          <fieldset><legend className={styles.filterLabel}><TrendsIcon name="source-users" /> Források</legend><label className={styles.check}><input type="checkbox" checked={filters.sources.length === 0} onChange={() => updateFilter("sources", [])} />Mind</label>{SOURCES.map((source) => <label className={styles.check} key={source}><input type="checkbox" checked={filters.sources.includes(source)} onChange={() => toggleFilter("sources", source)} />{source}</label>)}</fieldset>
          <fieldset><legend className={styles.filterLabel}><TrendsIcon name="categories" /> Kategóriák</legend>{CATEGORIES.map((category) => <label className={`${styles.categoryFilter} ${filters.categories.includes(category) ? styles.categoryFilterSelected : ""}`} key={category} style={{ "--category-color": CATEGORY_COLOR[category] } as React.CSSProperties}><input type="checkbox" checked={filters.categories.includes(category)} onChange={() => toggleFilter("categories", category)} /><span className={styles.categoryFilterIcon}><CategoryIcon category={category} /></span>{category}</label>)}</fieldset>
          <label><span className={styles.filterLabel}><TrendsIcon name="sort" /> Rendezés</span><select value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value)}><option value="freq">Gyakoriság</option><option value="growth">Növekedés</option><option value="relevance">Relevancia</option></select></label>
          <label><span className={styles.filterLabel}><TrendsIcon name="search" /> Kulcsszó kereső</span><input type="search" value={filters.keyword} onChange={(event) => updateFilter("keyword", event.target.value)} placeholder="Írj be egy kulcsszót..." /></label>
        </div>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <label className={styles.globalSearch}><TrendsIcon name="search" /><input ref={topSearchRef} aria-label="Kulcsszó, téma vagy forrás keresése" value={filters.keyword} onChange={(event) => updateFilter("keyword", event.target.value)} placeholder="Kulcsszó, téma vagy forrás keresése..." /><kbd>Ctrl + K</kbd></label>
          <div className={styles.topActions}>
            <div data-trends-date-trigger><DateRangePicker period={filters.period} startDate={filters.startDate} endDate={filters.endDate} onPreset={(period) => setFilters((prev) => ({ ...prev, period, startDate: undefined, endDate: undefined }))} onRange={(startDate, endDate) => setFilters((prev) => ({ ...prev, period: "custom", startDate, endDate }))} /></div>
            <div className={styles.notificationBox}><button type="button" className={styles.notificationTrigger} onClick={() => setNotificationsOpen(!notificationsOpen)} aria-label="Értesítések" aria-haspopup="dialog" aria-expanded={notificationsOpen}><TrendsIcon name="bell" /></button>{notificationsOpen && <div className={styles.notificationPanel} role="dialog" aria-label="Értesítések"><strong>Értesítések</strong><p>Jelenleg nincs új rendszerértesítés.</p><button type="button" onClick={() => setNotificationsOpen(false)}>Bezárás</button></div>}</div>
            <div className={styles.profile}>{user ? <ProfileMenu /> : <LoginModal />}</div>
          </div>
        </header>

        <div className={styles.content}>
          <main className={styles.mainColumn}>
            <section className={styles.hero}>
              <div className={styles.heroTitle}><svg className={styles.flame} viewBox="0 0 56 72" aria-hidden="true"><defs><linearGradient id="trends-flame" x2="0" y2="1"><stop stopColor="#ed24cd"/><stop offset=".45" stopColor="#ff55b5"/><stop offset="1" stopColor="#ffd276"/></linearGradient></defs><path fill="url(#trends-flame)" d="M29 1C44 13 39 22 47 31C59 49 46 65 34 71C39 57 32 52 29 43C28 54 16 57 21 71C2 65-3 49 7 33C11 26 13 23 14 15C23 22 21 31 23 33C31 21 35 13 29 1Z"/></svg><div><h1>Trendek</h1><p>Valós idejű témák és kulcsszavak a magyar online médiában</p></div></div>
              <TrendsHeroGlobe />
              <div className={styles.heroCopy}><strong>Figyeljük a webet.<br/><em>Te lásd a lényeget.</em></strong><p>Valós idejű elemzések, megbízható források, mélyebb összefüggések.</p></div>
            </section>

            <section className={styles.stats} aria-label="Trendstatisztikák">
              <article><Icon>▤</Icon><div><span>Cikk–kulcsszó kapcsolat</span><strong>{loading || error ? "—" : totalHits.toLocaleString("hu-HU")}</strong><small>az aktuális időszakban</small></div></article>
              <article><Icon>↗</Icon><div><span>Aktív kulcsszavak</span><strong>{loading || error ? "—" : filteredTrends.length.toLocaleString("hu-HU")}</strong><small>megfigyelt témák száma</small></div></article>
              <article><Icon>source-users</Icon><div><span>Források</span><strong>{loading || error || !sourceTotal ? "—" : sourceBreakdown.length}</strong><small>{sourceTotal ? sourceBreakdown.slice(0, 3).map((item) => item.source).join(", ") : "nincs összesített forrásadat"}</small></div></article>
              <article><Icon>ϟ</Icon><div><span>Új trendek</span><strong>{loading || error ? "—" : newlySeen.length}</strong><small>első észlelés az elmúlt 7 napban</small></div></article>
            </section>

            <div className={styles.topicToolbar}>
              <div className={styles.chips}><button className={styles.chipActive} type="button" onClick={() => updateFilter("keyword", "")}>Összes téma</button>{filteredTrends.slice(0, 7).map((trend) => <button type="button" key={trendIdentity(trend.keyword,trend.category)} onClick={() => updateFilter("keyword", trend.keyword)}>{trend.keyword}<b>{trend.frequency}</b></button>)}</div>
              <select aria-label="Trendek rendezése" value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value)}><option value="freq">Rendezés: Népszerűség</option><option value="growth">Rendezés: Növekedés</option><option value="relevance">Rendezés: Relevancia</option></select>
            </div>

            <section className={styles.trendList} aria-live="polite" aria-busy={loading}>
              {loading && <TrendListPreview reason="loading" />}
              {!loading && error && <TrendListPreview reason="error" />}
              {!loading && !error && visibleTrends.length === 0 && <TrendListPreview reason="empty" />}
              {!loading && !error && visibleTrends.map((trend, index) => {
                const identity = trendIdentity(trend.keyword,trend.category);
                const historical = history[identity];
                const points = historical?.history ?? [];
                const growth = trend.growth === null ? null : Math.round(trend.growth*100);
                const strength = trendStrength(trend, maxFrequency);
                const isOpen = expanded === identity;
                return <article key={`${trend.keyword}-${trend.category}`} className={`${styles.trendCard} ${index === 0 ? styles.trendCardFeatured : ""}`} onClick={(event) => {
                  if ((event.target as HTMLElement).closest("button, a, input, select, details")) return;
                  setExpanded((current) => current === identity ? null : identity);
                }}>
                  <span className={styles.rank}>{index + 1}</span>
                  <div className={styles.trendInfo}><div className={styles.trendHeading}><div className={styles.nameAndSources}><div className={styles.keywordRow}><h3>{trend.keyword}</h3>{trend.relatedTopics.length>0&&<span className={styles.relatedTopic} title={`Kapcsolódó téma: ${trend.relatedTopics.join(", ")}`}>kapcsolódik: {trend.relatedTopics.join(", ")}</span>}</div><div className={styles.sourceTags}>{(trend.sources.length ? trend.sources : filters.sources.length ? filters.sources : ["Forrás nem ismert"]).map((source) => <span key={source}>{source}</span>)}<button type="button" onClick={() => setExpanded(identity)}>Elemzés</button></div></div><div className={styles.rowMeta}><span className={styles.category} style={{ "--category-color": CATEGORY_COLOR[trend.category] ?? "#4da9ff" } as React.CSSProperties}><CategoryIcon category={trend.category} />{trend.category}</span>{trend.firstSeen && Date.parse(asOf ?? "") - Date.parse(trend.firstSeen) <= 7 * 86_400_000 && <span className={styles.newBadge}><TrendsIcon name="spark" /> Új</span>}{trend.status === "Most felkapott" ? <span className={styles.hotBadge}>Most felkapott</span> : <span className={styles.activeBadge}>{trend.status}</span>}{trend.lastSeen && <span className={styles.freshness}><TrendsIcon name="clock" />{relativeTime(trend.lastSeen)}</span>}</div></div><p><span className={styles.topicDescription}>{trend.keyword} említéseinek alakulása a kiválasztott magyar online hírforrásokban.</span><span className={styles.topicSummary}>{trend.frequency.toLocaleString("hu-HU")} kapcsolat · {filters.period === "custom" ? "egyedi időszak" : filters.period}</span></p></div>
                  <button type="button" className={styles.sparkButton} onClick={() => setExpanded(isOpen ? null : identity)} aria-expanded={isOpen} aria-label={`${trend.keyword} grafikon részletei`}>{historical ? <SparklineMini history={historical.firstSeen === null ? [] : points} period={filters.period} tone={index % 2 ? "purple" : "blue"} /> : <span className={styles.sparkEmpty}>{historyErrors[identity] ? "Idősor nem elérhető" : "Idősor betöltése…"}</span>}</button>
                  <div className={styles.hitStat}><span>Cikk–kulcsszó kapcsolat</span><div className={styles.hitNumbers}><strong>{trend.frequency.toLocaleString("hu-HU")}</strong><b className={growth !== null && growth < 0 ? styles.negative : ""}>{growth === null ? trend.status : `${growth >= 0 ? "+" : ""}${growth}%`}</b></div></div>
                  <div className={styles.strength}><span>Relatív index (0–100)</span><div>{Array.from({ length: 10 }, (_, bar) => <i key={bar} className={bar < Math.ceil(strength / 10) ? styles.strengthOn : ""} />)}<b>{strength}</b></div></div>
                  <button type="button" className={styles.expandButton} onClick={() => setExpanded(isOpen ? null : identity)} aria-expanded={isOpen} aria-label={`${trend.keyword} részletei`}><TrendsIcon name="chevron" /></button>
                  {isOpen && <TrendIntelligencePanel key={`${identity}-${scopeKey}`} keyword={trend.keyword} category={trend.category} scope={{...filters,asOf}} onClose={()=>setExpanded(null)}/>}
                </article>;
              })}
            </section>
            {!loading && !error && visibleCount < filteredTrends.length && <button type="button" className={styles.moreTrends} onClick={()=>setVisibleCount(n=>n+12)}>További 12 trend</button>}
          </main>

          <aside className={styles.rightRail}>
            <section className={`${styles.sideCard} ${styles.growingCard}`}><header><TrendsIcon name="↗" /><div><h2>Top növekvő témák</h2><p>Az aktuális időszakban</p></div></header>{growing.length ? <ol>{growing.map((trend, index) => <li key={trendIdentity(trend.keyword,trend.category)}><i>{index + 1}</i><button type="button" onClick={() => updateFilter("keyword", trend.keyword)}>{trend.keyword}</button><b>↑ +{Math.round(finiteNumber(trend.growth) * 100)}%</b></li>)}</ol> : <><ol className={styles.sidePreview} data-state="preview">{Array.from({ length: 5 }, (_, index) => <li key={index}><i>{index + 1}</i><span /><b>—</b></li>)}</ol><p className={styles.compactFallback}>Az előző azonos hosszúságú időszak nélkül növekedési rangsor még nem számítható.</p></>}</section>
            <section className={`${styles.sideCard} ${styles.newTopicsCard}`}><header><TrendsIcon name="spark" /><div><h2>Új témák</h2><p>{newlySeen.length ? "Frissen észlelt kulcsszavak" : "A kiválasztott időszak témái"}</p></div></header>{topicSidebarRows.length ? <ul className={styles.newTopicsList}>{topicSidebarRows.map((trend) => <li key={trendIdentity(trend.keyword,trend.category)}><em>ÚJ</em><button type="button" onClick={() => updateFilter("keyword", trend.keyword)}>{trend.keyword}</button><time>{relativeTime(newlySeen.length ? trend.firstSeen : trend.lastSeen || trend.firstSeen)}</time></li>)}</ul> : <ul className={styles.sidePreview} data-state="preview">{Array.from({ length: 5 }, (_, index) => <li key={index}><em>ÚJ</em><span /><time>—</time></li>)}</ul>}{!topicSidebarRows.length && <p className={styles.compactFallback}>Még nincs megjeleníthető téma.</p>}</section>
            <section className={styles.sideCard}><header><TrendsIcon name="category-other" /><div><h2>Források megoszlása</h2><p>{sourceTotal ? "A kiválasztott időszakban" : "Hiteles aggregált adatra vár"}</p></div></header><div className={styles.sourceEmpty}><div className={`${styles.emptyDonut} ${sourceTotal ? styles.dataDonut : ""}`}>{sourceTotal ? <SourceDonut rows={sourceBreakdown} total={sourceTotal} /> : null}<span>{sourceTotal ? sourceTotal.toLocaleString("hu-HU") : "—"}<small>{sourceTotal ? "kapcsolat" : "nincs adat"}</small></span></div><div className={styles.donutLegend} aria-label={sourceTotal ? "Források megoszlása" : "Nincs forrásmegoszlási adat"}>{sourceTotal ? sourceBreakdown.slice(0, 5).map((item, i) => <div key={item.source} title={`${item.source}: ${item.count.toLocaleString("hu-HU")} kapcsolat, ${Math.round(item.count/sourceTotal*100)}%`}><i style={{ background: SOURCE_PALETTE[i % SOURCE_PALETTE.length] }} /><span>{item.source}</span><b>{Math.round(item.count / sourceTotal * 100)}%</b></div>) : Array.from({ length: 4 }, (_, i) => <div key={i}><i /><span />—</div>)}</div></div></section>
            <section className={styles.sideCard}><header><TrendsIcon name="↗" /><div><h2>Trend aktivitás</h2><p>A megjelenített témák aktivitása</p></div></header>{activity.some((item) => item > 0) ? <div className={styles.activityBars}>{activity.map((value, index) => <i key={activityPoints[index].label} title={`${pointLabel(activityPoints[index].label, filters.period==="24h")}: ${value.toLocaleString("hu-HU")} kapcsolat`} style={{ height: `${value / Math.max(1, ...activity) * 100}%` }} />)}</div> : <div className={`${styles.activityBars} ${styles.activityPreview}`} data-state="preview">{Array.from({ length: 24 }, (_, index) => <i key={index} />)}</div>}<p className={styles.compactFallback}>{activityRangeLabel(activityPoints, filters.period)}</p></section>
          </aside>
        </div>
      </section>


    </div>
  );
}
