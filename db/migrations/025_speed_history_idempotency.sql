-- Deterministic event keys prevent worker retries from duplicating speed history; legacy rows remain NULL.
ALTER TABLE speed_index_history ADD COLUMN event_key CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL, ADD UNIQUE KEY uq_speed_history_event_key (event_key);
