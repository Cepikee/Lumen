"use strict";

const { EVENT_STATUSES, buildCrossArticleEventGroup } = require("./event-matching");

function requireConnection(connection) { if (!connection || typeof connection.execute !== "function") throw new TypeError("connection_required"); }
function mysqlUtc(value) { return value == null ? null : new Date(value).toISOString().replace("T", " ").replace("Z", ""); }
function persistEventCandidate(connection, candidate) {
  requireConnection(connection);
  if (!candidate || !EVENT_STATUSES.includes(candidate.status || "candidate")) return Promise.reject(new TypeError("status_invalid"));
  return persist(connection, candidate);
}
async function persist(connection, candidate) {
  const [eventInsert] = await connection.execute(
    `INSERT INTO v2_events (event_type,canonical_title,normalized_key,status,start_at,end_at,first_observed_at,last_observed_at,confidence,created_at,updated_at)
     VALUES (?,?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))
     ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id),last_observed_at=UTC_TIMESTAMP(6),updated_at=UTC_TIMESTAMP(6)`,
    [candidate.eventType, candidate.canonicalTitle, candidate.normalizedKey, candidate.status || "candidate", mysqlUtc(candidate.startAt), mysqlUtc(candidate.endAt), candidate.confidence],
  );
  const eventId = Number(eventInsert.insertId);
  await connection.execute(
    `INSERT INTO v2_event_articles (event_id,article_id,membership_type,confidence,evidence_id,first_observed_at,last_observed_at,created_at)
     VALUES (?,?,?,?,?,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))
     ON DUPLICATE KEY UPDATE last_observed_at=UTC_TIMESTAMP(6),confidence=VALUES(confidence),evidence_id=COALESCE(evidence_id,VALUES(evidence_id))`,
    [eventId, candidate.articleId, candidate.membershipType || "primary", candidate.confidence, candidate.evidenceId],
  );
  for (const entity of candidate.entities || []) {
    const validFrom = mysqlUtc(entity.validFrom);
    const validUntil = mysqlUtc(entity.validUntil);
    const lockName = `utom:v2:event-entity:${eventId}:${entity.entityId}:${entity.role}`.slice(0, 64);
    const [lockRows] = await connection.execute("SELECT GET_LOCK(?,10) acquired", [lockName]);
    if (Number(lockRows[0]?.acquired) !== 1) throw new Error("event_entity_lock_timeout");
    try {
      const [updated] = await connection.execute(
        "UPDATE v2_event_entities SET confidence=?,valid_until=?,evidence_id=COALESCE(evidence_id,?) WHERE event_id=? AND entity_id=? AND role=? AND valid_from <=> ?",
        [entity.confidence, validUntil, entity.evidenceId, eventId, entity.entityId, entity.role, validFrom],
      );
      if (Number(updated.affectedRows) === 0) {
        await connection.execute(
          `INSERT INTO v2_event_entities (event_id,entity_id,role,confidence,valid_from,valid_until,evidence_id,created_at)
           VALUES (?,?,?,?,?,?,?,UTC_TIMESTAMP(6))`,
          [eventId, entity.entityId, entity.role, entity.confidence, validFrom, validUntil, entity.evidenceId],
        );
      }
    } finally {
      await connection.execute("SELECT RELEASE_LOCK(?)", [lockName]);
    }
  }
  return { eventId, articleId: candidate.articleId, entityCount: (candidate.entities || []).length, status: candidate.status || "candidate", merged: false };
}

function positiveId(value, field) { if (!/^[1-9][0-9]*$/.test(String(value))) throw new TypeError(`${field}_invalid`); return Number(value); }
function parseJson(value) { if (value == null || typeof value === "object") return value; try { return JSON.parse(value); } catch { return null; } }
function iso(value) { if (value == null) return null; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString(); }

