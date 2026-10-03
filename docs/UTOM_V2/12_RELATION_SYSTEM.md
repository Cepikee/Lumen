# Relation System

Controlled relation vocabulary: OWNS, WORKS_FOR, CEO_OF, LOCATED_IN, BUILDS, INVESTS_IN, ACQUIRED, PARTNER_OF, SUPPORTS, OPPOSES, PARTICIPATES_IN, RELATED_TO.

AI tetszőleges relation nevet nem írhat persistence-be. Új predicate csak döntési log és schema update után létezhet.

Minden relation subject/object, status, confidence, valid interval és evidence kapcsolattal rendelkezik. Relation merge idempotens fingerprintet használ.

Contradictory relation nem törli az előzőt; DISPUTED vagy SUPERSEDED állapotot kap.
