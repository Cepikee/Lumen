-- UTOM V2 M1.4 additive schema foundation: v2_events
CREATE TABLE v2_events (
  id BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  canonical_title VARCHAR(512) NOT NULL,
  normalized_key VARCHAR(512) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'candidate',
  start_at DATETIME(6) NULL,
  end_at DATETIME(6) NULL,
  first_observed_at DATETIME(6) NULL,
  last_observed_at DATETIME(6) NULL,
  confidence DECIMAL(5,4) NULL,
  superseded_by BIGINT UNSIGNED NULL,
  created_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_v2_events_normalized_key (normalized_key),
  KEY idx_v2_events_event_type_status (event_type, status),
  KEY idx_v2_events_start_at_end_at (start_at, end_at),
  KEY idx_v2_events_status (status),
  CONSTRAINT fk_v2_events_superseded_by_1 FOREIGN KEY (superseded_by) REFERENCES v2_events (id) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
