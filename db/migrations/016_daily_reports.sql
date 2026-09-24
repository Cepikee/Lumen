-- Reconstructed from legacy Utom.hu SQL usage; old original DB dump unavailable.
CREATE TABLE daily_reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  content LONGTEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  report_date DATE GENERATED ALWAYS AS (DATE(created_at)) STORED,
  PRIMARY KEY (id), KEY idx_daily_reports_report_date (report_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
