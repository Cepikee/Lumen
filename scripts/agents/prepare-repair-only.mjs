import fs from "node:fs";

const file = "scripts/agents/utom-brain-autoresearch.mjs";
let s = fs.readFileSync(file, "utf8");

const backup =
  file +
  ".before-repair-only-" +
  new Date().toISOString().replace(/[:.]/g, "-") +
  ".bak";

fs.copyFileSync(file, backup);

function fail(msg) {
  throw new Error("PATCH ABORTED: " + msg);
}

function replaceOnce(oldText, newText, label) {
  const first = s.indexOf(oldText);

  if (first < 0) {
    fail("target not found: " + label);
  }

  const second = s.indexOf(
    oldText,
    first + oldText.length
  );

  if (second >= 0) {
    fail("target is not unique: " + label);
  }

  s =
    s.slice(0, first) +
    newText +
    s.slice(first + oldText.length);
}

/* =========================================================
   1. ONE PAID REPAIR ROUND ONLY
========================================================= */

const roundsRegex =
  /const MAX_ROUNDS = Math\.min\([\s\S]*?\n\);\n/;

if (!roundsRegex.test(s)) {
  fail("MAX_ROUNDS block not found");
}

s = s.replace(
  roundsRegex,
  "const MAX_ROUNDS = 1;\n"
);

/* =========================================================
   2. REMOVE EXPENSIVE 5-AGENT RESEARCH COUNCIL

   We already have multiple council reports + multiple Judges.
   From now on this runner is repair-only.
========================================================= */

const councilStartText =
  'console.log("\\n[3] 5 kutatoagent indul PARHUZAMOSAN...");';

const councilEndText =
  'console.log("[OK] Research council befejezte.");';

const councilStart =
  s.indexOf(councilStartText);

const councilEndStart =
  s.indexOf(councilEndText);

if (
  councilStart < 0 ||
  councilEndStart < 0 ||
  councilEndStart <= councilStart
) {
  fail("research council section not found");
}

const councilEnd =
  councilEndStart + councilEndText.length;

const repairReportsBlock = String.raw`
console.log(
  "\n[3] REPAIR-ONLY MODE: 5-agent research council kihagyva."
);

const reports = \`
REPAIR-ONLY FROZEN RESEARCH CONTEXT
===================================

The broad research council has already been run multiple times.
Do not restart general research.

Verified baseline before this repair mode:
- complete current V2.2 unit suite: 187/187 PASS
- contrast preservation is already strongly covered
- attribution has existing nested-chain coverage
- dependency binding has existing structural regressions
- run-level rollback has been verified

PREVIOUS BLIND-JUDGE FINDINGS THAT MUST BE TREATED AS REGRESSION TARGETS:

ACTOR:
- nsubj alone is not sufficient semantic actor evidence
- do not use "-i adjective" suffix suppression
- do not blacklist "iroda" or other individual nouns
- do not confuse organisation possessor with person-role subject
- preserve abstention where semantic actor licensing is genuinely ambiguous

NUMERIC:
- distinguish calendar YEAR from COUNT locally
- generic count binding must not depend on noun whitelists
- "darab" ALREADY EXISTS in the baseline count-unit lexicon;
  do not claim it is missing
- preserve contrastive accepted numeric alternatives
- add duration coverage beyond years:
  week / day / hour and locally licensed inflected forms
- preserve percentage as percentage in percentage-change constructions
- ownership share and change percentage remain semantically distinct

FRAME COMPOSITION:
- one unresolved numeric argument must not automatically destroy
  independently licensed actor/source bindings
- preserve exact evidence spans and dependency evidence

ATTRIBUTION:
- preserve outer source, intermediate source, claim owner,
  event actor and numeric owner as distinct roles
- do not replace source-chain structure with "szerint" proximity

DO NOT FIX BLIND EXAMPLES WITH LITERAL SENTENCE RULES.
DO NOT ADD PROPER-NAME-SPECIFIC RULES.
DO NOT ADD NOUN BLACKLISTS AS THE ACTOR MODEL.
DO NOT ADD GENERIC COUNT NOUN WHITELISTS AS THE MAIN STRATEGY.

WRONG_RESOLVED remains worse than UNRESOLVED.
\`;

await save(
  "03-research-reports.md",
  reports
);

console.log(
  "[OK] Frozen prior research/Judge findings betoltve."
);`;

s =
  s.slice(0, councilStart) +
  repairReportsBlock +
  s.slice(councilEnd);

/* =========================================================
   3. FINAL FROZEN IMPLEMENTER GATE

   This explicitly supersedes all older accumulated repair prompts.
========================================================= */

const workflowMarker =
  "0. FIRST call list_research_files. Never guess filenames that were not returned by that tool.";

if (!s.includes(workflowMarker)) {
  fail("implementer workflow marker not found");
}

