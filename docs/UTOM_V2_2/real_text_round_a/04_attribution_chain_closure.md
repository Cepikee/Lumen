# Nested attribution research checkpoint — 2026-10-08

Research-only continuation after contrast correction. Existing working-tree research edits were preserved. Production code, flags, RSS, pipeline, auth and deployment files were not modified. No commit/push.

## Root cause and representation

The old binder chose one reporting predicate/source for a clause. Multiple source markers were either flattened or discarded as unsafe. Publisher-level text could also become a separate action frame. A recipient after a reporting verb needed to remain in the reporting header rather than the embedded proposition.

New sentence-local `attributionChains` contain ordered edges with source mention/evidence, attribution verb/span, proposition span, depth, parentAttributionId, targetId, binding state and rule reason. The last edge targets an actual proposition frame. Frames expose `claimOwner` and `attributionChainId`; the old flat source/reportingActor/attribution fields are null for these chains. Event actors are bound from embedded tokens only. Citation sources and publication recipients are distinct. Identity IDs remain null when no canonical identity is established; uncertain inflected recipient names are not invented from morphology.

Narration is explicitly labeled and its unknown publisher remains null. The actual article publisher is not inferred from a name mentioned inside the text. Denial yields `denied_claim`; a negated reporting verb yields unresolved/unconfirmed content, not a positive fact. Pronoun coreference is not inferred.

The embedded quantity/unit handling preserves the requested 300 workers and 4.2 billion EUR without assigning either to a reporting source. Numeric argument resolution does not establish an event actor.

## Files

- scripts/experimental/attribution-chain.cjs — new bounded research grammar.
- scripts/experimental/real-text-a-binder.cjs — wrapper integration.
- tests/fixtures/real-text-a/attribution-annotations.json — nine recorded local HuSpaCy annotations (six requested examples plus ambiguity/missing/negative reporting cases).
- tests/unit/v22-attribution-chain.test.cjs — eight regression tests.
- tests/unit/v22-real-text-a-research.test.cjs — existing nested-source assertion now checks the explicit supported chain instead of former abstention.

## Targeted validation

Command: `node --test tests/unit/v22-attribution-chain.test.cjs tests/unit/v22-contrast-correction.test.cjs tests/unit/v22-real-text-a-research.test.cjs tests/unit/v22-role-scope-research.test.cjs tests/unit/v22-role-scope-evaluator.test.cjs tests/unit/v22-morph-clause-research.test.cjs`

104/104 PASS, 0 FAIL. Exact raw offsets, edge-parent-target integrity, source ordering, recipient isolation, denial and adjacent-sentence scope checked. Canonical outputs remain empty and every resulting frame keeps canonicalProjectionAllowed=false. No full suite/build/preflight/MySQL suite executed.

## Status / limitations

NESTED ATTRIBUTION SOURCE CHAINS: PASS within the six requested sentence-local constructions and explicit abstention cases. This does not establish general real-news attribution accuracy.

Literal quoted/nested-quote chains remain unresolved, as do coordinated/implicit speakers, unsupported postposed reporting headers and chains beyond the bounded grammar. No cross-document identity, coreference, discourse or entailment claim is made. HuSpaCy entity/type mistakes still affect coverage. A chain can be resolved while its event actor or whole proposition remains unresolved; these are distinct dimensions.

- ACTOR ROLE: PARTIAL
- ATTRIBUTION SOURCE: PARTIAL globally; requested nested forms covered
- NUMERIC OWNERSHIP: PARTIAL
- LOGICAL / CONDITIONAL SCOPE: PARTIAL
- ENTITY BOUNDARY: PARTIAL
- EVIDENCE: PASS on targeted fixtures
- SEMANTIC ENTAILMENT: NOT YET VERIFIED

NEXT_REAL_WORLD_BLIND_TEST_READY: NO

Next single blocker: dependency-supported event actor and numeric argument attachment on independently annotated clauses, avoiding nominative/NER proximity as sufficient evidence. Do not start it in this session.
