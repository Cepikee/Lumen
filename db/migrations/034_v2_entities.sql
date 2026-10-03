-- UTOM V2 M1.4 additive schema foundation: v2_entities
CREATE TABLE v2_entities (
  id BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  entity_type VARCHAR(32) NOT NULL,
  canonical_name VARCHAR(512) NOT NULL,
  normalized_name VARCHAR(512) NOT NULL,
  language VARCHAR(16) NOT NULL DEFAULT 'hu',
  status VARCHAR(24) NOT NULL DEFAULT 'review',
  canonical_entity_id BIGINT UNSIGNED NULL,
  confidence_current DECIMAL(5,4) NULL,
  first_observed_at DATETIME(6) NULL,
  last_observed_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_v2_entities_entity_type_language_normalized_name (entity_type, language, normalized_name),
  KEY idx_v2_entities_status (status),
  KEY idx_v2_entities_canonical_entity_id (canonical_entity_id),
  KEY idx_v2_entities_last_observed_at (last_observed_at),
  CONSTRAINT fk_v2_entities_canonical_entity_id_1 FOREIGN KEY (canonical_entity_id) REFERENCES v2_entities (id) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
