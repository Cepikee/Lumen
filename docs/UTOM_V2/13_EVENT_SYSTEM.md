# Event System

Az event különálló, időben értelmezhető történeti objektum; nem azonos entityvel vagy cikkel.

Event mezők: type, title, normalized key, start/end, location, entities, claims, articles, source coverage, parent/child, previous/next, confidence, status.

Lifecycle: CANDIDATE → ACTIVE → COMPLETED/DISPUTED/MERGED. Event matching deterministic cluster/entity/date jelekből indul, AI csak ambiguity esetén kell.

Event merge megőrzi a korábbi event membership és audit history rekordokat.
