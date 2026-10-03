-- UTOM V2 M1.4 additive schema foundation: v2_claim_groups
CREATE TABLE v2_claim_groups (
  id BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  subject_entity_id BIGINT UNSIGNED NULL,
  predicate VARCHAR(128) NOT NULL,
  time_scope_key VARCHAR(128) NOT NULL,
  resolution_status VARCHAR(24) NOT NULL DEFAULT 'unresolved',
  display_policy VARCHAR(32) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_v2_claim_groups_subject_entity_id_predicate_time_scope_key (subject_entity_id, predicate, time_scope_key),
  KEY idx_v2_claim_groups_resolution_status (resolution_status),
  KEY idx_v2_claim_groups_predicate (predicate),
  CONSTRAINT fk_v2_claim_groups_subject_entity_id_1 FOREIGN KEY (subject_entity_id) REFERENCES v2_entities (id) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
