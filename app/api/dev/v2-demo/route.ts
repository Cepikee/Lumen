import { NextResponse } from "next/server";
import mysql, { RowDataPacket } from "mysql2/promise";
import { evaluatePremium } from "@/lib/entitlements-core";
import { isV2DemoAllowed, selectedDemoUser, toSafeNumber } from "@/lib/dev-v2-demo";

export const dynamic = "force-dynamic";

type Row = RowDataPacket & Record<string, unknown>;

function dbConfig() {
  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  };
}

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: message, code }, { status, headers: { "Cache-Control": "no-store" } });
}

function preserveTypedValue(value: unknown): unknown {
  if (value == null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]")))) return value;
  try { return JSON.parse(trimmed); } catch { return value; }
}

export async function GET(request: Request) {
  const requestHost = new URL(request.url).hostname;
  if (!isV2DemoAllowed(process.env, requestHost)) return new NextResponse(null, { status: 404 });
  const selectedUser = selectedDemoUser(new URL(request.url).searchParams.get("user"));
  const connection = await mysql.createConnection(dbConfig()).catch(() => null);
  if (!connection) return jsonError("demo_db_unavailable", "A lokális demo adatbázis jelenleg nem érhető el.", 503);

  try {
    const [articles] = await connection.query<Row[]>(
      `SELECT a.id,a.title,a.content_text contentText,a.url_canonical canonicalUrl,a.published_at publishedAt,
              a.source,a.category,s.id sourceId,s.name sourceName
         FROM articles a LEFT JOIN sources s ON s.id=a.source_id
        WHERE a.url_canonical LIKE 'https://demo.example.invalid/article/%'
        ORDER BY a.id ASC LIMIT 3`,
    );
    if (articles.length < 3) return jsonError("demo_fixture_missing", "A háromforrásos demo fixture nincs feltöltve. Futtasd a demo bootstrapot.", 409);

    const demoArticleIds = articles.map((row) => Number(row.id));
    const placeholders = demoArticleIds.map(() => "?").join(",");
    const [entities] = await connection.query<Row[]>(
      "SELECT id,entity_type entityType,canonical_name canonicalName,normalized_name normalizedName,status,confidence_current confidence FROM v2_entities ORDER BY id",
    );
    const [relations] = await connection.query<Row[]>(
      `SELECT r.id,r.predicate,r.status,r.confidence,
              s.canonical_name subjectName,o.canonical_name objectName,r.object_value objectValue
         FROM v2_entity_relations r
         JOIN v2_entities s ON s.id=r.subject_entity_id
         LEFT JOIN v2_entities o ON o.id=r.object_entity_id
        ORDER BY r.id`,
    );
    const [claims] = await connection.query<Row[]>(
      `SELECT c.id,c.predicate,c.claim_type claimType,c.normalized_value normalizedValue,c.value_json valueJson,
              c.confidence,c.status,c.article_id articleId,c.source_id sourceId,
              e.canonical_name subjectName,s.name sourceName,ce.text_span evidence
         FROM v2_claims c
         LEFT JOIN v2_entities e ON e.id=c.subject_entity_id
         LEFT JOIN sources s ON s.id=c.source_id
         LEFT JOIN v2_claim_evidence ce ON ce.claim_id=c.id
        WHERE c.article_id IN (${placeholders})
        ORDER BY c.id`, demoArticleIds,
    );
    const [events] = await connection.query<Row[]>(
      `SELECT e.id,e.event_type eventType,e.canonical_title title,e.status,e.start_at startAt,e.end_at endAt,e.confidence,
              COUNT(DISTINCT ea.article_id) articleCount
         FROM v2_events e LEFT JOIN v2_event_articles ea ON ea.event_id=e.id
        GROUP BY e.id ORDER BY e.id`,
    );
    const eventId = events.length ? Number(events[0].id) : null;
    const [timelineRows] = eventId == null ? [[] as Row[]] : await connection.query<Row[]>(
      `SELECT ti.id,ti.item_type itemType,ti.item_id itemId,ti.valid_at validAt,ti.display_at displayAt,
              ti.confidence,ti.ordering_key orderingKey
         FROM v2_timeline_items ti JOIN v2_timelines t ON t.id=ti.timeline_id
        WHERE t.owner_type='event' AND t.owner_id=? ORDER BY ti.ordering_key,ti.id LIMIT 25`, [eventId],
    );
    const [conflicts] = await connection.query<Row[]>(
      "SELECT id,conflict_type conflictType,severity,state,explanation_json explanation FROM v2_conflicts ORDER BY detected_at,id",
    );
    const [evidenceCount] = await connection.query<Row[]>(
      `SELECT COUNT(*) count FROM v2_claim_evidence WHERE article_id IN (${placeholders})`, demoArticleIds,
    );
    const [relationEvidenceCount] = await connection.query<Row[]>(
      `SELECT COUNT(*) count FROM v2_relation_evidence WHERE article_id IN (${placeholders})`, demoArticleIds,
    );
    const countQueries: Record<string, string> = {
      articles: "SELECT COUNT(*) count FROM articles",
      entities: "SELECT COUNT(*) count FROM v2_entities",
      relations: "SELECT COUNT(*) count FROM v2_entity_relations",
      claims: "SELECT COUNT(*) count FROM v2_claims",
      evidence: "SELECT COUNT(*) count FROM v2_claim_evidence",
      relationEvidence: "SELECT COUNT(*) count FROM v2_relation_evidence",
      events: "SELECT COUNT(*) count FROM v2_events",
      conflicts: "SELECT COUNT(*) count FROM v2_conflicts",
      timelines: "SELECT COUNT(*) count FROM v2_timelines",
    };
    const counts = Object.fromEntries(await Promise.all(Object.entries(countQueries).map(async ([key, sql]) => {
      const [rows] = await connection.query<Row[]>(sql);
      return [key, toSafeNumber(rows[0]?.count)];
    })));
    const [demoUsers] = await connection.query<Row[]>(
      "SELECT id,nickname,is_premium isPremium,premium_until premiumUntil,premium_tier premiumTier FROM users WHERE nickname IN ('demo-free','demo-premium','demo-expired') ORDER BY nickname",
    );
    const entitlementUser = selectedUser === "anonymous" ? null : demoUsers.find((row) => row.nickname === ({ free: "demo-free", premium: "demo-premium", expired: "demo-expired" } as Record<string, string>)[selectedUser]);
    const entitlement = evaluatePremium(entitlementUser ? {
      is_premium: entitlementUser.isPremium,
      premium_until: entitlementUser.premiumUntil,
      premium_tier: entitlementUser.premiumTier,
    } : null);
    const sourceNames = articles.map((row) => String(row.sourceName || row.source || "Ismeretlen forrás"));
    const comparisonMap = new Map<string, Map<string, { value: unknown; rows: Row[] }>>();
    for (const claim of claims) {
      const predicate = String(claim.predicate || "állítás");
      const value = preserveTypedValue(claim.normalizedValue ?? claim.valueJson) ?? "nincs érték";
      const valueKey = typeof value === "string" ? value : JSON.stringify(value);
      if (!comparisonMap.has(predicate)) comparisonMap.set(predicate, new Map());
      const values = comparisonMap.get(predicate)!;
      if (!values.has(valueKey)) values.set(valueKey, { value, rows: [] });
      values.get(valueKey)!.rows.push(claim);
    }
    const comparison = [...comparisonMap.entries()].map(([predicate, values]) => {
      const variants = [...values.values()].map(({ value, rows }) => ({ value, sources: [...new Set(rows.map((row) => String(row.sourceName || "Ismeretlen")))] }));
      const covered = new Set(variants.flatMap((variant) => variant.sources));
      return { predicate, variants, coverage: variants.length > 1 ? "conflict" : covered.size > 1 ? "shared" : "source_only", missing: sourceNames.filter((name) => !covered.has(name)) };
    });
    const pipelineTrace = [
      ["Nyers cikk", articles.length, articles.length, "kész"],
      ["Ingestion", articles.length, articles.length, "kész"],
      ["Entity extraction", articles.length, entities.length, entities.length ? "kész" : "üres"],
      ["Resolution", entities.length, entities.filter((row) => row.status === "accepted").length, "kész"],
      ["Relations", entities.length, relations.length, relations.length ? "kész" : "üres"],
      ["Claims", articles.length, claims.length, claims.length ? "kész" : "üres"],
      ["Event", claims.length, events.length, events.length ? "kész" : "üres"],
      ["Temporal", events.length, timelineRows.length, timelineRows.length ? "kész" : "üres"],
      ["Conflict", claims.length, conflicts.length, conflicts.length ? "kész" : "nincs eltérés"],
      ["Read model", events.length, events.length + timelineRows.length, "kész"],
    ].map(([step, inputCount, outputCount, status]) => ({ step, inputCount, outputCount, status }));
    const latestAudit = (await connection.query<Row[]>("SELECT action,mode,reason,created_at createdAt FROM raw_text_retention_audit ORDER BY id DESC LIMIT 20"))[0];
    const rawPresent = articles.filter((row) => row.contentText != null).length;
    return NextResponse.json({
      meta: { schema: "060", generatedAt: new Date().toISOString(), mode: "localhost-demo", selectedUser },
      articles: articles.map((row) => ({ id: Number(row.id), title: String(row.title), contentText: row.contentText == null ? null : String(row.contentText), canonicalUrl: String(row.canonicalUrl), publishedAt: row.publishedAt, source: String(row.sourceName || row.source || "Ismeretlen forrás"), sourceId: row.sourceId == null ? null : Number(row.sourceId), category: row.category == null ? null : String(row.category) })),
      intelligence: {
        entities: entities.map((row) => ({ id: Number(row.id), type: String(row.entityType), name: String(row.canonicalName), normalizedName: String(row.normalizedName), status: String(row.status), confidence: row.confidence == null ? null : Number(row.confidence) })),
        relations: relations.map((row) => ({ id: Number(row.id), subject: String(row.subjectName), predicate: String(row.predicate), object: row.objectName != null ? String(row.objectName) : row.objectValue != null ? preserveTypedValue(row.objectValue) : "érték", status: String(row.status), confidence: row.confidence == null ? null : Number(row.confidence) })),
        claims: claims.map((row) => ({ id: Number(row.id), predicate: String(row.predicate), type: String(row.claimType), normalizedValue: preserveTypedValue(row.normalizedValue ?? row.valueJson), confidence: row.confidence == null ? null : Number(row.confidence), status: String(row.status), source: String(row.sourceName || "Ismeretlen forrás"), subject: row.subjectName ? String(row.subjectName) : null, evidence: row.evidence ? String(row.evidence) : null })),
        events: events.map((row) => ({ id: Number(row.id), title: String(row.title), type: String(row.eventType), status: String(row.status), articleCount: toSafeNumber(row.articleCount), startAt: row.startAt, endAt: row.endAt })),
        conflicts: conflicts.map((row) => ({ id: Number(row.id), type: String(row.conflictType), severity: String(row.severity), state: String(row.state), explanation: row.explanation ? String(row.explanation) : null })),
        timeline: timelineRows.map((row) => ({ id: Number(row.id), itemType: String(row.itemType), itemId: Number(row.itemId), validAt: row.validAt, displayAt: row.displayAt, confidence: row.confidence == null ? null : Number(row.confidence) })),
        comparison,
      },
      pipelineTrace,
      counts,
      entitlement: { selectedUser, active: entitlement.active, reason: entitlement.reason, tier: entitlement.tier, premiumUntil: entitlement.premiumUntil },
      demoUsers: demoUsers.map((row) => ({
        nickname: String(row.nickname),
        premium: evaluatePremium({ is_premium: row.isPremium, premium_until: row.premiumUntil, premium_tier: row.premiumTier }).active,
        premiumUntil: row.premiumUntil,
      })),
      retention: { rawPresent, rawPurged: articles.length - rawPresent, audit: latestAudit, automaticPurgeOnView: false, policy: { successHours: 24, failedDays: 7 } },
      evidence: { claimSpans: toSafeNumber(evidenceCount[0]?.count), relationSpans: toSafeNumber(relationEvidenceCount[0]?.count) },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("v2_demo_query_failed", error instanceof Error ? error.message : "unknown_error");
    return jsonError("demo_query_failed", "A demo read-model lekérdezés sikertelen.", 500);
  } finally {
    await connection.end();
  }
}
