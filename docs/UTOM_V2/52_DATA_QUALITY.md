# Data Quality

Precision before coverage. A missing relation is safer than a false merge or unsupported claim.

Quality checks: duplicate entity, alias collision, orphan relation, relation without evidence, malformed claim, invalid temporal range, duplicate event, low-confidence unresolved mention, future record in current output.

Safe deterministic repair is allowed only when unambiguous. Other findings enter review/deferred state with metrics and owner.
