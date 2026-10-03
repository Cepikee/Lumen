# Entity System

Entity típusok: person, company, organization, location, project, product, topic.

Kötelező fogalmak: canonical name, normalized name, aliases, mentions, confidence, status, merge history, split/correction.

Lifecycle: REVIEW → ACTIVE → DISPUTED/MERGED/ARCHIVED. Merge canonical pointert hoz létre, korábbi entity és evidence megmarad.

Controlled vocabulary és entity-type szabályok kötelezők. Gyenge confidence esetén nincs automatikus merge.

Jelenlegi repository kapcsolat: source identity és article source_id újrahasznosítható deterministic előszűrőként.
