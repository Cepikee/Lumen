# B03 — conservative recall

2026-10-09. Research-only. Branch `develop/utom-recovery`, HEAD
`d145120c6e044b4f25d1d7b94e87846652ef80ba`; existing dirty tree preserved.
Canonical projection OFF. No production change, external/paid provider, commit,
push, deploy, build, preflight or full project suite.

## Root causes and narrow changes

1. Generic actor eligibility was largely named-entity/existing noun-list driven.
   An explicit active subject could still be missed for lack of a named entity.
   Added a positive semantic compatibility rule: selected human / institutional
   nominal classes **and** compatible action classes, active finite VERB,
   nominative nsubj governed by that predicate, compatible grammatical number,
   no case-marker or coordinated-alternative evidence. It is not `nsubj => actor`.
   Existing possessor/source/recipient/passive/clause checks still apply.
   New successful actor evidence records the semantic class and action license.
   A location-like `iroda` is not made an actor; a `helyi` modifier alone does
   not disqualify a genuinely licensed institutional actor.

2. Correction parsing expected the unit to end the alternative. It therefore
   rejected denomination + governed target, e.g. a monetary amount modifying
   support. It now accepts exactly one `nmod:att` denomination → obj/obl nominal
   target; the accepted numeric dependency path to the predicate is still checked
   independently. Generic counted heads can use an explicit amod:att dependency.
   Percentage and known distance units retain their semantic types; unsupported
   dimensional units do not fall through to generic count. OLD remains rejected.
   Shared monetary units/scales can use the existing bounded parallel grammar.

3. Ordinal traversal excluded a nominal subject on the route from its modifier
   to the predicate. For ordinal arguments only, allow amod:att → NOUN nsubj →
   local predicate. This creates an `ordinal_target` edge, **not** an actor or rank.
   Date/duration paths were not generally broadened to nsubj.

No source-recovery or compound-rate implementation was changed. Existing named
actor rules were not comprehensively redesigned; this is a bounded additive
recall improvement, not a universal semantic ontology or entailment proof.

## Review and tests

35 newly annotated local HuSpaCy sentences across public services, economics,
politics, sport and technology; 40 new regression tests including structural
mutation controls. Input annotations are preserved without manual parser fixes.

Coverage includes generic institution/human actors, active predicate compatibility,
location ambiguity, adjectival modifiers, possessor vs role head, source vs actor,
recipient, passive, coordination, count/money/percentage/year/date-boundary
correction, omitted targets, rank/ordinal controls, compound measurement,
independent actor and numeric edges, two-sentence source/correction isolation,
rejected-value safety, broken numeric paths, evidence and disabled projection.

All `tests/unit/v22-*.test.cjs`: **339/339 PASS, 0 FAIL**.
Original 299 tests remain byte-unchanged (hash verification). No full project
suite was run. See `targeted-tests.txt`.

Two development checks caught defects before closure: a generic correction
candidate with a conj dependency temporarily lost support; this was corrected
without changing its existing regression. A new distance correction initially
fell through to count; explicit distance typing and dimensional-unit guards
were added before the final audit. Neither intermediate output replaces a
historical or final frozen audit artifact.

## Explicit abstentions / remaining scope

- The corpus rank sentence has Réka labeled nmod:att, not nsubj, and the round
  nominal follows a questionable dependency route. S1/S2 remain missed, not
  relabeled correct-unresolved. No discourse or parser repair is guessed.
- The new generic-rank fixture has a lexical ROOT rather than a proven copular
  ordinal structure; it remains unresolved. Explicit typed copular rank still
  works. Coordinated, omitted and previous-sentence ranked subjects abstain.
- The omitted-target count correction fixture does not prove a common target
  through its actual dependency graph; it remains unresolved. No proximity-based
  target inheritance was introduced.
- Calendar boundary correction retains alternatives but its accepted temporal
  attachment is not proven; it remains unresolved.
- A finite-looking institution sentence is parsed as a nominal/participle
  construction; it remains unresolved. A separately annotated institution with
  proven active subject/predicate is resolved.
