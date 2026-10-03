-- UTOM V2 M5: canonical normalized identity is accent-sensitive.
ALTER TABLE v2_entities
  MODIFY normalized_name VARCHAR(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;
