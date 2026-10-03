-- UTOM V2 M1.4 additive schema foundation: v2_event_entities
CREATE TABLE v2_event_entities (
  id BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  entity_id BIGINT UNSIGNED NOT NULL,
  role VARCHAR(64) NOT NULL,
  confidence DECIMAL(5,4) NULL,
  valid_from DATETIME(6) NULL,
  valid_until DATETIME(6) NULL,
  evidence_id BIGINT UNSIGNED NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_v2_event_entities_event_id_entity_id_role_valid_from (event_id, entity_id, role, valid_from),
  KEY idx_v2_event_entities_entity_id_role (entity_id, role),
  KEY idx_v2_event_entities_event_id (event_id),
  CONSTRAINT fk_v2_event_entities_event_id_1 FOREIGN KEY (event_id) REFERENCES v2_events (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT fk_v2_event_entities_entity_id_2 FOREIGN KEY (entity_id) REFERENCES v2_entities (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_v2_event_entities_evidence_id_3 FOREIGN KEY (evidence_id) REFERENCES v2_claim_evidence (id) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
