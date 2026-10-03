# Entity Resolution

Lépések: normalization; exact canonical lookup; alias lookup; deterministic rule; fuzzy candidates; contextual scoring; bounded AI disambiguation; confidence; merge/new entity; review/deferred.

False merge súlyosabb, mint duplicate entity. Low confidence nem írhat canonical pointert.

Context jelek: source, language, article co-mentions, event, location, time. Candidate set limit és deterministic tie-breaking kötelező.

Merge és split külön audit/history művelet.
