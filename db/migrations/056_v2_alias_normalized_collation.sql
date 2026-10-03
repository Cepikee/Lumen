-- UTOM V2 M5: alias normalized identity is accent-sensitive.
ALTER TABLE v2_entity_aliases
  MODIFY normalized_alias VARCHAR(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;
