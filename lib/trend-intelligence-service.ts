import type { RowDataPacket } from "mysql2/promise";
import { comparison, isoTime, makePoints, sqlTime, TREND_UNIT, type TrendQuery } from "./trend-intelligence";
export type Reader = { execute: (sql: string, values: (string | number)[]) => Promise<[RowDataPacket[], unknown]> };
const SOURCE = "COALESCE(NULLIF(LOWER(TRIM(a.source)), ''), 'ismeretlen forrás')";
const CATEGORY = "COALESCE(NULLIF(TRIM(k.category), ''), NULLIF(TRIM(a.category), ''), 'Egyéb')";
// One retained article/keyword/category association, independent of retries or legacy period snapshots.
export function observationSql(q: TrendQuery) {
  const where = ["k.created_at < ?", "TRIM(k.keyword) <> ''"];
  const values: (string | number)[] = [sqlTime(q.window.end)];
  if (q.keyword) { where.push("k.keyword = ?"); values.push(q.keyword); }
  if (q.category !== undefined) { where.push(`${CATEGORY} = ?`); values.push(q.category); }
  if (q.categories.length) { where.push(`LOWER(${CATEGORY}) IN (${q.categories.map(()=>"?").join(",")})`); values.push(...q.categories); }
  if (q.sources.length) { where.push(`${SOURCE} IN (${q.sources.map(()=>"?").join(",")})`); values.push(...q.sources); }
  return { sql: `WITH observations AS (
    SELECT k.article_id, TRIM(k.keyword) AS keyword, ${CATEGORY} AS category, ${SOURCE} AS source,
      MIN(k.created_at) AS observed_at
    FROM keywords k JOIN articles a ON a.id = k.article_id
      JOIN summaries published ON published.article_id = a.id AND published.ai_clean = 1
    WHERE ${where.join(" AND ")}
    GROUP BY k.article_id, TRIM(k.keyword), ${CATEGORY}, ${SOURCE}
  )`, values };
}
const HINT = "SELECT /*+ MAX_EXECUTION_TIME(5000) */";
function count(value: unknown) { const n = Number(value); if (!Number.isSafeInteger(n) || n < 0) throw new Error("invalid_db_count"); return n; }
export async function readTrendIntelligence(db: Reader, q: TrendQuery, mode: "list" | "history" | "articles") {
  const base = observationSql(q);
  const start = sqlTime(q.window.start), end = sqlTime(q.window.end), previous = sqlTime(q.window.previousStart);
  const dateFormat = q.window.resolution === "hour" ? "%Y-%m-%dT%H:00:00.000Z" : "%Y-%m-%dT00:00:00.000Z";
  if (mode === "articles") {
    if (!q.keyword) throw new Error("keyword_required");
    let from = q.window.start, to = q.window.end;
    if (q.bucket) {
      const step = q.window.resolution === "hour" ? 3600000 : 86400000;
      const ms = Date.parse(q.bucket);
      if (ms % step !== 0) throw new Error("invalid_bucket");
      from = new Date(Math.max(ms,Date.parse(from))).toISOString();
      to = new Date(Math.min(ms+step,Date.parse(to))).toISOString();
    }
    const [rows] = await db.execute(`${base.sql} ${HINT}
      a.id, a.title, a.url_canonical AS url, o.source, a.published_at AS date, o.observed_at,
      (SELECT s.content FROM summaries s WHERE s.article_id = a.id AND s.ai_clean = 1 ORDER BY s.created_at DESC, s.id DESC LIMIT 1) AS summary
      FROM observations o JOIN articles a ON a.id = o.article_id
      WHERE o.observed_at >= ? AND o.observed_at < ?
      ORDER BY o.observed_at DESC, a.id DESC LIMIT 51 OFFSET ?`, [...base.values,sqlTime(from),sqlTime(to),q.offset]);
    return { version:2, unit:TREND_UNIT, window:{start:from,end:to}, articles:rows.slice(0,50).map(r=>({...r,date:isoTime(r.date),observedAt:isoTime(r.observed_at)})), nextOffset:rows.length>50 ? q.offset+50 : null };
  }
  const [totals] = await db.execute(`${base.sql} ${HINT} keyword, category,
    SUM(observed_at >= ? AND observed_at < ?) AS freq,
    SUM(observed_at >= ? AND observed_at < ?) AS previous_total,
    MIN(observed_at) AS first_seen, MAX(observed_at) AS last_seen,
    GROUP_CONCAT(DISTINCT CASE WHEN observed_at >= ? THEN source END SEPARATOR '|') AS sources
    FROM observations GROUP BY keyword, category
    ${mode === "list" ? "HAVING freq > 0" : ""}
    ORDER BY freq DESC, keyword ASC, category ASC LIMIT 501`, [...base.values,start,end,previous,start,start]);
  if (mode === "history" && totals.length > 1) throw new Error("ambiguous_category");
  const trends = totals.slice(0,500).map(r => ({keyword:String(r.keyword),category:String(r.category),freq:count(r.freq),previous_total:count(r.previous_total),
    ...comparison(count(r.freq),count(r.previous_total)),first_seen:isoTime(r.first_seen),last_seen:isoTime(r.last_seen),sources:r.sources ?? ""}));
  const [buckets] = await db.execute(`${base.sql} ${HINT} DATE_FORMAT(observed_at, '${dateFormat}') AS timestamp,
    source, COUNT(*) AS count FROM observations WHERE observed_at >= ? AND observed_at < ?
    GROUP BY timestamp, source ORDER BY timestamp, source LIMIT 20001`, [...base.values,start,end]);
  if (buckets.length > 20000) throw new Error("too_many_series");
  const points = makePoints(q.window, buckets.map(r=>({timestamp:String(r.timestamp),source:String(r.source),count:count(r.count)})));
  const sourceMap = new Map<string,number>();
  points.forEach(p=>Object.entries(p.sources).forEach(([s,n])=>sourceMap.set(s,(sourceMap.get(s)??0)+n)));
  if (mode === "list") return { version:2, unit:TREND_UNIT, status:"ok", window:q.window,trends,truncated:totals.length>500,
    sourceBreakdown:[...sourceMap].map(([source,count])=>({source,count})).sort((a,b)=>b.count-a.count),
    activity:points.map(p=>({label:p.timestamp,count:p.freq})), coverage:"retained_article_keyword_associations" };
  const t = trends[0];
  const total = points.reduce((sum,p)=>sum+p.freq,0);
  return {version:2,unit:TREND_UNIT,keyword:t?.keyword ?? q.keyword,category:t?.category ?? q.category ?? null,window:q.window,
    history:points,sources:[...sourceMap.keys()],total,previousTotal:t?.previous_total ?? 0,...comparison(total,t?.previous_total ?? 0),
    firstSeen:t?.first_seen ?? null,lastSeen:t?.last_seen ?? null,coverage:"retained_article_keyword_associations"};
}
