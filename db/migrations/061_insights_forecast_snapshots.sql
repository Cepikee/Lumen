-- Additive hourly UTC forecast storage. Legacy DATE values cannot be repaired
-- into hourly observations and are intentionally not copied or deleted.
CREATE TABLE insights_forecast_runs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  model_version VARCHAR(64) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'running',
  generated_at DATETIME NOT NULL,
  valid_until DATETIME NOT NULL,
  finished_at DATETIME NULL,
  expected_categories INT UNSIGNED NOT NULL,
  completed_categories INT UNSIGNED NOT NULL DEFAULT 0,
  error_code VARCHAR(64) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
