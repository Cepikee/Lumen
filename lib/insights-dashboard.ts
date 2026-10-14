export type DataRow = Record<string, any>;
export function rows(value: unknown): DataRow[] {
  return Array.isArray(value) ? value.filter(v => v && typeof v === "object" && !Array.isArray(v)) : [];
}
export function count(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
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
    .map(r => ({ name: r.source, score: Number(r.avg_clickbait) })).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}
export function categorySeries(data: unknown, period: string) {
  const categories = rows(data).filter(c => typeof c.category === "string" && c.category.trim() && rows(c.points).some(p => count(p.count) > 0));
  const points = new Map<number, DataRow>();
  categories.forEach((category, i) => rows(category.points).forEach(p => {
    const rawDate = typeof p.date === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(p.date) ? p.date.replace(" ", "T") + "Z" : p.date;
    const date = rawDate ? new Date(rawDate) : null;
    if (!date || !Number.isFinite(date.getTime())) return;
    if (period === "24h") date.setUTCMinutes(0, 0, 0); else date.setUTCHours(0, 0, 0, 0);
    const time = date.getTime();
    const row = points.get(time) ?? { time };
    row[`v${i}`] = count(row[`v${i}`]) + count(p.count);
    points.set(time, row);
  }));
  return { categories: categories.map(c => c.category as string), points: [...points.values()].sort((a, b) => a.time - b.time) };
}
