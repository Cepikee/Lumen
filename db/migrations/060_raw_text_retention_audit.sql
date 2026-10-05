-- Raw full-text retention audit and run history. Article identity and derived data remain in place.
CREATE TABLE raw_text_retention_audit (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  run_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  article_id BIGINT UNSIGNED NULL,
  worker_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  action VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  mode VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  reason VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NULL,
  policy_version VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  error_code VARCHAR(96) CHARACTER SET ascii COLLATE ascii_bin NULL,
  eligible_count BIGINT UNSIGNED NULL,
  purged_count BIGINT UNSIGNED NULL,
  failed_count BIGINT UNSIGNED NULL,
  oldest_eligible_at DATETIME(6) NULL,
  metadata_json JSON NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_raw_retention_article_created (article_id, created_at),
  KEY idx_raw_retention_action_created (action, created_at),
  KEY idx_raw_retention_run (run_id),
  CONSTRAINT fk_raw_retention_article FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