- Rate correction remains under B01's unresolved compound safety policy. W3
  remains missed: denominator preserved, no positive speed assertion.
- B02's uncertain possessive-source and source/correction cases remain limited;
  its historical three repaired selected decisions remain correct.

These tests explicitly distinguish retention/safe abstention from positive recall.
Passing them is not a claim that every requested structural class is resolved.

## B03_POST_REPAIR frozen replay

Same seven **synthetic** texts, same frozen linguistic annotations, same selected
39-item denominator. This is a known-corpus post-repair audit, **not** a new blind
test or an independent evaluation. Labels were reassessed after viewing outputs.

| Item | Before | After |
|---|---|---|
| A2 | férfi actor missing | active driver licensed; source stays rendőrség |
| A5 | mentők actor missing | active workers licensed |
| H2 | klinika actor missing | hiring institution licensed; source stays igazgató |
| E4 | accepted money unresolved | 24,000,000 HUF accepted, dependency proved |
| E5 | correction unstructured | 16,000,000 rejected; 24,000,000 accepted; receipt positive |
| T3 | third test ordinal unresolved | ordinal 3 attached to teszt, not rank |

P, S and W persisted outputs remain identical to B02. H's independent deadline
frame remains identical. Other changed fields were reviewed: E's corrected frame
also recovers the already-supported cég actor; T's first measurement now retains
its ordinal modifier. Those are outside the selected 39 items and do not inflate
the metric. E6's frame index was updated after two contrast fragments became one.

| Metric | B02 POST | B03 POST |
|---|---:|---:|
| CORRECT_RESOLVED | 28 | 34 |
| WRONG_RESOLVED | 0 | 0 |
| CORRECT_UNRESOLVED | 2 | 2 |
| MISSED_DEFENSIBLE_RESOLUTION | 9 | 3 |
| Resolved precision | 28/28 = 100% | 34/34 = 100% |
| Resolution rate | 28/39 = 71.79% | 34/39 = 87.18% |
| Exact evidence offsets | 343/343 | 418/418 |

Evidence counts recursively represented textSpan occurrences, including repeated
references; it is not a count of distinct facts. Zero offset failures.
WRONG_RESOLVED=0 refers to these selected decisions, not universal error freedom.

All BEFORE_REPAIR, B01 and B02 historical artifact hashes are unchanged.
Audit scripts use exclusive creation; results cannot silently overwrite originals.

## Files

- `scripts/experimental/actor-licensing.cjs` — new positive generic license.
- `scripts/experimental/dependency-binding.cjs` — license integration/evidence.
- `scripts/experimental/contrast-correction.cjs` — bounded correction recall/typing.
- `scripts/experimental/temporal-binding.cjs` — ordinal-target route.
- `scripts/experimental/b03-post-repair-audit.cjs` — exclusive audit replay.
- `tests/fixtures/real-text-a/conservative-recall-annotations.json`.
- `tests/fixtures/real-text-a/conservative-recall-extra.json`.
- `tests/unit/v22-conservative-recall.test.cjs`.
- This separate audit directory and `real_text_round_a/11_b03_checkpoint.md`.

## Status and next measurement

B03: **PARTIAL** overall; tested positive-license and abstention invariants pass.
B01 regression: **NO observed**. B02 regression: **NO observed**.

SECOND_BLIND_CORPUS_READY: YES — specifically for a new independent research
measurement, with raw inputs / expected labels frozen before the unchanged engine
is run. This does not claim that B02/B03 or production quality are complete.

NEXT_REAL_WORLD_BLIND_TEST_READY: NO — broad readiness remains unproven; the
documented source, parser, rank and rate limitations have not been eliminated.

## RESUME FROM HERE

Do not optimize this frozen corpus further. The next milestone is a separately
authored second holdout corpus, distinct topics and wording, source/evidence audit
and fixed scoring denominator, with no first-pass tuning. Preserve this checkpoint
and all historical artifacts. Do not start production integration.