const frozenMarker =
  "FINAL_FROZEN_REPAIR_GATE_2026_10_09";

if (!s.includes(frozenMarker)) {
  const frozenRepair = String.raw`
FINAL_FROZEN_REPAIR_GATE_2026_10_09

THIS SECTION SUPERSEDES ALL EARLIER REPAIR INSTRUCTIONS WHEN THEY CONFLICT.

This is a focused repair, not new exploratory research.

CURRENT VERIFIED BASELINE:
187/187 complete current V2.2 unit tests PASS.

You must preserve that baseline.

==================================================
A. ACTOR SEMANTIC LICENSING
==================================================

A dependency nsubj edge is structural evidence but is NOT,
by itself, sufficient semantic-role evidence.

Do not resolve actor merely because:

candidate.dep === "nsubj"

Do not solve ambiguity using suffix hacks such as:

adjective ending in "-i" => non-actor

That rule is forbidden because legitimate event actors may have
modifiers such as:

- fővárosi egyetem
- országos szervezet
- magyar minisztérium

The correct model must distinguish structural subjecthood from
semantic role licensing.

Where semantic role licensing is not defensible:
UNRESOLVED.

Do not blacklist individual nouns.

==================================================
B. POSSESSIVE ORGANISATION / PERSON ROLE
==================================================

Preserve syntactic head structure.

General construction:

ORGANISATION + possessed PERSON-ROLE + predicate

The organisation possessor must not automatically become actor.

The person-role head may be actor only when positively licensed by
structure / entity or role evidence.

Do not invent the identity of the person behind a role noun.

==================================================
C. GENERIC COUNT
==================================================

A cardinal number structurally attached to a countable nominal may
form a COUNT argument when no stronger numeric semantic class applies.

Do not make this depend primarily on a fixed noun list.

Important:
"darab" ALREADY exists in the baseline unit map.

Do not "fix" the system by adding darab again.

Test generalisation using multiple unseen countable nouns.

==================================================
D. YEAR VS COUNT
==================================================

Classification is local and structural.

The same surface number may appear twice:

2026-ban ... 2026 darab ...

First:
YEAR / calendar

Second:
COUNT

Never classify as YEAR because the magnitude resembles a year.

==================================================
E. DURATION
==================================================

Generalize duration beyond "év".

At minimum support structurally licensed:

- hét
- nap
- óra

including relevant Hungarian case-marked / inflected constructions
when local dependency and morphology support duration.

Do not confuse:

age
calendar year
duration
count

==================================================
F. PERCENTAGE SEMANTICS
==================================================

Do not erase percentage type merely because the percentage expresses
change.

A phrase such as:

30 százalékkal nőtt

must still preserve that its numeric semantic type is percentage.

A separate qualifier/subtype may express:

change magnitude

Ownership/share percentage must remain distinguishable from
percentage change.

==================================================
G. PARTIAL FRAME PRESERVATION
==================================================

If one numeric argument is unresolved, do NOT automatically mark
independently proven actor/source bindings unresolved.

Each semantic edge must survive or abstain based on its own evidence.

No cascading uncertainty unless there is an actual dependency between
the edges.

==================================================
H. CONTRAST
==================================================

For:

nem OLD, hanem NEW ...

OLD must remain rejected.

NEW may become positive only if independently licensed by syntax.

Never resurrect OLD through the dependency layer.

Generic count coverage must work inside accepted contrast branches.

==================================================
I. NESTED ATTRIBUTION
==================================================

Preserve distinct:

- outer publisher
- intermediate reporting source
- inner claim owner/source
- event actor
- numeric owner

Do not infer source chains from raw proximity to "szerint".

Use governing NP / reporting relation / clause scope evidence.

Do not rewrite attribution-chain core unless the dependency repair
demonstrably requires it and regression tests prove the change.

==================================================
MANDATORY NEW REGRESSIONS
==================================================

Modify existing V2.2 research test files.

Do NOT create a new test file.

Add generalized adversarial variants covering at minimum:

1. legitimate organisation actor with an "-i" adjective modifier
2. ambiguous subject where nsubj alone must abstain
3. organisation possessor + person-role syntactic subject
4. generic countable noun not already represented by the earlier blind examples
5. calendar year and equal-valued count in the same sentence
6. week duration
7. day or hour duration
8. percentage change retaining percentage semantics
9. unresolved numeric argument while independently licensed actor/source survives
10. contrastive accepted COUNT
11. nested attribution with numeric attachment

Do not copy only the Judge's exact sentences.

==================================================
TOOL BUDGET
==================================================

Call list_research_files exactly once.

Before FIRST WRITE:
maximum 8 read_research_file calls.

Start with:

- scripts/experimental/dependency-binding.cjs
- tests/unit/v22-dependency-binding.test.cjs
- tests/unit/v22-real-text-a-research.test.cjs
- tests/fixtures/real-text-a/dependency-extra-annotations.json

Only inspect another file when one of these reveals a concrete
dependency requiring it.

After the first implementation:
RUN TARGETED TESTS IMMEDIATELY.

If they fail:
repair the concrete failure.

Do not restart repository exploration.

Stop once:
- implementation is complete
- regressions are added
- full provided V2.2 targeted tests pass
`;

  s = s.replace(
    workflowMarker,
    frozenRepair +
      "\n\n" +
      workflowMarker
  );
}

