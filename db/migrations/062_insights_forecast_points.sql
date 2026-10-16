-- Hourly UTC points; separate statement required by the migration runner.
CREATE TABLE insights_forecast_points (
  run_id BIGINT UNSIGNED NOT NULL,
  category VARCHAR(190) NOT NULL,
  target_at DATETIME NOT NULL,
  predicted DOUBLE NOT NULL,
  lower_bound DOUBLE NULL,
  upper_bound DOUBLE NULL,
  calibration_samples INT UNSIGNED NOT NULL DEFAULT 0,
  actual DOUBLE NULL,
  absolute_error DOUBLE NULL,
  evaluated_at DATETIME NULL,
  PRIMARY KEY (run_id, category, target_at),
  CONSTRAINT fk_insights_forecast_run FOREIGN KEY (run_id)
    REFERENCES insights_forecast_runs(id) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
