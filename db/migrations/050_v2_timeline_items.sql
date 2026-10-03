-- UTOM V2 M1.4 additive schema foundation: v2_timeline_items
CREATE TABLE v2_timeline_items (
  id BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  timeline_id BIGINT UNSIGNED NOT NULL,
  item_type VARCHAR(32) NOT NULL,
  item_id BIGINT UNSIGNED NOT NULL,
  valid_at DATETIME(6) NULL,
  display_at DATETIME(6) NULL,
  confidence DECIMAL(5,4) NULL,
  visibility VARCHAR(24) NOT NULL DEFAULT 'public',
  ordering_key VARCHAR(128) NOT NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_v2_timeline_items_timeline_id_item_type_item_id_ordering_key (timeline_id, item_type, item_id, ordering_key),
  KEY idx_v2_timeline_items_timeline_id_ordering_key (timeline_id, ordering_key),
  KEY idx_v2_timeline_items_item_type_item_id (item_type, item_id),
  KEY idx_v2_timeline_items_valid_at (valid_at),
  CONSTRAINT fk_v2_timeline_items_timeline_id_1 FOREIGN KEY (timeline_id) REFERENCES v2_timelines (id) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
