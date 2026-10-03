-- UTOM V2 M1.4 additive schema foundation: v2_processing_steps
CREATE TABLE v2_processing_steps (
  id BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  article_id BIGINT UNSIGNED NOT NULL,
  step_name VARCHAR(64) NOT NULL,
  input_fingerprint CHAR(64) NOT NULL,
  status VARCHAR(24) NOT NULL,
  attempt INT UNSIGNED NOT NULL DEFAULT '0',
  claim_token CHAR(36) NULL,
  heartbeat_at DATETIME(6) NULL,
  output_ref VARCHAR(512) NULL,
  error_metadata JSON NULL,
  completed_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_v2_processing_steps_article_id_step_name_input_fingerprint (article_id, step_name, input_fingerprint),
  KEY idx_v2_processing_steps_status_heartbeat_at (status, heartbeat_at),
  KEY idx_v2_processing_steps_article_id_step_name (article_id, step_name),
  CONSTRAINT fk_v2_processing_steps_article_id_1 FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
