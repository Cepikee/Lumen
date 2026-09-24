-- UTOM A2: NEW, EMPTY LOCAL DATABASE ONLY. No legacy schema is modified.
-- The migration runner executes one SQL statement per numbered file.
CREATE TABLE sources (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  name VARCHAR(190) NOT NULL,
  homepage_url VARCHAR(2048) NULL,
  feed_url VARCHAR(2048) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_sources_slug (slug),
  KEY ix_sources_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