async function loadCrossArticleEventObservations(connection, anchorEventId, { limit = 200 } = {}) {
  requireConnection(connection);
  const anchor = positiveId(anchorEventId, "event_id");
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500) throw new TypeError("limit_invalid");
  const [eventRows] = await connection.execute(
    `SELECT e.id eventId,e.event_type eventType,e.status,e.start_at startAt,e.end_at endAt
       FROM v2_events anchor
       JOIN v2_events e ON e.event_type=anchor.event_type
      WHERE anchor.id=? AND e.status NOT IN ('archived','retracted','expired','superseded')
      ORDER BY (e.id=anchor.id) DESC,ABS(CAST(e.id AS SIGNED)-CAST(anchor.id AS SIGNED)),e.id ASC LIMIT ?`,
    [anchor, limit],
  );
  if (!eventRows.some((row) => Number(row.eventId) === anchor)) throw new Error("scope_not_found");
  const eventIds = eventRows.map((row) => positiveId(row.eventId, "event_id"));
  const placeholders = eventIds.map(() => "?").join(",");
  const [membershipRows] = await connection.execute(
    `SELECT ea.event_id eventId,ea.article_id articleId,ea.evidence_id evidenceId,
            s.id sourceId,s.slug sourceKey,
            c.predicate,c.status claimStatus,c.value_json valueJson
       FROM v2_event_articles ea
       JOIN articles a ON a.id=ea.article_id
       JOIN sources s ON s.id=a.source_id
       LEFT JOIN v2_claim_evidence ce ON ce.id=ea.evidence_id AND ce.article_id=ea.article_id AND ce.source_id=s.id
       LEFT JOIN v2_claims c ON c.id=ce.claim_id AND c.article_id=ea.article_id AND c.source_id=s.id
      WHERE ea.event_id IN (${placeholders})
      ORDER BY ea.event_id,ea.article_id,ea.id`,
    eventIds,
  );
  const [entityRows] = await connection.execute(
    `SELECT ee.event_id eventId,ee.entity_id entityId,COALESCE(e.canonical_entity_id,e.id) canonicalEntityId,
            ee.role,e.status
       FROM v2_event_entities ee
       JOIN v2_entities e ON e.id=ee.entity_id
      WHERE ee.event_id IN (${placeholders})
      ORDER BY ee.event_id,ee.role,COALESCE(e.canonical_entity_id,e.id),ee.id`,
    eventIds,
  );
  return eventRows.map((row) => {
    const memberships = membershipRows.filter((item) => Number(item.eventId) === Number(row.eventId));
    const semantic = memberships.map((item) => ({ row: item, value: parseJson(item.valueJson) })).find((item) => item.row.predicate && item.value && typeof item.value === "object");
    return Object.freeze({
      eventId: positiveId(row.eventId, "event_id"), eventType: String(row.eventType || ""), status: String(row.status || ""), startAt: iso(row.startAt), endAt: iso(row.endAt),
      predicate: semantic?.row.predicate == null ? null : String(semantic.row.predicate), claimStatus: semantic?.row.claimStatus == null ? null : String(semantic.row.claimStatus),
      modality: semantic?.value?.modality ?? null, conditional: semantic?.value?.conditional === true, uncertainty: semantic?.value?.uncertainty === true, polarity: semantic?.value?.polarity ?? null,
      evidence: Object.freeze(memberships.flatMap((item) => item.evidenceId == null ? [] : [{ evidenceId: positiveId(item.evidenceId, "evidence_id"), articleId: positiveId(item.articleId, "article_id"), sourceId: positiveId(item.sourceId, "source_id"), sourceKey: String(item.sourceKey || "") }])),
      entities: Object.freeze(entityRows.filter((item) => Number(item.eventId) === Number(row.eventId)).map((item) => ({ entityId: positiveId(item.entityId, "entity_id"), canonicalEntityId: positiveId(item.canonicalEntityId, "canonical_entity_id"), role: String(item.role || ""), status: String(item.status || "") }))),
    });
  });
}

async function resolveCrossArticleEventGroup(connection, eventId, options = {}) {
  const startedAt = Date.now();
  const events = await loadCrossArticleEventObservations(connection, eventId, options);
  const result = buildCrossArticleEventGroup(events, eventId);
  return { ...result, metrics: { ...result.metrics, matchDurationMs: Date.now() - startedAt } };
}

module.exports = { mysqlUtc, persistEventCandidate, loadCrossArticleEventObservations, resolveCrossArticleEventGroup };
