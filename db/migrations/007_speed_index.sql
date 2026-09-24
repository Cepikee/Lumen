-- Reconstructed from legacy Utom.hu SQL usage; old original DB dump unavailable.
CREATE TABLE speed_index (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source VARCHAR(190) NOT NULL,
  avg_delay_minutes DOUBLE NOT NULL DEFAULT 0,
  median_delay_minutes DOUBLE NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_speed_index_source (source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
