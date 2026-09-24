-- Reconstructed from legacy Utom.hu SQL usage; old original DB dump unavailable.
CREATE TABLE forecast_runs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  finished_at DATETIME NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'running',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_forecast_runs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
