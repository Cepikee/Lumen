-- M4 schema gap: preserve the extracted type on unresolved mention occurrences
ALTER TABLE v2_entity_mentions
  ADD COLUMN entity_type VARCHAR(32) NULL AFTER normalized_text;
