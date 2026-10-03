# Conflict Detection

Típusok: numeric, categorical, temporal, entity identity, mutually exclusive relation/claim.

A rendszer külön claim-eket és evidence-eket tárol, majd deterministic conflict fingerprintet képez. AI csak magyarázatot vagy candidate groupingot adhat.

Nincs önkényes source winner. Állapotok: OPEN, REVIEWED, RESOLVED, ACCEPTED.

Conflict severity, affected objects, detected_at, resolved_at és resolver auditálható.
