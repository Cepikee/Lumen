-- UTOM V2 M1.4 additive schema foundation: v2_timelines
CREATE TABLE v2_timelines (
  id BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  owner_type VARCHAR(32) NOT NULL,
  owner_id BIGINT UNSIGNED NOT NULL,
  visibility VARCHAR(24) NOT NULL DEFAULT 'public',
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_v2_timelines_owner_type_owner_id (owner_type, owner_id),
  KEY idx_v2_timelines_owner_type_owner_id (owner_type, owner_id),
  KEY idx_v2_timelines_visibility (visibility)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
