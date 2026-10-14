# SECOND first-pass failure taxonomy — no repairs

Three proposed research blockers. These are findings, not authorized fixes.

## SB2-01 — Dimension and reference-role validation before numeric resolution

Severity: HIGH. Generalizable: yes. Selected failure: W4.

`4 fokhoz képest` becomes a resolved count with unit `count`; its owner lemma
is `f`. The exact text and dependency path are retained, but neither proves
that temperature is a count or that a comparison is an actual observation.
Likely interaction: erroneous NLP lemma plus generic counted-head fallback in
`dependency-binding.cjs`, with no independent unit/reference compatibility gate.
Evidence: W.frames[2].numericArguments[0], own `binding=resolved` and
`bindingEvidence.resolutionStatus=resolved` despite frame `binding=unresolved`.

B01 compound-denominator fallback did transfer: R3, W1 and I2 preserve h/hour/
second denominator candidates and abstain. Those are missed expected resolutions,
not WRONG_RESOLVED and not successful positive rate resolution.

## SB2-02 — Bounds and modality must survive independent positive edges

Severity: HIGH. Generalizable: yes. Selected failures: W5, T5, K2, K3.

- W5: possible afternoon 9 C measurement emits resolved measurement without
  possible scope; `modalities=[reported]`, Mood Ind, hypothetical false.
- T5: `legfeljebb 240 ... vihet` becomes resolved bare count 240 without upper
  bound, capacity relation or possible scope. Source and unit correctness do not
  make a maximum equal to an actual occupancy observation.
- K2/K3: `2030-ban kezdődhet` retains resolved year but only asserted/reported
  modality. Possibility is absent. K2 and K3 score the same event in two distinct
  preselected dimensions; they are not two independent root causes.

Likely modules: role-scope morphology/modalities, dependency numeric reconstruction
and the integration preserving frame vs argument qualifiers. The local parser
labels potential wordforms as ordinary indicative lexical verbs in these cases;
the binder does not conservatively flag the missing semantic distinction.

Adjudication: these four are strict **qualified-proposition safety** failures.
They do not imply any production or canonical facts were persisted: canonical
outputs are empty. `resolved` is attachment certainty, not truth certainty; the
failure is that the structured representation does not preserve the explicit
qualification needed to interpret that positive edge safely. If a reviewer treats
these as omissions instead, record a separate alternative audit; do not overwrite
the strict first-pass labels. The two categorical errors P1/W4 remain regardless.

## SB2-03 — Attribution source composition and predicate coverage

Severity: HIGH for false source; MEDIUM for source omissions. Generalizable: yes.
Selected false-source failure: P1; related omissions: M2, C1, S5, H4, F4, I1.

P1 `Reggeli Hír értesülése szerint ...` resolves the report noun `értesülése`
itself as attribution_source, omitting the publication possessor and inner speaker.
This is a dependency-proven nominal, but not a proven speaker. No source chain
is emitted. A textual report/evidence object must not be presented as the human
or organisation making the claim.

Other structures show source recall limits: hangsúlyozta/fogalmazott/válaszolta
do not attach their quotations; title/name and organisation/role relationships are
only partly represented. Those were scored missed, not wrong when no false source
was invented. K1 demonstrates that a different two-level source chain does work.

Likely modules: dependency according-to recovery, source NP composition,
source-scope-recovery and reporting predicate/quote segmentation. This is a new
holdout finding in B02's incomplete scope, not proof that its fixed old fixtures
regressed.

## Other omissions, not additional blocker proposals

Generic actor vocabulary, omitted-target corrections, age/quantity typing, rank
word order, promised day suffix and temporal parser shape account for additional
misses. No wrong actor or rank was observed among the selected decisions.
Do not start tuning all of them from this first-pass audit.

SECOND_BLIND_CORPUS_RESULT: FAIL
NEXT_REAL_WORLD_BLIND_TEST_READY: NO
