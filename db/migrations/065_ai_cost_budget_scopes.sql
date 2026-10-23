CREATE TABLE ai_cost_budget_scopes (
  scope_type VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  scope_key VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  limit_micros BIGINT UNSIGNED NOT NULL,
  reserved_micros BIGINT UNSIGNED NOT NULL DEFAULT 0,
  actual_micros BIGINT UNSIGNED NOT NULL DEFAULT 0,
  request_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (scope_type, scope_key),
  CONSTRAINT chk_ai_cost_scope_type CHECK (scope_type IN ('daily','monthly','pilot')),
  CONSTRAINT chk_ai_cost_scope_limit CHECK (limit_micros > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
