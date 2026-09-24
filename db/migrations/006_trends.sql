-- Reconstructed from legacy Utom.hu SQL usage; old original DB dump unavailable.
CREATE TABLE trends (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  keyword VARCHAR(255) NOT NULL,
  frequency INT UNSIGNED NOT NULL DEFAULT 1,
  period VARCHAR(40) NOT NULL DEFAULT 'daily',
  category VARCHAR(190) NULL,
  source VARCHAR(190) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_trends_keyword_created (keyword, created_at),
  KEY idx_trends_created (created_at), KEY idx_trends_category_created (category, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
