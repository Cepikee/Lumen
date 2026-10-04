-- UTOM V2.1 additive entity onboarding: deterministic provisional identity scope
ALTER TABLE v2_entities
  ADD COLUMN identity_scope_key VARCHAR(255) NOT NULL DEFAULT '' AFTER language,
  ADD COLUMN normalized_name_hash CHAR(64) GENERATED ALWAYS AS (SHA2(normalized_name,256)) STORED AFTER normalized_name,
  DROP INDEX uq_v2_entities_entity_type_language_normalized_name,
  ADD UNIQUE KEY uq_v2_entities_identity_scope (entity_type, language, normalized_name_hash, identity_scope_key),
  ADD KEY idx_v2_entities_identity_scope_key_status (identity_scope_key, status);
