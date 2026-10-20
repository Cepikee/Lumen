"use strict";

const { readTimelineItems } = require("./temporal-graph-repository");
const { buildSourceComparison } = require("./source-comparison");
const PUBLIC_ENTITY_TYPES = new Set(["person", "company", "organization", "organisation", "location", "place", "project", "product", "topic"]);
function requireConnection(c) { if (!c || typeof c.execute !== "function") throw new TypeError("connection_required"); }
function id(value, field) { if (!/^[1-9][0-9]*$/.test(String(value))) throw new TypeError(`${field}_invalid`); return Number(value); }
function iso(value) { if (value == null) return null; const d = new Date(value); return Number.isNaN(d.getTime()) ? null : d.toISOString(); }
function parseJson(value) { if (value == null) return null; if (typeof value === "object") return value; try { return JSON.parse(value); } catch { return null; } }
function publicEntity(row) {
  if (!row || !PUBLIC_ENTITY_TYPES.has(String(row.entityType))) return null;
  return { id: id(row.id, "entity_id"), type: String(row.entityType), name: String(row.name || "") || null };
}
function publicTimelineItem(item) { return { type: String(item.itemType), id: id(item.itemId, "timeline_item_id"), validAt: iso(item.validAt), displayAt: iso(item.displayAt) }; }
function eventScopeIds(scopeId, options = {}) {
  const values = options.eventIds == null ? [scopeId] : options.eventIds;
  if (!Array.isArray(values) || !values.length || values.length > 200) throw new TypeError("event_ids_invalid");
  const result = [...new Set(values.map((value) => id(value, "event_id")))].sort((a, b) => a - b);
  if (!result.includes(scopeId)) throw new TypeError("event_ids_invalid");
  return result;
}
async function getEntity(connection, entityId, options = {}) {
  requireConnection(connection); const entity = id(entityId, "entity_id");
  const [rows] = await connection.execute("SELECT id,entity_type entityType,canonical_name name,status FROM v2_entities WHERE id=? AND status IN ('active','accepted','review','disputed') LIMIT 1", [entity]);
  if (!rows.length || !PUBLIC_ENTITY_TYPES.has(String(rows[0].entityType))) return null;
  const [aliases] = await connection.execute("SELECT DISTINCT alias name FROM v2_entity_aliases WHERE entity_id=? AND alias IS NOT NULL AND TRIM(alias)<>'' ORDER BY alias ASC LIMIT 100", [entity]);
  const [evidence] = await connection.execute("SELECT COUNT(DISTINCT m.article_id) articleCount,COUNT(DISTINCT a.source_id) sourceCount FROM v2_entity_mentions m JOIN articles a ON a.id=m.article_id WHERE m.entity_id=?", [entity]);
  let timeline = { items: [], nextCursor: null };
  if (options.timeline !== false) timeline = await readTimelineItems(connection, { ownerType: "entity", ownerId: entity, asOf: options.asOf || new Date().toISOString(), limit: Math.min(Number(options.limit || 20), 100), cursor: options.cursor || null, visibility: "public" });
  const publicAliases = [...new Set(aliases.map((row) => String(row.name).trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)).map((name) => ({ name }));
  return { id: id(rows[0].id, "entity_id"), type: String(rows[0].entityType), name: String(rows[0].name || "") || null, aliases: publicAliases, timeline: { items: timeline.items.map(publicTimelineItem), nextCursor: timeline.nextCursor }, evidenceSummary: { articleCount: Number(evidence[0]?.articleCount || 0), sourceCount: Number(evidence[0]?.sourceCount || 0) } };
}
async function getEvent(connection, eventId, options = {}) {
  requireConnection(connection); const event = id(eventId, "event_id");
  const asOf = options.asOf ? new Date(options.asOf) : new Date(); if (Number.isNaN(asOf.getTime())) throw new TypeError("as_of_invalid"); const asOfSql = asOf.toISOString().slice(0, 23).replace("T", " ");
  const [rows] = await connection.execute("SELECT id,status,start_at startAt,end_at endAt FROM v2_events WHERE id=? AND status NOT IN ('archived','retracted','expired','superseded') AND (start_at IS NULL OR start_at <= ?) LIMIT 1", [event, asOfSql]);
  if (!rows.length) return null;
  const [entities] = await connection.execute("SELECT DISTINCT e.id,e.entity_type entityType,e.canonical_name name FROM v2_event_entities ee JOIN v2_entities e ON e.id=ee.entity_id WHERE ee.event_id=? AND e.status IN ('active','accepted','review','disputed') ORDER BY e.canonical_name ASC,e.id ASC LIMIT 100", [event]);
  const [articles] = await connection.execute("SELECT DISTINCT a.id,a.source,a.source_id sourceId,a.published_at publishedAt FROM v2_event_articles ea JOIN articles a ON a.id=ea.article_id WHERE ea.event_id=? AND a.published_at <= ? ORDER BY a.published_at ASC,a.id ASC LIMIT 100", [event, asOfSql]);
  return { id: id(rows[0].id, "event_id"), status: String(rows[0].status), temporal: { start: iso(rows[0].startAt), end: iso(rows[0].endAt) }, entities: entities.map(publicEntity).filter(Boolean), articles: articles.map((row) => ({ id: id(row.id, "article_id"), source: typeof row.source === "string" && row.source.trim() ? row.source.trim() : null, publishedAt: iso(row.publishedAt) })), evidenceSummary: { articleCount: articles.length, sourceCount: new Set(articles.map((row) => row.sourceId || String(row.source || "").trim().toLowerCase()).filter(Boolean)).size, entityCount: entities.length } };
}
function publicClaimStatus(value) { const map = { observed: "reported", candidate: "asserted", review: "asserted", disputed: "disputed", superseded: "conditional", retracted: "conditional" }; return map[String(value)] || "reported"; }
function publicClaimValue(value) { if (value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value; if (typeof value === "object" && !Array.isArray(value)) { const result = {}; if (Object.prototype.hasOwnProperty.call(value, "value")) result.value = value.value; if (typeof value.unit === "string" && value.unit.trim()) result.unit = value.unit.trim(); return result; } return null; }
async function getClaim(connection, claimId, options = {}) {
  requireConnection(connection); const claim = id(claimId, "claim_id");
  const asOf = options.asOf ? new Date(options.asOf) : null; if (asOf && Number.isNaN(asOf.getTime())) throw new TypeError("as_of_invalid"); const asOfSql = asOf ? asOf.toISOString().slice(0, 23).replace("T", " ") : null;
  const [rows] = await connection.execute("SELECT c.id,c.claim_type claimType,c.value_json valueJson,c.status,c.valid_from validFrom,c.valid_until validUntil,c.subject_entity_id subjectId,e.canonical_name subjectName FROM v2_claims c LEFT JOIN v2_entities e ON e.id=c.subject_entity_id WHERE c.id=? AND (? IS NULL OR (c.valid_from IS NULL OR c.valid_from <= ?) AND (c.valid_until IS NULL OR c.valid_until > ?)) LIMIT 1", [claim, asOfSql, asOfSql, asOfSql]);
  if (!rows.length) return null; const row = rows[0];
  const [evidence] = await connection.execute("SELECT ce.article_id articleId,ce.source_id sourceId,ce.text_span excerpt,a.source,a.published_at publishedAt FROM v2_claim_evidence ce JOIN articles a ON a.id=ce.article_id WHERE ce.claim_id=? ORDER BY a.published_at ASC,a.id ASC LIMIT 100", [claim]);
  const value = parseJson(row.valueJson);
  return { id: id(row.id, "claim_id"), type: String(row.claimType), value: publicClaimValue(value), attribution: row.subjectId && row.subjectName ? { entityId: id(row.subjectId, "entity_id"), name: String(row.subjectName) } : null, temporal: { start: iso(row.validFrom), end: iso(row.validUntil) }, evidence: evidence.map((item) => ({ articleId: id(item.articleId, "article_id"), source: typeof item.source === "string" && item.source.trim() ? item.source.trim() : null, publishedAt: iso(item.publishedAt), excerpt: typeof item.excerpt === "string" ? item.excerpt.slice(0, 1000) : null })), status: publicClaimStatus(row.status) };
}
async function compareSources(connection, scope, options = {}) {
  requireConnection(connection); const scopeId = id(scope.id, "scope_id");
  let sql; let params; let checkSql;
  if (scope.type === "event") { const eventIds = eventScopeIds(scopeId, options); const placeholders = eventIds.map(() => "?").join(","); checkSql = "SELECT id FROM v2_events WHERE id=? LIMIT 1"; sql = `SELECT s.id sourceId,s.slug sourceKey,s.name source,COUNT(DISTINCT a.id) articleCount,MIN(a.published_at) firstPublishedAt,MAX(a.published_at) lastPublishedAt FROM v2_event_articles ea JOIN articles a ON a.id=ea.article_id JOIN sources s ON s.id=a.source_id WHERE ea.event_id IN (${placeholders}) GROUP BY s.id,s.slug,s.name ORDER BY s.slug,s.id`; params = eventIds; }
  else if (scope.type === "claim") { checkSql = "SELECT id FROM v2_claims WHERE id=? LIMIT 1"; sql = "SELECT s.id sourceId,s.slug sourceKey,s.name source,COUNT(DISTINCT a.id) articleCount,MIN(a.published_at) firstPublishedAt,MAX(a.published_at) lastPublishedAt FROM v2_claim_evidence ce JOIN articles a ON a.id=ce.article_id AND a.source_id=ce.source_id JOIN sources s ON s.id=a.source_id WHERE ce.claim_id=? GROUP BY s.id,s.slug,s.name ORDER BY s.slug,s.id"; params = [scopeId]; }
  else throw new TypeError("scope_type_invalid");
  const [scopeRows] = await connection.execute(checkSql, [scopeId]); if (!scopeRows.length) throw new Error("scope_not_found");
  const [rows] = await connection.execute(sql, params);
  return { scope: { type: scope.type, id: scopeId }, sources: rows.map((row) => ({ id: id(row.sourceId, "source_id"), key: String(row.sourceKey || ""), name: String(row.source || ""), articleCount: Number(row.articleCount || 0), firstPublishedAt: iso(row.firstPublishedAt), lastPublishedAt: iso(row.lastPublishedAt) })).filter((source) => source.key && source.name) };
}

async function compareSourcesDetailed(connection, scope, options = {}) {
  requireConnection(connection);
  const scopeId = id(scope?.id, "scope_id");
  const page = options.page == null ? 1 : Number(options.page);
  const limit = options.limit == null ? 50 : Number(options.limit);
  if (!Number.isSafeInteger(page) || page < 1) throw new TypeError("page_invalid");
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new TypeError("limit_invalid");
  let rows;
  if (scope?.type === "event") {
    const [scopeRows] = await connection.execute("SELECT id FROM v2_events WHERE id=? LIMIT 1", [scopeId]);
    if (!scopeRows.length) throw new Error("scope_not_found");
    const eventIds = eventScopeIds(scopeId, options); const placeholders = eventIds.map(() => "?").join(",");
    [rows] = await connection.execute(
      `SELECT c.id claimId,c.claim_group_id claimGroupId,c.subject_entity_id subjectEntityId,
              COALESCE(se.canonical_entity_id,se.id) subjectCanonicalId,se.status subjectEntityStatus,
              c.object_entity_id objectEntityId,COALESCE(oe.canonical_entity_id,oe.id) objectCanonicalId,oe.status objectEntityStatus,
              c.predicate,c.claim_type claimType,c.value_json valueJson,c.normalized_value normalizedValue,c.valid_from validFrom,c.valid_until validUntil,c.status,
              a.id articleId,s.id sourceId,s.slug sourceKey,s.name source,a.published_at publishedAt,
              CASE WHEN ce.id IS NULL THEN JSON_ARRAY() ELSE JSON_ARRAYAGG(JSON_OBJECT('id',ce.id,'articleId',ce.article_id,'sourceId',ce.source_id,'textSpan',ce.text_span,'supportType',ce.support_type)) END evidenceJson
       FROM v2_event_articles ea
       JOIN articles a ON a.id=ea.article_id
       JOIN sources s ON s.id=a.source_id
       LEFT JOIN v2_claim_evidence ce ON ce.id=ea.evidence_id AND ce.article_id=a.id AND ce.source_id=s.id
       LEFT JOIN v2_claims c ON c.id=ce.claim_id AND c.article_id=a.id AND c.source_id=s.id
       LEFT JOIN v2_entities se ON se.id=c.subject_entity_id
       LEFT JOIN v2_entities oe ON oe.id=c.object_entity_id
       WHERE ea.event_id IN (${placeholders})
       GROUP BY c.id,c.claim_group_id,c.subject_entity_id,se.canonical_entity_id,se.id,se.status,c.object_entity_id,oe.canonical_entity_id,oe.id,oe.status,c.predicate,c.claim_type,c.value_json,c.normalized_value,c.valid_from,c.valid_until,c.status,a.id,s.id,s.slug,s.name,a.published_at,ea.id,ce.id
       ORDER BY s.slug,a.id,c.id`,
      eventIds,
    );
  } else if (scope?.type === "claim") {
    const [scopeRows] = await connection.execute("SELECT id,claim_group_id claimGroupId FROM v2_claims WHERE id=? LIMIT 1", [scopeId]);
    if (!scopeRows.length) throw new Error("scope_not_found");
    const groupId = scopeRows[0].claimGroupId == null ? null : id(scopeRows[0].claimGroupId, "claim_group_id");
    const predicate = groupId == null ? "c.id=?" : "c.claim_group_id=?";
    [rows] = await connection.execute(
      `SELECT c.id claimId,c.claim_group_id claimGroupId,c.subject_entity_id subjectEntityId,
              COALESCE(se.canonical_entity_id,se.id) subjectCanonicalId,se.status subjectEntityStatus,
              c.object_entity_id objectEntityId,COALESCE(oe.canonical_entity_id,oe.id) objectCanonicalId,oe.status objectEntityStatus,
              c.predicate,c.claim_type claimType,c.value_json valueJson,c.normalized_value normalizedValue,c.valid_from validFrom,c.valid_until validUntil,c.status,
              a.id articleId,s.id sourceId,s.slug sourceKey,s.name source,a.published_at publishedAt,
              JSON_ARRAYAGG(JSON_OBJECT('id',ce.id,'articleId',ce.article_id,'sourceId',ce.source_id,'textSpan',ce.text_span,'supportType',ce.support_type)) evidenceJson
       FROM v2_claims c
       JOIN v2_claim_evidence ce ON ce.claim_id=c.id AND ce.article_id=c.article_id AND ce.source_id=c.source_id
       JOIN articles a ON a.id=c.article_id AND a.source_id=c.source_id
       JOIN sources s ON s.id=a.source_id
       JOIN v2_entities se ON se.id=c.subject_entity_id AND se.status<>'unresolved'
       LEFT JOIN v2_entities oe ON oe.id=c.object_entity_id
       WHERE ${predicate}
         AND (c.object_entity_id IS NULL OR oe.status<>'unresolved')
       GROUP BY c.id,c.claim_group_id,c.subject_entity_id,se.canonical_entity_id,se.id,se.status,c.object_entity_id,oe.canonical_entity_id,oe.id,oe.status,c.predicate,c.claim_type,c.value_json,c.normalized_value,c.valid_from,c.valid_until,c.status,a.id,s.id,s.slug,s.name,a.published_at
       ORDER BY s.slug,a.id,c.id`,
      [groupId == null ? scopeId : groupId],
    );
  } else {
    throw new TypeError("scope_type_invalid");
  }
  return { scope: { type: scope.type, id: scopeId }, ...buildSourceComparison(rows, { page, limit }) };
}

module.exports = { PUBLIC_ENTITY_TYPES, getEntity, getEvent, getClaim, compareSources, compareSourcesDetailed };
