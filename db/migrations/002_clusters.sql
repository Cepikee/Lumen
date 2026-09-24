-- Reconstructed from legacy Utom.hu SQL usage; old original DB dump unavailable.
CREATE TABLE clusters (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  first_published_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  first_source VARCHAR(190) NOT NULL DEFAULT '',
  title TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_clusters_first_published_at (first_published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
