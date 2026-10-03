# Claim System

A claim atomic proposition: subject, predicate, object/value, article, source, published_at, extracted_at, type, confidence, evidence, status.

A source claim nem azonos bizonyított tény vagy system inference. Ezt API és UI külön címkézi.

Claim grouping azonos subject/predicate/time scope köré szervez; eltérő értékek conflict groupba kerülnek.

Claim observation idempotens, de külön source/article observation megőrizhető.
