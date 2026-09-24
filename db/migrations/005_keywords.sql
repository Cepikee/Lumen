-- Reconstructed from legacy Utom.hu SQL usage; old original DB dump unavailable.
CREATE TABLE keywords (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  article_id BIGINT UNSIGNED NOT NULL,
  keyword VARCHAR(255) NOT NULL,
  category VARCHAR(190) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_keywords_article_id (article_id),
  KEY idx_keywords_keyword_created (keyword, created_at), KEY idx_keywords_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
