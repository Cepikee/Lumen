# FB-02 — audited before repair

Frozen corpus, expected O1, selected_items O1, raw row 14/frame 0,
human_item_audit O1, labels O1 and failure_taxonomy FB-02 agree.

- Expected source: üzletlánc [3,12); actual resolved source: árjegyzéke [13,23).
- Candidate evidence: üzletlánc NOUN/Nom nmod:att → árjegyzéke.
- Possession: árjegyzéke NOUN, lemma árjegyzék, Person[psor]=3.
- Attribution: szerint ADP/case → árjegyzéke; árjegyzéke obl → kerül.
- Claim target: dependency:0:69, action kerül [63,68).
- Reporting/evidence head: árjegyzéke, not the originating entity.
- Root cause: dependency fallback promotes the marker's nominal head to source;
  C02 composition only recognizes NOUN -ás/-és or beszámoló/számoló.
  Árjegyzék does not satisfy that morphological class, so source sanitation is
  skipped despite the explicit possessive path. FB01 leaves the same O1 source.

Repair scope: extend the existing composition rule to positive information
artifact types, retaining possession, attribution, target and ambiguity gates.
Do not change numeric/actor resolution or optimize frozen misses.
