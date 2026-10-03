-- UTOM V2 M5: observed alias provenance and idempotent observation history.
CREATE TABLE v2_entity_alias_observations (
  id BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  alias_id BIGINT UNSIGNED NOT NULL,
  mention_id BIGINT UNSIGNED NOT NULL,
  extraction_run_id BIGINT UNSIGNED NULL,
  observed_alias VARCHAR(512) NOT NULL,
  normalized_alias VARCHAR(512) NOT NULL,
  language VARCHAR(16) NOT NULL,
  normalization_version VARCHAR(64) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_v2_alias_observation_alias_mention (alias_id, mention_id),
  KEY idx_v2_alias_observation_mention (mention_id),
  KEY idx_v2_alias_observation_run (extraction_run_id),
  CONSTRAINT fk_v2_alias_observation_alias FOREIGN KEY (alias_id) REFERENCES v2_entity_aliases (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT fk_v2_alias_observation_mention FOREIGN KEY (mention_id) REFERENCES v2_entity_mentions (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_v2_alias_observation_run FOREIGN KEY (extraction_run_id) REFERENCES v2_ai_runs (id) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
