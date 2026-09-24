-- Reconstructed from legacy Utom.hu SQL usage; old original DB dump unavailable.
CREATE TABLE forecast (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category VARCHAR(190) NOT NULL,
  date DATE NOT NULL,
  predicted DOUBLE NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_forecast_category_date (category, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
