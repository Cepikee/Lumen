# UTOM V2.2 – Cross-Domain Semantic Foundation Architecture Audit

## Scope

This round keeps the production path deterministic and local. No paid AI call,
external provider, network lookup, or model dependency was added.

## Current path

`raw article → deterministic segmentation → typed entities/numbers → semantic frames → canonical safety gates → read-model projection`

The new semantic frame layer is routing evidence, not a second source of truth.
Frames retain raw offsets, attribution, polarity, modality, conditionality,
status, numeric arguments, and a bounded routing confidence. Canonical claims and
events still require explicit local entailment checks, so a lexical match alone
cannot create a high-impact canonical predicate.

## Deterministic-only option

**Benefits:** reproducible output, no runtime service or model cost, simple offline
testing, exact evidence offsets, and predictable failure by abstention.

**Risks:** weaker recall for paraphrase, coreference, implicit relations, and
long-distance temporal references. Rules can also become harder to maintain if
domain-specific exceptions are added.

## Local NLP plus deterministic safety option

A future local NLP component could propose spans, roles, and candidate relations
for difficult language. It must remain behind an explicit feature flag and feed
only the semantic-frame layer. Deterministic evidence-offset validation,
entailment gates, attribution/negation/conditionality checks, and abstention must
remain mandatory before canonical persistence.

**Benefits:** better cross-domain recall and less dependence on hand-written
surface patterns.

**Risks:** model/runtime memory and CPU cost, licensing and packaging work,
non-deterministic drift, harder incident reproduction, and additional review
burden. A local model does not remove the need for evidence safety.

## Recommendation

Keep the deterministic implementation as the production default. Prototype any
local NLP proposal offline behind a disabled flag, measure it against the frozen
benchmarks and adversarial tests, and accept a proposal only when it improves
coverage without increasing unsupported claims, false conflicts, attribution
loss, or evidence-offset failures. No model integration is part of this round.

## Round 2 decision matrix

| Criterion | A – deterministic only | B – local NLP + deterministic safety | Current evidence |
|---|---|---|---|
| Entity precision | Predictable abstention; rules still over/under-capture uncommon forms | NER may improve boundaries and typing | No local model has been measured against the frozen Hungarian corpus |
| Hungarian morphology | Conservative same-article suffix resolution is available | A morphological model could improve inflected-name recall | Expected benefit is plausible, but precision and namesake behaviour are unmeasured |
| Dependency/role binding | Clause-local rules now cover measured multi-subject patterns | Dependency parsing could generalize actor/object binding | No candidate parser has passed the evidence and entailment gates |
| CPU and RAM | Low and bounded | Model-dependent and likely materially higher | No reproducible local resource baseline exists |
| Cold start | Negligible | Model load can affect server startup and worker scaling | Not measured in the current Next.js/worker deployment |
| Node/Next.js integration | Native current path | Likely subprocess, sidecar, native binding, or WASM packaging | Operational design has not been selected or tested |
| Licensing | Existing repository dependencies only | Model weights, tokenizer, and runtime each require review | No candidate and license set has been approved |
| Offline operation | Fully supported | Possible for a bundled local model | Bundle size and update process are unknown |
| Maintenance | Rule/test changes are directly reviewable | Adds model/version monitoring and drift management | No ownership or upgrade policy exists yet |
| Production complexity | Current architecture and observability remain sufficient | New runtime health, fallback, packaging, and capacity controls | No production prototype exists |

## Decision

`RECOMMENDATION: C – MÉG NINCS ELÉG BIZONYÍTÉK`

The expected NER, morphology, and dependency-parsing benefits justify an offline
prototype later, but they do not yet justify production integration. Option A
remains the current implementation, while Option B can only be selected after a
specific local model proves better entity and frame quality on the frozen core,
dense, held-out, and adversarial sets without weakening evidence, unsupported
claim, attribution, conditional, or false-conflict safety. The comparison must
also record CPU, peak RAM, cold start, package size, licensing, Node/Next.js
integration, offline operation, maintenance, and failure-mode behaviour.
