CREATE TABLE image_generation_daily_usage (
  usage_date DATE NOT NULL,
  provider VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  reserved_neurons BIGINT UNSIGNED NOT NULL DEFAULT 0,
  actual_neurons BIGINT UNSIGNED NULL,
  request_count INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (usage_date, provider)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
