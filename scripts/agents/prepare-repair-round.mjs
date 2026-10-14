import fs from "node:fs";
import path from "node:path";

const file = "scripts/agents/utom-brain-autoresearch.mjs";
let s = fs.readFileSync(file, "utf8");

const backup =
  file +
  ".before-repair-round-" +
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

  const second = s.indexOf(oldText, first + oldText.length);

  if (second >= 0) {
    fail("target is not unique: " + label);
  }

  s =
    s.slice(0, first) +
    newText +
    s.slice(first + oldText.length);
}

/* =========================================================
   1. IMPLEMENTER: 30 -> 50 turns
========================================================= */

replaceOnce(
  "{ maxTurns: 30 }",
  "{ maxTurns: 50 }",
  "Implementer maxTurns"
);

/* =========================================================
   2. Full CURRENT V2.2 targeted suite

   The old runner only executed:
   - contrast
   - attribution
   - real-text-A

   Replace that test array with every current v22 unit test.
========================================================= */

const oldTestNeedles = [
  "tests/unit/v22-contrast-correction.test.cjs",
  "tests/unit/v22-attribution-chain.test.cjs",
  "tests/unit/v22-real-text-a-research.test.cjs",
];

const testPos = s.indexOf(oldTestNeedles[0]);

if (testPos < 0) {
  fail("old targeted test array not found");
}

const arrayStart = s.lastIndexOf("[", testPos);
const arrayEnd = s.indexOf("]", testPos);

if (
  arrayStart < 0 ||
  arrayEnd < 0 ||
  arrayEnd <= arrayStart
) {
  fail("could not locate targeted test array");
}

const oldArray = s.slice(
  arrayStart,
  arrayEnd + 1
);

for (const test of oldTestNeedles) {
  if (!oldArray.includes(test)) {
    fail(
      "targeted array does not contain expected test: " +
        test
    );
  }
}

if (oldArray.length > 6000) {
  fail(
    "located test array is unexpectedly large; refusing unsafe patch"
  );
}

const fullV22Tests = [
  "tests/unit/v22-attribution-chain.test.cjs",
  "tests/unit/v22-contrast-correction.test.cjs",
  "tests/unit/v22-cross-domain-semantic-foundation.test.cjs",
  "tests/unit/v22-cross-domain-semantic-hardening-round2.test.cjs",
  "tests/unit/v22-dependency-binding.test.cjs",
  "tests/unit/v22-deterministic-provider.test.cjs",
  "tests/unit/v22-intelligence-benchmark.test.cjs",
  "tests/unit/v22-intelligence-benchmark-mutation.test.cjs",
  "tests/unit/v22-morph-clause-research.test.cjs",
  "tests/unit/v22-owner-presentation.test.cjs",
  "tests/unit/v22-precision-hardening.test.cjs",
  "tests/unit/v22-real-text-a-research.test.cjs",
  "tests/unit/v22-real-world-hardening-round1.test.cjs",
  "tests/unit/v22-real-world-semantic-hardening-round2.test.cjs",
  "tests/unit/v22-real-world-semantic-hardening-round2-1.test.cjs",
  "tests/unit/v22-real-world-semantic-hardening-round2-2.test.cjs",
  "tests/unit/v22-role-scope-evaluator.test.cjs",
  "tests/unit/v22-role-scope-research.test.cjs",
];

const newArray =
  "[\n" +
  fullV22Tests
    .map((x) => `  ${JSON.stringify(x)},`)
    .join("\n") +
  "\n]";

s =
  s.slice(0, arrayStart) +
  newArray +
  s.slice(arrayEnd + 1);

/* =========================================================
   3. Allow attribution-chain repair in THIS research round.

   Contrast remains protected.
   Attribution may be changed because the Judge explicitly
   identified triple-nested attribution as unproven.

   Full V2.2 tests + run rollback protect us.
========================================================= */

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

