# Timelines

Timeline entity, event vagy topic nézetet reprezentál. Item event/article/claim hivatkozást, display time, valid time, confidence, visibility és deterministic ordering key mezőt tartalmaz.

Ugyanazon event új cikke a meglévő timeline-hoz kapcsolódik, nem automatikusan új történet.

API cursor paginationt és as-of paramétert használ. Future item current timeline-ban nem jelenhet meg.
