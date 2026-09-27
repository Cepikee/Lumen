-- Diagnostic state for paid/non-transactional external operations. Existing rows remain unchanged.
ALTER TABLE article_processing_steps
  ADD COLUMN operation_key CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  ADD COLUMN is_external TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN external_started_at DATETIME(6) NULL,
  ADD COLUMN error_type VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  ADD COLUMN retryable TINYINT(1) NOT NULL DEFAULT 1,
  ADD UNIQUE KEY uq_processing_steps_operation_key (operation_key);
