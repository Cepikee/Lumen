"use strict";

const { EVENT_STATUSES } = require("./event-matching");

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

module.exports = { mysqlUtc, persistEventCandidate };
