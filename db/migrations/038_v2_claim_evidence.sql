-- UTOM V2 M1.4 additive schema foundation: v2_claim_evidence
CREATE TABLE v2_claim_evidence (
  id BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  claim_id BIGINT UNSIGNED NULL,
  article_id BIGINT UNSIGNED NOT NULL,
  source_id BIGINT UNSIGNED NULL,
  text_span TEXT NULL,
  span_hash CHAR(64) NOT NULL,
  evidence_type VARCHAR(32) NOT NULL,
  support_type VARCHAR(24) NOT NULL,
  extraction_run_id BIGINT UNSIGNED NULL,
  confidence DECIMAL(5,4) NULL,
  publication_time DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_v2_claim_evidence_claim_id_article_id_span_hash (claim_id, article_id, span_hash),
  KEY idx_v2_claim_evidence_article_id (article_id),
  KEY idx_v2_claim_evidence_source_id (source_id),
  KEY idx_v2_claim_evidence_extraction_run_id (extraction_run_id),
  CONSTRAINT fk_v2_claim_evidence_claim_id_1 FOREIGN KEY (claim_id) REFERENCES v2_claims (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT fk_v2_claim_evidence_article_id_2 FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_v2_claim_evidence_source_id_3 FOREIGN KEY (source_id) REFERENCES sources (id) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT fk_v2_claim_evidence_extraction_run_id_4 FOREIGN KEY (extraction_run_id) REFERENCES v2_ai_runs (id) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
