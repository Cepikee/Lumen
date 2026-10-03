-- UTOM V2 M10 additive temporal graph extension: preserve timeline validity bounds
ALTER TABLE v2_timeline_items
  ADD COLUMN valid_from DATETIME(6) NULL AFTER valid_at,
  ADD COLUMN valid_until DATETIME(6) NULL AFTER valid_from,
  ADD KEY idx_v2_timeline_items_valid_from_valid_until (valid_from, valid_until);
