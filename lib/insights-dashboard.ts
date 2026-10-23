export type DataRow = Record<string, any>;
export function rows(value: unknown): DataRow[] {
  return Array.isArray(value) ? value.filter(v => v && typeof v === "object" && !Array.isArray(v)) : [];
}
export function count(value: unknown): number {
  if ((typeof value !== "number" && typeof value !== "string") || String(value).trim() === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
export function sentimentCounts(data: DataRow | undefined) {
  const values = [count(data?.positive), count(data?.neutral), count(data?.negative)];
  const total = values.reduce((a, b) => a + b, 0);
  return { values, total, average: total ? (values[0] - values[2]) / total : null };
}
export function activityRows(data: DataRow | undefined) {
  const hours = Array.isArray(data?.hours) ? data.hours.filter((h: unknown) => Number.isInteger(h) && Number(h) >= 0 && Number(h) < 24) : [];
  const categories: string[] = Array.isArray(data?.categories) ? data.categories.filter((c: unknown) => typeof c === "string" && c.trim()) : [];
  return categories.map(category => ({ category, values: hours.map((h: number) => ({ hour: h, value: count(data?.matrix?.[category]?.[h]) })) }))
    .filter(row => row.values.some((v: { value: number }) => v.value > 0));
}
export function clickbaitRows(data: DataRow | undefined) {
  return rows(data?.sources).filter(r => typeof r.source === "string" && count(r.count) > 0 && r.avg_clickbait != null && Number.isFinite(Number(r.avg_clickbait)) && Number(r.avg_clickbait) >= 0 && Number(r.avg_clickbait) <= 100)
    .map(r => ({ name: r.source, score: Number(r.avg_clickbait), articles: count(r.count) })).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}
/** SQL timestamps are UTC; user-facing labels always use Budapest. */
export function timestamp(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const text = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? value.replace(" ", "T") + "Z" : value;
  const time = Date.parse(text);
  return Number.isFinite(time) ? time : null;
}
export function bucketTime(time: number, period: string) {
  if (period === "24h" || period === "today") return Math.floor(time / 3600000) * 3600000;
  const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Budapest", year: "numeric", month: "2-digit", day: "2-digit" }).format(time);
  // Noon is a stable label anchor; grouping itself uses the Budapest date.
  return Date.parse(day + "T12:00:00Z");
}
export function timeLabel(value: number, period: string, detailed = false) {
  return new Intl.DateTimeFormat("hu-HU", { timeZone: "Europe/Budapest",
    ...(detailed ? { year: "numeric" as const } : {}),
    ...((period === "24h" || period === "today") && !detailed ? {} : { month: "short" as const, day: "numeric" as const }),
    ...(period === "24h" || period === "today" || detailed ? { hour: "2-digit" as const, minute: "2-digit" as const } : {}),
  }).format(value);
}
export function categorySeries(data: unknown, period: string, limit = 6) {
  const categories = rows(data).filter(c => typeof c.category === "string" && c.category.trim() && rows(c.points).some(p => timestamp(p.date) !== null && count(p.count) > 0))
    .sort((a,b) => rows(b.points).reduce((n,p)=>n+count(p.count),0) - rows(a.points).reduce((n,p)=>n+count(p.count),0) || a.category.localeCompare(b.category, "hu"))
    .slice(0, limit);
  const points = new Map<number, DataRow>();
  categories.forEach((category, i) => rows(category.points).forEach(p => {
    const rawTime = timestamp(p.date);
    if (rawTime === null) return;
    const time = bucketTime(rawTime, period);
    const row = points.get(time) ?? { time };
    row[`v${i}`] = count(row[`v${i}`]) + count(p.count);
    points.set(time, row);
  }));
  const times = [...points.keys()].sort((a,b)=>a-b);
  const step = period === "24h" || period === "today" ? 3600000 : 86400000;
  if (times.length && times[times.length-1]-times[0] <= 92*86400000) {
    for (let time=times[0];time<=times[times.length-1];time+=step) {
      if (!points.has(time)) points.set(time,{time});
    }
  }
  // Missing category buckets represent zero observed summaries, not interpolation.
  for (const point of points.values()) categories.forEach((_,i)=>point[`v${i}`] ??= 0);
  return { categories: categories.map(c => c.category as string), points: [...points.values()].sort((a, b) => a.time - b.time) };
}
export function categorySentiments(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).flatMap(([category, raw]) => {
    const s = sentimentCounts(raw as DataRow);
    return s.total ? [{ category, ...s, ratio: s.values[2] / s.total * 100 }] : [];
  }).sort((a,b) => b.ratio-a.ratio || a.category.localeCompare(b.category, "hu"));
}
export function sentimentSeries(value: unknown, period: string) {
  const points = new Map<number, {time:number; positive:number; neutral:number; negative:number}>();
  for (const row of rows(value)) {
    const rawTime = timestamp(row.date);
    if (rawTime === null) continue;
    const time = bucketTime(rawTime,period);
    const point = points.get(time) ?? {time, positive:0, neutral:0, negative:0};
    point.positive += count(row.positive); point.neutral += count(row.neutral); point.negative += count(row.negative);
    points.set(time,point);
  }
  const times=[...points.keys()].sort((a,b)=>a-b), step=period==="24h"||period==="today"?3600000:86400000;
  if (times.length && times[times.length-1]-times[0] <= 92*86400000) {
    for(let time=times[0];time<=times[times.length-1];time+=step) {
      if(!points.has(time)) points.set(time,{time,positive:0,neutral:0,negative:0});
    }
  }
  return [...points.values()].sort((a,b)=>a.time-b.time).map(p => ({...p, score:sentimentCounts(p).average, total:sentimentCounts(p).total}));
}
export function forecastPoints(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).flatMap(([category, data]) => rows(data).flatMap(p => {
    const time = timestamp(p.date);
    if (time === null || p.predicted == null || String(p.predicted).trim() === "" || !Number.isFinite(Number(p.predicted)) || Number(p.predicted)<0) return [];
    return [{category, time, predicted:Number(p.predicted)}];
  })).sort((a,b)=>a.time-b.time || a.category.localeCompare(b.category,"hu"));
}
