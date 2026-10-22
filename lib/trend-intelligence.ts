export const TREND_UNIT = "distinct_article_keyword_category";
export const PERIODS = ["24h", "7d", "30d", "90d", "365d", "custom"] as const;
export type TrendWindow = { period: string; start: string; end: string; previousStart: string; resolution: "hour" | "day"; asOf: string };
export type TrendQuery = { window: TrendWindow; keyword: string; category?: string; sources: string[]; categories: string[]; bucket?: string; offset: number };
export type TrendPoint = { timestamp: string; end: string; freq: number; sources: Record<string, number>; day?: string; hour?: number };
export type TrendHistory = { version: 2; unit: string; keyword: string; category: string | null; window: TrendWindow; history: TrendPoint[]; sources: string[]; total: number; previousTotal: number; growth: number | null; status: string; firstSeen: string | null; lastSeen: string | null; coverage: string };
const DAY = 86400000;
export function sqlTime(iso: string) { return iso.slice(0,19).replace("T", " "); }
export function isoTime(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string") return null;
  const parsed = Date.parse(value.includes("T") ? value : value.replace(" ","T") + "Z");
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}
function calendar(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("invalid_date");
  const ms = Date.parse(value + "T00:00:00Z");
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0,10) !== value) throw new Error("invalid_date");
  return ms;
}
function list(raw: string | null) {
  if (!raw) return [];
  const items = [...new Set(raw.split(",").map(x => x.trim().toLocaleLowerCase("hu-HU")).filter(Boolean))];
  if (items.length > 20 || items.some(x => x.length > 190)) throw new Error("invalid_filters");
  return items.sort();
}
export function parseTrendQuery(params: URLSearchParams, now = new Date()): TrendQuery {
  const period = params.get("period") ?? "30d";
  if (!(PERIODS as readonly string[]).includes(period)) throw new Error("invalid_period");
  const keyword = (params.get("keyword") ?? "").trim();
  const category = params.has("category") ? params.get("category")!.trim() : undefined;
  if (keyword.length > 100 || (category?.length ?? 0) > 190) throw new Error("invalid_identity");
  const rawAsOf = params.get("asOf");
  const requested = rawAsOf ? Date.parse(rawAsOf) : now.getTime();
  if (!Number.isFinite(requested) || requested > now.getTime() + 1000 || now.getTime() - requested > 3600000) throw new Error("invalid_asof");
  const anchor = Math.floor(requested / 60000) * 60000;
  let end = anchor;
  let start: number;
  if (period === "24h") { end = Math.floor(anchor / 3600000) * 3600000; start = end - DAY; }
  else if (period === "custom") {
    start = calendar(params.get("startDate"));
    const requestedEnd = calendar(params.get("endDate")) + DAY;
    if (requestedEnd <= start || requestedEnd - start > 366 * DAY || start >= anchor) throw new Error("invalid_range");
    end = Math.min(requestedEnd, anchor);
  } else { start = Math.floor(anchor / DAY) * DAY - (Number(period.slice(0,-1)) - 1) * DAY; }
  const bucket = params.get("bucket") ?? undefined;
  if (bucket && (!Number.isFinite(Date.parse(bucket)) || Date.parse(bucket) < Math.floor(start / (period === "24h" ? 3600000 : DAY)) * (period === "24h" ? 3600000 : DAY) || Date.parse(bucket) >= end)) throw new Error("invalid_bucket");
  const offset = Number(params.get("offset") ?? 0);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 10000) throw new Error("invalid_offset");
  return { keyword, category, sources:list(params.get("sources")), categories:list(params.get("categories")), bucket, offset,
    window: {period,start:new Date(start).toISOString(),end:new Date(end).toISOString(),previousStart:new Date(start-(end-start)).toISOString(),resolution:period === "24h" ? "hour" : "day",asOf:new Date(anchor).toISOString()} };
}
export function comparison(total: number, previous: number) {
  const growth = previous > 0 ? (total - previous) / previous : null;
  const status = previous === 0 ? (total > 0 ? "Új aktivitás" : "Nincs aktivitás") : total >= 10 && growth! >= 1 ? "Most felkapott" : growth! > .1 ? "Erősödik" : growth! < -.1 ? "Csökken" : "Stabil";
  return { growth, status };
}
export function makePoints(window: TrendWindow, rows: {timestamp: string; source: string; count: number}[]): TrendPoint[] {
  const step = window.resolution === "hour" ? 3600000 : DAY;
  const start = Date.parse(window.start), end = Date.parse(window.end);
  const points: TrendPoint[] = [];
  for (let ms = Math.floor(start / step) * step; ms < end; ms += step) {
    const timestamp = new Date(ms).toISOString();
    points.push({ timestamp, end:new Date(Math.min(ms+step,end)).toISOString(), freq:0, sources:Object.create(null), day:timestamp.slice(0,10), ...(window.resolution === "hour" ? {hour:new Date(ms).getUTCHours()} : {}) });
  }
  const byTime = new Map(points.map(p => [p.timestamp,p]));
  for (const row of rows) {
    const point = byTime.get(row.timestamp);
    if (!point || !Number.isSafeInteger(row.count) || row.count < 0) throw new Error("invalid_aggregate");
    point.sources[row.source] = (point.sources[row.source] ?? 0) + row.count;
    point.freq += row.count;
  }
  return points;
}
export function trendIdentity(keyword: string, category: string) { return JSON.stringify([keyword.trim().toLocaleLowerCase("hu-HU"),category.trim().toLocaleLowerCase("hu-HU")]); }
export function validateHistory(value: unknown): TrendHistory {
  if (!value || typeof value !== "object") throw new Error("invalid_history");
  const p = value as TrendHistory;
  if (p.version !== 2 || p.unit !== TREND_UNIT || !Array.isArray(p.history) || p.history.length > 367 || !Array.isArray(p.sources) || !p.window || !Number.isFinite(Date.parse(p.window.start)) || !Number.isFinite(Date.parse(p.window.end))) throw new Error("invalid_history");
  let last = -Infinity, sum = 0;
  for (const point of p.history) {
    const time = Date.parse(point.timestamp);
    if (!Number.isFinite(time) || time <= last || !Number.isSafeInteger(point.freq) || point.freq < 0 || !point.sources || typeof point.sources !== "object" || !Number.isFinite(Date.parse(point.end))) throw new Error("invalid_history_point");
    const values = Object.values(point.sources);
    if (values.some(n => !Number.isSafeInteger(n) || n < 0) || values.reduce((a,b)=>a+b,0) !== point.freq) throw new Error("invalid_source_totals");
    sum += point.freq; last = time;
  }
  if (sum !== p.total || !Number.isSafeInteger(p.previousTotal) || p.previousTotal < 0 || p.growth !== null && !Number.isFinite(p.growth)) throw new Error("invalid_history_total");
  return p;
}
export function pointLabel(timestamp: string, hourly = false) {
  return new Date(timestamp).toLocaleString("hu-HU", {timeZone:hourly ? "Europe/Budapest" : "UTC",month:"short",day:"numeric", ...(hourly ? {hour:"2-digit",minute:"2-digit",timeZoneName:"short"} as const : {})});
}
