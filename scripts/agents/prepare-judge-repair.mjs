import fs from "node:fs";

const file = "scripts/agents/utom-brain-autoresearch.mjs";
let s = fs.readFileSync(file, "utf8");

const backup =
  file +
  ".before-judge-repair-" +
  new Date().toISOString().replace(/[:.]/g, "-") +
  ".bak";

fs.copyFileSync(file, backup);

function fail(message) {
  throw new Error("PATCH ABORTED: " + message);
}

/* ---------------------------------------------------------
   1. Protect attribution core again.
   Latest Judge did not prove that rewriting the core is needed.
--------------------------------------------------------- */

const protectedStart = s.indexOf(
  "const protectedResearchFiles = new Set(["
);

if (protectedStart < 0) {
  fail("protectedResearchFiles block not found");
}

const protectedEnd = s.indexOf(
  "]);",
  protectedStart
);

if (protectedEnd < 0) {
  fail("protectedResearchFiles end not found");
}

let protectedBlock = s.slice(
  protectedStart,
  protectedEnd + 3
);

if (
  !protectedBlock.includes(
    "scripts/experimental/attribution-chain.cjs"
  )
) {
  protectedBlock = protectedBlock.replace(
    "]);",
    '  "scripts/experimental/attribution-chain.cjs",\n]);'
  );

  s =
    s.slice(0, protectedStart) +
    protectedBlock +
    s.slice(protectedEnd + 3);
}

/* ---------------------------------------------------------
   2. Inject latest Judge-directed repair override.
--------------------------------------------------------- */

const workflowMarker =
  "0. FIRST call list_research_files. Never guess filenames that were not returned by that tool.";

if (!s.includes(workflowMarker)) {
  fail("implementer workflow marker not found");
}

const marker = "LATEST_JUDGE_REPAIR_2026_10_08";