protectedBlock = protectedBlock.replace(
  /\s*["']scripts\/experimental\/attribution-chain\.cjs["'],?/,
  ""
);

s =
  s.slice(0, protectedStart) +
  protectedBlock +
  s.slice(protectedEnd + 3);

/* =========================================================
   4. Inject Judge-directed repair mission
========================================================= */

const workflowMarker =
  "0. FIRST call list_research_files. Never guess filenames that were not returned by that tool.";

if (!s.includes(workflowMarker)) {
  fail("Implementer workflow marker not found");
}

if (!s.includes("UTOM_REPAIR_ROUND_187_BASELINE")) {
  const repairMission = String.raw`
CURRENT REPAIR MISSION — UTOM_REPAIR_ROUND_187_BASELINE

The repository enters this run with the complete current V2.2 unit
suite verified at 187/187 PASS.

PRESERVE THAT BASELINE.

This is NOT a redesign and NOT a broad new research project.
Repair the exact blind-Judge weaknesses from the previous run.

PRIMARY REPAIR A — GENERALIZED AGE BINDING

The previous implementation is too dependent on a small whitelist
of person nouns.

Examples such as:

- 38 éves kerékpáros
- 41 éves tanár
- 52 éves miniszter

must be handled from positive local dependency / morphology /
syntactic evidence when the age construction clearly modifies the
nominal referent.

Do NOT solve this by adding these nouns to a whitelist.

Do NOT infer that every nominal head is a person.

If personhood or attachment is genuinely ambiguous, return unresolved.

WRONG_RESOLVED is worse than UNRESOLVED.

PRIMARY REPAIR B — PERCENTAGE SHARE SEMANTICS

Do not flatten ownership share into generic percentage or
change_magnitude.

Examples such as:

- 30 százalékos részesedés
- 25 százalékos tulajdonrész

must preserve a distinct ownership/share semantic interpretation
when licensed by local syntax.

A change such as:

- 30 százalékkal nőtt

must remain change magnitude and MUST NOT become ownership share.

No proximity-only classification.

PRIMARY REPAIR C — TRIPLE-NESTED ATTRIBUTION + NUMERIC ATTACHMENT

Add direct regression proof for deeper attribution chains containing
numeric claims.

The claim source chain, event actor and numeric owner must remain
separate.

A recipient publication must never become the source.
A quoted/intermediate reporter must never become the event actor
without structural evidence.
Numeric attachment must remain on the proposition / nominal target
licensed by local syntax.

Do not merely rely on an older attribution test indirectly passing.
Add explicit adversarial regression coverage.

PRIMARY REPAIR D — NUMERIC TYPE LICENSING

The semantic type must be licensed by local syntax, not merely by
seeing a nearby unit lexeme.

Keep at minimum distinct:

- age
- duration
- year / calendar
- money
- count / headcount
- percentage_share
- percentage_change
- measurement

Never revive a rejected contrast alternative.

MANDATORY SAFETY CONTRACT

- Preserve contrast semantics.
- Preserve existing attribution semantics unless a tested repair is required.
- Preserve exact raw evidence spans.
- Preserve dependency-path evidence for resolved bindings.
- No fixture-sentence hardcoding.
- No proper-name-specific rules.
- No noun whitelist patch for the blind examples.
- No proximity-only positive binding.
- Missing structural evidence => unresolved.
- Do not touch production code outside the explicitly allowed research scope.
- Run the provided targeted V2.2 tests after implementation.
- Stop after the repair is implemented and tested.
`;

  s = s.replace(
    workflowMarker,
    repairMission +
      "\n\n" +
      workflowMarker
  );
}

/* =========================================================
   5. Permanent RUN-START transaction

   Round backups may still reset every round, but this backup
   survives ALL rounds.
========================================================= */

const backedMarker =
  "const backedUpFiles = new Set();";

if (!s.includes(backedMarker)) {
  fail("backedUpFiles declaration not found");
}

if (!s.includes("const runBackedUpFiles = new Set();")) {
  s = s.replace(
    backedMarker,
    backedMarker +
      "\nconst runBackedUpFiles = new Set();"
  );
}

const writeSafeMarker =
  "async function writeSafe(file, content) {";

if (!s.includes(writeSafeMarker)) {
  fail("writeSafe marker not found");
}

if (!s.includes("async function backupBeforeRunWrite(file)")) {
  const runTransactionHelpers = String.raw`
async function backupBeforeRunWrite(file) {
  const p = rel(file);

  if (runBackedUpFiles.has(p)) {
    return;
  }

  const source = absolute(p);

  const destination = path.join(
    RUN_DIR,
    "run-start-backup",
    ...p.split("/")
  );

  const missingMarker =
    destination + ".UTOM_MISSING_AT_RUN_START";

  await fs.mkdir(
    path.dirname(destination),
    { recursive: true }
  );

  try {
    await fs.copyFile(
      source,
      destination
    );
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }

    await fs.writeFile(
      missingMarker,
      "",
      "utf8"
    );
  }

  runBackedUpFiles.add(p);
}

async function archiveRejectedRunState() {
  const root = path.join(
    RUN_DIR,
    "rejected-run-state"
  );

  for (const p of runBackedUpFiles) {
    const source = absolute(p);

    const destination = path.join(
      root,
      ...p.split("/")
    );

    try {
      await fs.access(source);

      await fs.mkdir(
        path.dirname(destination),
        { recursive: true }
      );

      await fs.copyFile(
        source,
        destination
      );
    } catch {
      // File may not exist in the rejected state.
    }
  }
}

async function rollbackRunStart() {
  for (const p of runBackedUpFiles) {
    const destination = absolute(p);

    const backup = path.join(
      RUN_DIR,
      "run-start-backup",
      ...p.split("/")
    );

    const missingMarker =
      backup + ".UTOM_MISSING_AT_RUN_START";

    let wasMissing = false;

    try {
      await fs.access(missingMarker);
      wasMissing = true;
    } catch {
      wasMissing = false;
    }

    if (wasMissing) {
      await fs.rm(
        destination,
        {
          recursive: true,
          force: true,
        }
      );

      continue;
    }

    await fs.access(backup);

    await fs.mkdir(
      path.dirname(destination),
      { recursive: true }
    );

    await fs.copyFile(
      backup,
      destination
    );
  }
}

`;

  s = s.replace(
    writeSafeMarker,
    runTransactionHelpers +
      writeSafeMarker
  );
}

/* Every write gets a permanent run-start backup FIRST. */

const roundBackupCall =
  "  await backupBeforeWrite(p);";

if (!s.includes(roundBackupCall)) {
  fail("backupBeforeWrite call not found");
}

if (
  !s.includes(
    "  await backupBeforeRunWrite(p);\n  await backupBeforeWrite(p);"
  )
) {
  s = s.replace(
    roundBackupCall,
    "  await backupBeforeRunWrite(p);\n" +
      roundBackupCall
  );
}

/* =========================================================
   6. If the FULL run is rejected, restore RUN START.

   Archive rejected work first so research is not lost.
========================================================= */

const finalTestMarker =
  "const finalTests = await runTargetedTestsInternal();";

if (!s.includes(finalTestMarker)) {
  fail("final targeted test marker not found");
}

if (
  !s.includes(
    "[RUN ROLLBACK] Final verdict not accepted"
  )
) {
  const finalRollback = String.raw`
if (!accepted && runBackedUpFiles.size > 0) {
  console.log(
    "[RUN ROLLBACK] Final verdict not accepted; archiving and restoring run-start checkpoint."
  );

  await archiveRejectedRunState();
  await rollbackRunStart();

  changedFiles.clear();
  backedUpFiles.clear();
}

`;

  s = s.replace(
    finalTestMarker,
    finalRollback +
      finalTestMarker
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

console.log("REPAIR ROUND PATCH OK");
console.log("Runner backup:", backup);
console.log(
  "Targeted V2.2 test files:",
  fullV22Tests.length
);
console.log(
  "Implementer maxTurns: 50"
);
console.log(
  "Run-start rollback: ENABLED"
);
console.log(
  "Judge repair mission: ENABLED"
);
