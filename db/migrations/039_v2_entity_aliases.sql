-- UTOM V2 M1.4 additive schema foundation: v2_entity_aliases
CREATE TABLE v2_entity_aliases (
  id BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  entity_id BIGINT UNSIGNED NOT NULL,
  alias VARCHAR(512) NOT NULL,
  normalized_alias VARCHAR(512) NOT NULL,
  language VARCHAR(16) NOT NULL,
  alias_type VARCHAR(32) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'review',
  confidence DECIMAL(5,4) NULL,
  evidence_id BIGINT UNSIGNED NULL,
  valid_from DATETIME(6) NULL,
  valid_until DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_v2_entity_aliases_entity_id_normalized_alias_language (entity_id, normalized_alias, language),
  KEY idx_v2_entity_aliases_normalized_alias_status (normalized_alias, status),
  KEY idx_v2_entity_aliases_entity_id (entity_id),
  CONSTRAINT fk_v2_entity_aliases_entity_id_1 FOREIGN KEY (entity_id) REFERENCES v2_entities (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT fk_v2_entity_aliases_evidence_id_2 FOREIGN KEY (evidence_id) REFERENCES v2_claim_evidence (id) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
