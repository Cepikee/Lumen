-- UTOM V2 M1.4 additive schema foundation: v2_confidence_history
CREATE TABLE v2_confidence_history (
  id BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  object_type VARCHAR(32) NOT NULL,
  object_id BIGINT UNSIGNED NOT NULL,
  old_confidence DECIMAL(5,4) NULL,
  new_confidence DECIMAL(5,4) NULL,
  reason VARCHAR(255) NOT NULL,
  evidence_delta JSON NULL,
  rule_version VARCHAR(64) NULL,
  model_version VARCHAR(64) NULL,
  resolver_version VARCHAR(64) NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_v2_confidence_history_object_type_object_id_created_at (object_type, object_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
