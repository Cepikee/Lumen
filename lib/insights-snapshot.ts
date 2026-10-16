import { db } from '@/lib/db';
import { normalizeRows, queryOptions, buildSnapshot, detail, select, DAY } from './insights-intelligence';
import { mysqlUtc } from './business-time';
import { createHash } from 'node:crypto';
import { insightsEvents } from './insights-v2';

// One bounded, single-flight snapshot shared by all cards and drill-downs.
// No row truncation is presented as a complete population.
const cache = new Map<number, { expires: number; task: Promise<ReturnType<typeof normalizeRows>> }>();
export async function snapshotRows(end: number, requireExisting = false) {
  const existing = cache.get(end);
  if (existing && existing.expires > Date.now()) return existing.task;
  if (requireExisting) throw new Error('snapshot_expired');
  for (const [key, value] of cache) if (value.expires <= Date.now()) cache.delete(key);
  while (cache.size >= 4) cache.delete(cache.keys().next().value!);
  const task = (async () => {
    const [result] = await db.query(`
      SELECT a.id, a.title, a.category, a.source, DATE_FORMAT(a.published_at,'%Y-%m-%d %H:%i:%s') AS publishedAt,
        a.sentiment, a.score, a.cluster_id AS clusterId, DATE_FORMAT(c.first_published_at,'%Y-%m-%d %H:%i:%s') AS clusterStart,
        c.first_source AS firstSource, s.id AS summaryId, DATE_FORMAT(s.created_at,'%Y-%m-%d %H:%i:%s') AS processedAt,
        s.final_clickbait AS clickbait, s.trend_keywords AS keywords
      FROM articles a
      LEFT JOIN clusters c ON c.id = a.cluster_id
      LEFT JOIN summaries s ON s.id = (
        SELECT s2.id FROM summaries s2 WHERE s2.article_id = a.id AND s2.created_at < ?
        ORDER BY s2.created_at DESC, s2.id DESC LIMIT 1
      )
      WHERE a.published_at >= ? AND a.published_at < ?
      ORDER BY a.published_at DESC, a.id DESC LIMIT 50001
    `, [mysqlUtc(new Date(end)), mysqlUtc(new Date(end-180*DAY)), mysqlUtc(new Date(end))]);
    const rows = result as Record<string, unknown>[];
    if (rows.length > 50000) throw new Error('snapshot_capacity_exceeded');
    return normalizeRows(rows);
  })();
  cache.set(end, { task, expires: Date.now()+600000 });
  try { return await task; } catch (error) { cache.delete(end); throw error; }
}
export async function getInsightsSnapshot(params: URLSearchParams) {
  const options = queryOptions(params);
  const rows = await snapshotRows(options.end, params.has('asOf'));
  const snapshot = buildSnapshot(rows, options);
  const inputHash=createHash('sha256').update(JSON.stringify({window:snapshot.window,filters:snapshot.filters,counts:snapshot.counts,highlights:snapshot.highlights})).digest('hex');
  return { ...snapshot, evidence: detail(rows, options),
    explanation:{kind:'deterministic_observation',modelVersion:'changes-rules-v1',inputHash,generatedAt:snapshot.window.end,
      text:snapshot.counts.baselineAvailable
        ? `${snapshot.counts.current} publikált hír a megfigyelt időszakban, az előző azonos hosszúságú időszakban ${snapshot.counts.previous}.`
        : `${snapshot.counts.current} publikált hír a megfigyelt időszakban. Nincs elegendő korábbi adat az összehasonlításhoz.`,
      evidenceReferences:['window','counts','highlights'],providerCalls:0},
    v2Events:await insightsEvents(select(rows,options),options.start,options.end)};
}