if (!s.includes(marker)) {
  const repair = String.raw`
LATEST_JUDGE_REPAIR_2026_10_08

THIS OVERRIDES EARLIER IMPLEMENTER REPAIR ADVICE WHERE THEY CONFLICT.

The current repository state already passes the complete current
V2.2 unit suite.

Do not redesign the semantic system.
Do not redo already-working percentage-share work.
Do not rewrite contrast-correction or attribution-chain.

Your task is the narrow repair below.

TOOL DISCIPLINE

- Call list_research_files once.
- Do not repeatedly explore the repository.
- Before the first write, use at most 8 read_research_file calls.
- Prefer these existing files:
  - scripts/experimental/dependency-binding.cjs
  - tests/unit/v22-dependency-binding.test.cjs
  - tests/unit/v22-real-text-a-research.test.cjs
  - tests/fixtures/real-text-a/dependency-extra-annotations.json
- Read another file only when a concrete dependency from these files requires it.
- Do not create a new test file.
- Make the smallest defensible implementation.
- After implementation, run targeted tests immediately.
- If tests fail, repair the concrete failure; do not restart repository exploration.
- Stop when implementation and tests are complete.

REPAIR 1 — NSUBJ IS NOT SUFFICIENT ACTOR EVIDENCE

A unique nominative nsubj must NOT automatically become a resolved actor.

Example class:

  A budapesti iroda 12 embert kuldott a helyszinre.

"Iroda" may denote an organisation/unit or merely a location/office.
Dependency subjecthood alone does not prove the semantic actor type.

Resolution requires BOTH:

1. positive structural relation to the predicate, AND
2. positive semantic licensing for the candidate role.

If the semantic type is ambiguous, return unresolved.

Do not solve this with a blacklist of:
- iroda
- budapesti iroda
- or blind-example nouns.

Do not use proximity.

REPAIR 2 — POSSESSIVE PERSON-ROLE SUBJECTS

Handle structures of the general class:

  [ORGANISATION] [PERSON ROLE]-POSS ... predicate

The organisation possessor must not steal the actor role from the
syntactic person-role head.

Example class:

  Az Orion Holding vezerigazgatoja 180 embert vett fel.

Required conservative behaviour:

- organisation possessor != actor merely because it is nearby;
- if the syntactic head is positively licensed as a person-role and
  is the predicate subject, actor may attach to that head;
- if person-role status is not defensibly licensed, abstain;
- never invent a named individual behind a role noun.

Do NOT add:
- Orion Holding
- vezerigazgato
- tanar
- miniszter
- or other blind-example words as sentence-specific hacks.

Use existing entity/type/role evidence where available.

REPAIR 3 — GENERIC COUNT BINDING

Do not fix the blind case by whitelisting "megye".

A cardinal number structurally modifying an ordinary countable noun
may form a COUNT frame when local syntax licenses it and no stronger
numeric semantic type applies.

General pattern:

  NUM -> nominal count head

Examples of the semantic class include:

  19 megye
  8 iskola
  12 telepules
  27 dolgozo

These should be handled generically from structural evidence.

But preserve stronger special types:

- calendar year
- age
- duration
- money
- percentage
- measurement

REPAIR 4 — DARAB AS A COUNT UNIT

"darab" is a legitimate generic count-unit construction.

Example class:

  2026 darab legszuro

It may be represented as COUNT when structurally attached to the
counted nominal target.

Do not let the magnitude 2026 make it a year.

REPAIR 5 — YEAR VS COUNT IS LOCAL

These must remain distinct in the same sentence:

  A vallalat 2026-ban 2026 darab legszurot rendelt.

First 2026:
  calendar/year because local morphology/syntax licenses year.

Second 2026:
  count because local count-unit/nominal attachment licenses count.

Never classify by numeric magnitude alone.

REPAIR 6 — CONTRASTIVE COUNT

The accepted alternative must be bindable generically:

  nem 15, hanem 19 megye kapott tamogatast

Requirements:

- 15 remains rejected;
- 19 is the accepted numeric candidate;
- count target is the structurally licensed nominal head;
- missing count-head lexicon must not collapse the accepted branch;
- no rejected candidate may re-enter as a positive fact.

Do not whitelist "megye".

REPAIR 7 — NESTED ATTRIBUTION PRESERVATION

Do not rewrite attribution-chain core in this repair.

Instead add regression coverage showing that dependency/numeric
changes do not collapse:

- outer source
- intermediate source
- claim owner
- event actor
- numeric owner

into one role.

If an existing nested attribution case remains correct, preserve it.

TEST GENERALISATION, NOT THE JUDGE SENTENCES

Add adversarial variants, not only literal blind examples.

At minimum include tests for:

- ambiguous organisation/location subject => unresolved actor;
- possessive organisation + person-role subject;
- generic count noun that is NOT "megye";
- darab count plus calendar year in one sentence;
- contrastive count using a different count noun;
- nested attribution containing a numeric argument.

SAFETY CONTRACT

WRONG_RESOLVED is worse than UNRESOLVED.

A resolved result requires positive evidence.

No:
- proximity-only binding
- blind-sentence hardcoding
- proper-name rules
- noun blacklist for ambiguous actors
- count-head whitelist as the main strategy
- numeric-magnitude-as-year logic

Preserve:
- exact evidence spans
- dependency evidence
- contrast scope
- rejected alternatives
- attribution separation
- percentage_share semantics
- existing V2.2 behaviour

The complete current V2.2 targeted suite must remain green.
`;

  s = s.replace(
    workflowMarker,
    repair + "\n\n" + workflowMarker
  );
}

/* ---------------------------------------------------------
   3. Keep maxTurns at 50.
   With the tool budget above, 50 is already far more than needed.
--------------------------------------------------------- */

fs.writeFileSync(
  file,
  s,
  "utf8"
);

console.log("JUDGE REPAIR PATCH OK");
console.log("Backup:", backup);
console.log("Attribution core protected: YES");
console.log("Repair mode: actor abstention + generic count");
console.log("Implementer maxTurns: unchanged");
