# Knowledge Graph

## Node vocabulary
ARTICLE, SOURCE, ENTITY, PERSON, COMPANY, ORGANIZATION, LOCATION, PROJECT, PRODUCT, TOPIC, EVENT, CLAIM, RELATION, EVIDENCE.

## Edge examples
ARTICLE MENTIONS ENTITY; ARTICLE SUPPORTS CLAIM; CLAIM ABOUT ENTITY; ENTITY PARTICIPATES_IN EVENT; EVENT OCCURS_AT LOCATION; EVENT FOLLOWS EVENT; RELATION SUPPORTED_BY ARTICLE.

## Representation
Az első V2 verzió MySQL relational representationt használ. A graph traversal read model és indexes segítségével készül.

CODEX TECHNICAL RECOMMENDATION: külön graph database csak mért traversal/volume probléma után.

## Invariants
Minden fontos relation evidence-re, minden claim source/article-re, minden időbeli assertion valid intervalra mutat.
