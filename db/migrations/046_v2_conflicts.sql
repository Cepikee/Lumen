-- UTOM V2 M1.4 additive schema foundation: v2_conflicts
CREATE TABLE v2_conflicts (
  id BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  conflict_type VARCHAR(32) NOT NULL,
  fingerprint CHAR(64) NOT NULL,
  scope_type VARCHAR(32) NOT NULL,
  scope_id BIGINT UNSIGNED NOT NULL,
  severity VARCHAR(24) NOT NULL,
  state VARCHAR(24) NOT NULL DEFAULT 'open',
  explanation_json JSON NULL,
  resolver VARCHAR(128) NULL,
  detected_at DATETIME(6) NOT NULL,
  resolved_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_v2_conflicts_fingerprint (fingerprint),
  KEY idx_v2_conflicts_conflict_type_state (conflict_type, state),
  KEY idx_v2_conflicts_scope_type_scope_id (scope_type, scope_id),
  KEY idx_v2_conflicts_severity (severity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
