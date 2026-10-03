-- UTOM V2 M1.4 additive schema foundation: v2_entity_mentions
CREATE TABLE v2_entity_mentions (
  id BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  article_id BIGINT UNSIGNED NOT NULL,
  summary_id BIGINT UNSIGNED NULL,
  entity_id BIGINT UNSIGNED NULL,
  raw_text TEXT NOT NULL,
  normalized_text TEXT NOT NULL,
  start_offset INT UNSIGNED NOT NULL,
  end_offset INT UNSIGNED NOT NULL,
  extraction_run_id BIGINT UNSIGNED NULL,
  confidence DECIMAL(5,4) NULL,
  resolution_status VARCHAR(24) NOT NULL DEFAULT 'unresolved',
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_v2_entity_mentions_article_id (article_id),
  KEY idx_v2_entity_mentions_entity_id (entity_id),
  KEY idx_v2_entity_mentions_resolution_status (resolution_status),
  CONSTRAINT fk_v2_entity_mentions_article_id_1 FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_v2_entity_mentions_summary_id_2 FOREIGN KEY (summary_id) REFERENCES summaries (id) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT fk_v2_entity_mentions_entity_id_3 FOREIGN KEY (entity_id) REFERENCES v2_entities (id) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT fk_v2_entity_mentions_extraction_run_id_4 FOREIGN KEY (extraction_run_id) REFERENCES v2_ai_runs (id) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
