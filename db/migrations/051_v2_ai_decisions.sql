-- UTOM V2 M1.4 additive schema foundation: v2_ai_decisions
CREATE TABLE v2_ai_decisions (
  id BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  article_id BIGINT UNSIGNED NULL,
  step_name VARCHAR(64) NOT NULL,
  input_fingerprint CHAR(64) NOT NULL,
  route VARCHAR(32) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  budget_snapshot JSON NULL,
  provider VARCHAR(64) NULL,
  model VARCHAR(128) NULL,
  escalation BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_v2_ai_decisions_article_id_step_name_input_fingerprint (article_id, step_name, input_fingerprint),
  KEY idx_v2_ai_decisions_route_created_at (route, created_at),
  KEY idx_v2_ai_decisions_article_id_step_name (article_id, step_name),
  CONSTRAINT fk_v2_ai_decisions_article_id_1 FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
