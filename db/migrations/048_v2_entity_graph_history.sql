-- UTOM V2 M1.4 additive schema foundation: v2_entity_graph_history
CREATE TABLE v2_entity_graph_history (
  id BIGINT UNSIGNED AUTO_INCREMENT NOT NULL,
  mutation_type VARCHAR(64) NOT NULL,
  object_type VARCHAR(32) NOT NULL,
  object_id BIGINT UNSIGNED NOT NULL,
  before_json JSON NULL,
  after_json JSON NULL,
  operation_key CHAR(64) NOT NULL,
  actor VARCHAR(128) NOT NULL,
  run_id BIGINT UNSIGNED NULL,
  created_at DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_v2_entity_graph_history_operation_key (operation_key),
  KEY idx_v2_entity_graph_history_object_type_object_id_created_at (object_type, object_id, created_at),
  KEY idx_v2_entity_graph_history_run_id (run_id),
  CONSTRAINT fk_v2_entity_graph_history_run_id_1 FOREIGN KEY (run_id) REFERENCES v2_ai_runs (id) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