/* =========================================================
   4. EVIDENCE-BASED JUDGE CONTRACT
========================================================= */

const judgeMarker =
  "Reject overfitted solutions and unsupported semantic certainty.";

if (!s.includes(judgeMarker)) {
  fail("Judge instruction marker not found");
}

if (
  !s.includes(
    "JUDGE_EVIDENCE_CONTRACT_2026_10_09"
  )
) {
  const judgeContract = String.raw`
JUDGE_EVIDENCE_CONTRACT_2026_10_09

You are evaluating held-out semantics, but REJECT is a high-confidence
decision and therefore has a strict evidence burden.

You MUST NOT issue VERDICT: REJECT merely because something:

- "likely fails"
- "probably fails"
- "appears brittle"
- "may fail"
- "seems unsupported"

Those observations may justify:
VERDICT: NEEDS_ANOTHER_ROUND

but they are insufficient for REJECT.

Before claiming a feature is absent, inspect the supplied CURRENT
CHANGED SOURCE carefully.

Do not claim that a token/unit/rule is missing when it is visibly
present in the supplied source.

In particular:
the baseline already contains "darab" as a count unit.
Do not report its absence unless the current source actually removed it.

For VERDICT: REJECT you MUST include exactly this evidence section:

FAIL_EVIDENCE:
CASE: <exact held-out input or precisely identified structural class>
EXPECTED: <required semantic result>
ACTUAL_OR_SOURCE_PROOF: <actual observed result OR exact function/rule and deterministic code path proving failure>
INVARIANT: <which mission invariant is violated>

A REJECT without all four fields is invalid.

If you cannot prove the failure to that standard, use
NEEDS_ANOTHER_ROUND instead.

Passing targeted tests is not by itself sufficient for ACCEPT.
But speculative reasoning is not sufficient for REJECT either.

Prefer explicit evidence over intuition.
`;

  s = s.replace(
    judgeMarker,
    judgeMarker +
      "\n\n" +
      judgeContract
  );
}

/* =========================================================
   5. CONTROLLER ENFORCEMENT:
      INVALID REJECT -> NEEDS_ANOTHER_ROUND
========================================================= */

const verdictAssignment =
  "  finalVerdict = judgeResult.finalOutput;";

if (!s.includes(verdictAssignment)) {
  fail("finalVerdict assignment not found");
}

if (
  !s.includes(
    "CONTROLLER_EVIDENCE_GATE"
  )
) {
  const evidenceGate = String.raw`
  finalVerdict = judgeResult.finalOutput;

  // CONTROLLER_EVIDENCE_GATE
  if (/^VERDICT:\s*REJECT/im.test(finalVerdict)) {
    const hasFailEvidence =
      /FAIL_EVIDENCE:/i.test(finalVerdict);

    const hasCase =
      /CASE:\s*\S+/i.test(finalVerdict);

    const hasExpected =
      /EXPECTED:\s*\S+/i.test(finalVerdict);

    const hasProof =
      /ACTUAL_OR_SOURCE_PROOF:\s*\S+/i.test(
        finalVerdict
      );

    const hasInvariant =
      /INVARIANT:\s*\S+/i.test(finalVerdict);

    if (
      !hasFailEvidence ||
      !hasCase ||
      !hasExpected ||
      !hasProof ||
      !hasInvariant
    ) {
      finalVerdict =
        finalVerdict.replace(
          /^VERDICT:\s*REJECT/im,
          "VERDICT: NEEDS_ANOTHER_ROUND"
        ) +
        "\n\nCONTROLLER_NOTE: " +
        "REJECT downgraded because the Judge did not provide " +
        "the mandatory evidence contract.";
    }
  }`;

  replaceOnce(
    verdictAssignment,
    evidenceGate,
    "Judge controller evidence gate"
  );
}

/* =========================================================
   SAVE
========================================================= */

fs.writeFileSync(
  file,
  s,
  "utf8"
);

console.log("REPAIR-ONLY PATCH OK");
console.log("Backup:", backup);
console.log("Research council: DISABLED");
console.log("Paid rounds: 1");
console.log("Frozen regression gate: ENABLED");
console.log("Judge evidence gate: ENABLED");
console.log("Run-start rollback: PRESERVED");
