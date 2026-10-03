-- UTOM V2 M1.4 additive schema foundation: v2_event_articles
CREATE TABLE v2_event_articles (
  id BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  article_id BIGINT UNSIGNED NOT NULL,
  membership_type VARCHAR(32) NOT NULL,
  confidence DECIMAL(5,4) NULL,
  evidence_id BIGINT UNSIGNED NULL,
  first_observed_at DATETIME(6) NULL,
  last_observed_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_v2_event_articles_event_id_article_id_membership_type (event_id, article_id, membership_type),
  KEY idx_v2_event_articles_article_id (article_id),
  KEY idx_v2_event_articles_event_id (event_id),
  CONSTRAINT fk_v2_event_articles_event_id_1 FOREIGN KEY (event_id) REFERENCES v2_events (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT fk_v2_event_articles_article_id_2 FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_v2_event_articles_evidence_id_3 FOREIGN KEY (evidence_id) REFERENCES v2_claim_evidence (id) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
