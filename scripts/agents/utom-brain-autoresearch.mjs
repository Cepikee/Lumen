import { Agent, run, tool } from "@openai/agents";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY HIANYZIK");
  process.exit(1);
}

const ROOT = process.cwd();
const MODEL = process.env.UTOM_AGENT_MODEL || "gpt-5.4-mini";
const MAX_ROUNDS = 1;

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const RUN_DIR = path.join(ROOT, "scripts", "agents", "runs", stamp);

await fs.mkdir(RUN_DIR, { recursive: true });

const READ_ROOTS = [
  "scripts/experimental",
  "tests/unit",
  "tests/fixtures/real-text-a",
  "docs/UTOM_V2_2",
];

const WRITE_ROOTS = [
  "scripts/experimental",
  "tests/unit",
  "tests/fixtures/real-text-a",
  "docs/UTOM_V2_2",
];

const TARGET_TESTS = [
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

const changedFiles = new Set();
const backedUpFiles = new Set();
const runBackedUpFiles = new Set();

function rel(input) {
  if (typeof input !== "string" || !input.trim()) {
    throw new Error("Invalid path");
  }

  const p = input.replaceAll("\\", "/").replace(/^\.\/+/, "");

  if (
    p.startsWith("/") ||
    /^[A-Za-z]:/.test(p) ||
    p.split("/").includes("..")
  ) {
    throw new Error(`Unsafe path: ${input}`);
  }

  return p;
}

function underRoots(file, roots) {
  return roots.some((root) => file === root || file.startsWith(root + "/"));
}

function absolute(file) {
  return path.join(ROOT, ...rel(file).split("/"));
}

async function exists(file) {
  try {
    await fs.access(absolute(file));
    return true;
  } catch {
    return false;
  }
}

async function readSafe(file, limit = 90000) {
  const p = rel(file);

  if (!underRoots(p, READ_ROOTS)) {
    throw new Error(`READ DENIED: ${p}`);
  }

  const text = await fs.readFile(absolute(p), "utf8");

  if (text.length <= limit) return text;

  return (
    text.slice(0, limit) +
    `\n\n[TRUNCATED: ${text.length - limit} characters omitted]\n`
  );
}

async function backupBeforeWrite(file) {
  const p = rel(file);

  if (backedUpFiles.has(p)) return;
  backedUpFiles.add(p);

  if (!(await exists(p))) return;

  const destination = path.join(
    RUN_DIR,
    "backup",
    ...p.split("/")
  );

  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(absolute(p), destination);
}



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

async function writeSafe(file, content) {
  const p = rel(file);

  if (!underRoots(p, WRITE_ROOTS)) {
    throw new Error("WRITE DENIED: " + p);
  }

  const protectedResearchFiles = new Set([
    "scripts/experimental/contrast-correction.cjs",
    "scripts/experimental/attribution-chain.cjs",
]);

  if (protectedResearchFiles.has(p)) {
    throw new Error(
      "WRITE DENIED: verified contrast/attribution module is protected in this blocker: " +
        p
    );
  }

  if (p.startsWith("tests/unit/")) {
    const name = path.basename(p);

    if (!name.startsWith("v22-")) {
      throw new Error(
        "WRITE DENIED: only V2.2 unit tests may be changed: " + p
      );
    }
  }

  if (typeof content !== "string") {
    throw new Error("Content must be string");
  }

  if (content.length > 300000) {
    throw new Error("File too large to write safely: " + p);
  }

  const target = absolute(p);
  const ext = path.extname(target).toLowerCase();

  if ([".js", ".cjs", ".mjs"].includes(ext)) {
    const temp =
      target.slice(0, -ext.length) +
      ".agent-syntax-check-" +
      process.pid +
      ext;

    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(temp, content, "utf8");

    try {
      await execFileAsync(
        process.execPath,
        ["--check", temp],
        {
          cwd: ROOT,
          timeout: 30000,
          maxBuffer: 2 * 1024 * 1024,
        }
      );
    } catch (error) {
      await fs.rm(temp, { force: true });

      return (
        "ERROR: SYNTAX CHECK FAILED for " +
        p +
        "\n" +
        String(error.stderr || error.message || error)
      );
    }

    await fs.rm(temp, { force: true });
  }

  if (ext === ".json") {
    try {
      JSON.parse(content);
    } catch (error) {
      return (
        "ERROR: JSON VALIDATION FAILED for " +
        p +
        "\n" +
        error.message
      );
    }
  }

  await backupBeforeRunWrite(p);
  await backupBeforeWrite(p);

  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, "utf8");

  changedFiles.add(p);

  return "WROTE " + p + " (" + content.length + " chars)";
}

async function resetRoundTracking() {
  changedFiles.clear();
  backedUpFiles.clear();

  await fs.rm(
    path.join(RUN_DIR, "backup"),
    {
      recursive: true,
      force: true,
    }
  );
}

async function archiveChangedFiles(label) {
  const destinationRoot = path.join(RUN_DIR, label);

  for (const file of changedFiles) {
    if (!(await exists(file))) continue;

    const destination = path.join(
      destinationRoot,
      ...file.split("/")
    );

    await fs.mkdir(path.dirname(destination), {
      recursive: true,
    });

    await fs.copyFile(
      absolute(file),
      destination
    );
  }
}

async function rollbackRound() {
  for (const file of [...changedFiles]) {
    const backup = path.join(
      RUN_DIR,
      "backup",
      ...file.split("/")
    );

    try {
      await fs.access(backup);

      await fs.mkdir(
        path.dirname(absolute(file)),
        { recursive: true }
      );

      await fs.copyFile(
        backup,
        absolute(file)
      );
    } catch {
      await fs.rm(
        absolute(file),
        {
          recursive: true,
          force: true,
        }
      );
    }
  }

  changedFiles.clear();
  backedUpFiles.clear();
}

async function runTargetedTestsInternal() {
  const available = [];

  for (const test of TARGET_TESTS) {
    if (await exists(test)) available.push(test);
  }

  if (!available.length) {
    return {
      ok: false,
      output: "NO TARGETED V2.2 TEST FILES FOUND",
      tests: [],
    };
  }

  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      ["--test", ...available],
      {
        cwd: ROOT,
        timeout: 180000,
        maxBuffer: 12 * 1024 * 1024,
      }
    );

    return {
      ok: true,
      tests: available,
      output: `${stdout || ""}\n${stderr || ""}`.slice(-60000),
    };
  } catch (error) {
    return {
      ok: false,
      tests: available,
      output: [
        error.stdout || "",
        error.stderr || "",
        error.message || "",
      ]
        .join("\n")
        .slice(-60000),
    };
  }
}

const readFileTool = tool({
  name: "read_research_file",
  description:
    "Read an UTOM V2.2 research, fixture, documentation or V2.2 test file. Production application files are intentionally unavailable.",
  parameters: z.object({
    path: z.string(),
  }),
  async execute({ path }) {
    try {
      return await readSafe(path);
    } catch (error) {
      return `ERROR: ${error.message}`;
    }
  },
});

const writeFileTool = tool({
  name: "write_research_file",
  description:
    "Create or update an UTOM V2.2 experimental, fixture, documentation or v22-* unit test file. A backup is automatically created before modifying an existing file.",
  parameters: z.object({
    path: z.string(),
    content: z.string(),
  }),
  async execute({ path, content }) {
    try {
      return await writeSafe(path, content);
    } catch (error) {
      return `ERROR: ${error.message}`;
    }
  },
});

const runTestsTool = tool({
  name: "run_targeted_v22_tests",
  description:
    "Run only the targeted UTOM V2.2 semantic regression tests. Never runs the complete test suite, build, production preflight or deployment.",
  parameters: z.object({
    reason: z.string().optional(),
  }),
  async execute() {
    const result = await runTargetedTestsInternal();

    return JSON.stringify(
      {
        ok: result.ok,
        tests: result.tests,
        output: result.output,
      },
      null,
      2
    );
  },
});


const listResearchFilesTool = tool({
  name: "list_research_files",
  description:
    "List the actual UTOM V2.2 research files that currently exist. Use this before reading files so filenames are never guessed.",
  parameters: z.object({}),
  async execute() {
    let files = [];

    for (const root of READ_ROOTS) {
      files.push(...(await walk(root)));
    }

    return files
      .filter((file) =>
        /\.(cjs|mjs|js|json|md|py)$/i.test(file)
      )
      .sort()
      .join("\n")
      .slice(0, 60000);
  },
});

async function walk(dir, out = []) {
  let entries;

  try {
    entries = await fs.readdir(path.join(ROOT, dir), {
      withFileTypes: true,
    });
  } catch {
    return out;
  }

  for (const entry of entries) {
    const child = `${dir}/${entry.name}`;

    if (entry.isDirectory()) {
      await walk(child, out);
    } else {
      out.push(child);
    }
  }

  return out;
}

async function buildResearchContext() {
  let files = [];

  for (const root of READ_ROOTS) {
    files.push(...(await walk(root)));
  }

  files = files
    .filter((file) =>
      /\.(cjs|mjs|js|json|md)$/i.test(file)
    )
    .filter((file) =>
      /v22|real-text-a|contrast|attribution|dependency|numeric|actor|semantic|binder/i.test(
        file
      )
    )
    .sort();

  const priority = [
    "scripts/experimental/real-text-a-binder.cjs",
    "scripts/experimental/contrast-correction.cjs",
    "scripts/experimental/attribution-chain.cjs",
    "tests/fixtures/real-text-a/contrast-annotations.json",
    "tests/fixtures/real-text-a/attribution-annotations.json",
    "tests/unit/v22-dependency-actor-numeric.test.cjs",
    "tests/unit/v22-contrast-correction.test.cjs",
    "tests/unit/v22-attribution-chain.test.cjs",
    "tests/unit/v22-real-text-a-research.test.cjs",
  ];

  const ordered = [
    ...priority.filter((f) => files.includes(f)),
    ...files.filter((f) => !priority.includes(f)),
  ].slice(0, 24);

  let output = "";
  const TOTAL_LIMIT = 85000;

  for (const file of ordered) {
    if (output.length >= TOTAL_LIMIT) break;

    try {
      const body = await readSafe(file, 14000);

      output +=
        `\n\n================ FILE: ${file} ================\n` +
        body;
    } catch {}
  }

  return output.slice(0, TOTAL_LIMIT);
}

async function save(name, text) {
  await fs.writeFile(
    path.join(RUN_DIR, name),
    String(text ?? ""),
    "utf8"
  );
}

const MISSION = `
UTOM V2.2 AUTONOMOUS SEMANTIC RESEARCH MISSION
=============================================

PRODUCT CONTEXT
---------------
UTOM is a Hungarian news-intelligence system.

The semantic research subsystem must not merely summarize text.
Its job is to construct conservative, evidence-backed semantic
representations from real Hungarian news language.

The fundamental safety rule is:

    WRONG_RESOLVED is much worse than UNRESOLVED.

If the system cannot positively justify a binding from syntax,
morphology, dependency structure, explicit lexical relation,
scope or another defensible sentence-local signal, it should
prefer unresolved.

Never invent semantic certainty from proximity alone.

CURRENT VERIFIED RESEARCH
-------------------------
The system already has targeted research work around:

1. Contrastive negation / correction:
   "nem X, hanem Y"

   Required behavior:
   - rejected alternative must not survive as a positive fact
   - accepted alternative remains positive
   - event itself must not accidentally become negated
   - rejected and accepted alternatives may bind actor, amount,
     number, date/time, source or object
   - ambiguous cases remain unresolved

2. Nested attribution chains:

   Example conceptual structure:

      police -> witness -> proposition

   The system must preserve:
   - outer source
   - intermediate source
   - inner source
   - claim owner
   - event actor
   - attribution verb
   - parent/child attribution relation
   - evidence
   - denied/uncertain claims where relevant

Do not regress either of these areas.

CURRENT BLOCKER
---------------
DEPENDENCY-BACKED ACTOR AND NUMERIC ARGUMENT BINDING.

The system needs a much stronger distinction between a nearby
entity and an entity that is actually licensed by syntax or
morphology to fill a semantic role.

ACTOR REQUIREMENTS
------------------
Distinguish at minimum:

- grammatical subject
- semantic actor / agent
- passive patient
- explicit passive agent
- object
- recipient
- possessive owner
- attribution source
- claim owner
- event actor
- implicit / omitted actor
- unresolved actor

Hungarian is especially important because word order is flexible.

Do NOT assume:

    nearest person/entity to predicate == actor

Evidence may include:

- case morphology
- verbal agreement
- subject-predicate construction
- passive/periphrastic construction
- possession markers
- postpositions
- explicit attribution verbs
- dependency-like structural relation
- clause boundary/scope
- contrastive correction

Example traps:

"Kovács Péter cége 120 embert vett fel."

Correct semantic distinction:
- event actor = company
- Kovács Péter = possessor/modifier
- object/count target = people
- 120 = count tied to hiring event/object
- do not turn Kovács Péter himself into event actor

"A vállalat szerint Kovács Péter 120 embert vett fel."

Different structure:
- source = company
- event actor = Kovács Péter
- 120 = count of hired persons

NUMERIC REQUIREMENTS
--------------------
Numbers must be typed and attached to the correct semantic frame.

At minimum distinguish:

- count
- money
- percentage
- age
- duration
- year
- calendar date
- clock time
- measurement
- ordinal/ranking where identifiable
- unresolved numeric expression

Examples:

"38 millió forintos szerződés"
    money/contract amount

"38 éves férfi"
    age

"38 százalékkal nőtt"
    percentage/change

"38 embert vett fel"
    count/event argument

"2026-ban"
    temporal year of appropriate event

"2026 dolgozót alkalmaz"
    count, NOT year

"három évig"
    duration

"3 kilométerre"
    measurement/distance

Never classify only because the token looks like a four-digit year.
Local syntax and lexical unit matter.

OWNERSHIP / BINDING
-------------------
Numeric ownership means semantic attachment, not legal ownership.

The system should be able to say things such as:

- number belongs to event argument
- amount belongs to contract
- percentage belongs to change
- age belongs to person
- duration belongs to event/state
- year belongs to event temporal frame

Do not attach a number to an actor simply because the actor is nearby.

EVIDENCE CONTRACT
-----------------
A resolved binding should expose enough information to explain why
it was resolved.

Where practical preserve:

- value/text
- semantic type
- target entity/frame
- role
- evidence span or source fragment
- rule/reason
- confidence/resolution status

If evidence is weak:
    unresolved

If two interpretations remain plausible:
    unresolved or explicitly ambiguous

Do not silently choose.

RESEARCH QUALITY
----------------
Every change should answer:

1. Which failure class does this fix?
2. What positive evidence licenses the new resolution?
3. Which counterexample prevents overgeneralization?
4. Which existing behavior could regress?
5. What targeted regression proves the fix?

Do not optimize merely for test count.
Do not create a brittle phrase dictionary that memorizes fixtures.

Prefer reusable rules.

REGRESSION EXPECTATIONS
-----------------------
Create or strengthen targeted regression cases covering at least:

- possessive owner vs event actor
- attribution source vs event actor
- subject vs object with flexible Hungarian word order
- person age vs nearby event number
- money vs count
- year vs count
- percentage ownership
- duration binding
- measurement binding
- nested attribution + numeric binding
- contrastive correction + actor binding
- ambiguous actor case that MUST remain unresolved

PRESERVATION RULES
------------------
Must preserve the verified semantics of:

- contrastive negation
- attributionChains
- rejected vs accepted alternatives
- uncertain/unresolved representation
- evidence spans
- existing fixture behavior

STRICT SCOPE
------------
This is RESEARCH ONLY.

Allowed modification areas:
- scripts/experimental/**
- tests/unit/v22-*.test.cjs
- tests/fixtures/real-text-a/**
- docs/UTOM_V2_2/**

Forbidden:
- app/**
- production pipeline
- auth
- database schema/migrations
- RSS
- billing
- production configuration
- package.json dependency changes
- package-lock.json changes
- build configuration

Never:
- npm install
- npm audit fix
- full test suite
- Next.js build
- production preflight
- git commit
- git push
- deploy

SUCCESS CRITERIA
----------------
The round is successful only when:

A. targeted tests pass
B. no obvious contrast regression exists
C. no obvious attribution regression exists
D. actor resolution uses positive structural evidence
E. numeric attachment uses positive structural evidence
F. ambiguous cases remain unresolved
G. blind adversarial cases do not expose a high
   WRONG_RESOLVED risk

The goal is NOT maximum resolution.

The goal is:

    maximum defensible resolution
    with minimum WRONG_RESOLVED.
`;

function specialist(name, instructions, effort = "medium") {
  return new Agent({
    name,
    model: MODEL,
    modelSettings: {
      reasoning: { effort },
      text: { verbosity: "medium" },
      maxTokens: effort === "high" ? 60000 : 30000,
    },
    instructions,
  });
}

const linguist = specialist(
  "UTOM Hungarian Linguist",
  `
You are the Hungarian linguistics specialist for UTOM V2.2.

Focus on actual Hungarian syntax, morphology, possession,
case marking, flexible word order, clause structure and
subject/object ambiguity.

Do NOT write code.

Find concrete failure classes in the supplied implementation
and fixtures.

For each finding provide:

FAILURE_CLASS
EXAMPLE
CORRECT_SEMANTICS
POSITIVE_EVIDENCE
WRONG_HEURISTIC_TO_AVOID
SUGGESTED_RULE
REGRESSION_CASE

Be conservative.
Prefer unresolved over unsupported resolution.
`
);

const dependencyAgent = specialist(
  "UTOM Dependency Binder Researcher",
  `
You specialize in semantic/dependency binding.

Inspect the supplied UTOM V2.2 research implementation.

Determine where actor/object/source/possessor resolution is
currently based on proximity, lexical coincidence or insufficient
scope reasoning.

Do NOT edit code.

Produce:
- current architecture assessment
- exact weak rules
- structural replacement strategy
- compatibility requirements
- edge cases
- recommended data representation
- targeted tests

Preserve contrast correction and attribution chains.
`
);

const numericAgent = specialist(
  "UTOM Numeric Semantics Researcher",
  `
You specialize in numeric semantic ownership.

Study how numbers should bind in Hungarian news text.

Distinguish count, money, percentage, age, duration, year,
calendar date, clock time, measurement and unresolved numeric
expressions.

Inspect the supplied implementation and identify:
- false year detection risk
- false actor ownership
- proximity mistakes
- unit interpretation errors
- clause-scope mistakes

Do NOT edit code.

Give exact proposed rules and adversarial regressions.
`
);

const redTeam = specialist(
  "UTOM Semantic Red Team",
  `
You are hostile to overconfident semantic resolution.

Your job is to break the proposed/current binder.

Generate realistic Hungarian news sentences that defeat:
- nearest-entity actor heuristics
- nearest-number ownership heuristics
- naive 4-digit year rules
- possession handling
- attribution handling
- negation handling
- clause-boundary handling

Do NOT write implementation code.

For each case specify:
INPUT
TRAP
GOLD_SEMANTICS
WHAT_MUST_REMAIN_UNRESOLVED
LIKELY_BAD_BINDING

WRONG_RESOLVED is the primary failure metric.
`
);

const evidenceAgent = specialist(
  "UTOM Evidence and Safety Auditor",
  `
You audit SENTENCE-LOCAL SEMANTIC EVIDENCE.

Important:
Do NOT demand an external web source.
"EVIDENCE" here means evidence in the supplied sentence/text:
tokens, spans, morphology, syntax, lexical units, clause scope
and explicit relations.

Audit whether resolved actor and numeric bindings can be justified
by sentence-local evidence.

Classify patterns as:
SUPPORTED
WEAK
AMBIGUOUS
UNSUPPORTED

Give implementation constraints that prevent unsupported
resolution.

Do NOT edit code.
`
);

const blindDesigner = specialist(
  "UTOM Blind Benchmark Designer",
  `
You design a HELD-OUT Hungarian semantic benchmark.

The implementer will NOT see your cases before modifying code.

Generate 14 difficult, natural Hungarian news-style cases focused
on actor and numeric argument binding.

Mix:
- possession
- nested attribution
- flexible word order
- money
- ages
- percentages
- years that look like counts
- counts that look like years
- durations
- measurements
- contrastive negation
- genuine ambiguity

For each case output:
CASE_ID
TEXT
EXPECTED_ACTOR
EXPECTED_NUMERIC_BINDINGS
EXPECTED_SOURCE_CHAIN
EXPECTED_UNRESOLVED
FAIL_CONDITION

Do not reuse exact fixture sentences from the supplied context.
`
);

const implementer = new Agent({
  name: "UTOM Binder Implementer",
  model: MODEL,
  modelSettings: {
    reasoning: { effort: "high" },
    text: { verbosity: "medium" },
    maxTokens: 100000,
    truncation: "auto", parallelToolCalls: false,
  },
  tools: [
    listResearchFilesTool,
    readFileTool,
    writeFileTool,
    runTestsTool,
  ],
  instructions: `
You are the implementation engineer for the UTOM V2.2
semantic research system.

You have controlled local tools.

You MUST use the tools rather than pretending files were changed.

Workflow:


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


0. FIRST call list_research_files. Never guess filenames that were not returned by that tool.
1. Read the exact relevant research implementation.
2. Read relevant targeted tests.
3. Understand the existing representation.
4. Make the SMALLEST coherent research-only implementation
   change that addresses the blocker.
5. Add targeted regressions.
6. Preserve contrast and attribution behavior.
7. Run targeted V2.2 tests.
8. If tests fail, inspect and repair.
9. Stop when the targeted research state is coherent.

Never access or modify production application code.

Do not solve this by hardcoding complete fixture sentences.
Do not weaken assertions merely to make tests pass.
Do not convert ambiguous cases into false certainty.

At the end report:

IMPLEMENTATION_SUMMARY
FILES_CHANGED
NEW_RULES
EVIDENCE_MODEL
REGRESSIONS_ADDED
TARGETED_TEST_RESULT
KNOWN_LIMITATIONS
WRONG_RESOLVED_RISKS
`
});

const judge = specialist(
  "UTOM Independent Semantic Judge",
  `
You are the independent acceptance judge.

You did not implement the patch.

Evaluate:
- mission
- research reports
- implementation report
- actual changed source
- actual targeted test output
- held-out adversarial cases

Be skeptical.

Tests passing is necessary but not sufficient.

Reject overfitted solutions and unsupported semantic certainty.


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


Return EXACTLY one leading verdict line:

VERDICT: ACCEPT

or

VERDICT: NEEDS_ANOTHER_ROUND

or

VERDICT: REJECT

Then provide:

ACTOR_BINDING: PASS/PARTIAL/FAIL
NUMERIC_BINDING: PASS/PARTIAL/FAIL
CONTRAST_PRESERVATION: PASS/PARTIAL/FAIL
ATTRIBUTION_PRESERVATION: PASS/PARTIAL/FAIL
EVIDENCE_CONTRACT: PASS/PARTIAL/FAIL
WRONG_RESOLVED_RISK: LOW/MEDIUM/HIGH
BLIND_CASE_ASSESSMENT:
REQUIRED_REPAIR:
RATIONALE:

Do not reward aggressive resolution.
Unresolved is preferable to invented certainty.
`,
  "high"
);

console.log("\n==============================================");
console.log(" UTOM BRAIN AUTONOMOUS RESEARCH NETWORK");
console.log("==============================================");
console.log("MODEL:", MODEL);
console.log("MAX ROUNDS:", MAX_ROUNDS);
console.log("RUN:", RUN_DIR);
console.log("");

console.log("[1] Research context betoltese...");
const researchContext = await buildResearchContext();

await save("00-mission.md", MISSION);
await save("01-context-snapshot.txt", researchContext);

console.log(
  `[OK] Research context: ${researchContext.length} karakter`
);

console.log("\n[2] Baseline targeted tesztek...");
const baseline = await runTargetedTestsInternal();

console.log(
  baseline.ok
    ? "[OK] Baseline targeted tests PASS"
    : "[WARN] Baseline targeted tests nem teljesen PASS"
);

await save(
  "02-baseline-tests.txt",
  JSON.stringify(baseline, null, 2)
);

const researchInput = `
${MISSION}

CURRENT RESEARCH SNAPSHOT
=========================
${researchContext}
`;


console.log(
  "\n[3] REPAIR-ONLY MODE: 5-agent research council kihagyva."
);

const reports = `
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
`;

await save(
  "03-research-reports.md",
  reports
);

console.log(
  "[OK] Frozen prior research/Judge findings betoltve."
);

let previousJudge = "Nincs elozo Judge feedback.";
let finalVerdict = "";
let accepted = false;

for (let round = 1; round <= MAX_ROUNDS; round++) {
  await resetRoundTracking();
  console.log(
    `\n================ ROUND ${round}/${MAX_ROUNDS} ================`
  );

  console.log("[4] Titkos blind benchmark generalasa...");

  const blind = await run(
    blindDesigner,
    `
${MISSION}

ROUND: ${round}
RUN_ID: ${stamp}

Create fresh held-out cases.

REFERENCE CONTEXT:
${researchContext}
`,
    { maxTurns: 1 }
  );

  await save(
    `round-${round}-blind-benchmark.md`,
    blind.finalOutput
  );

  console.log(
    "[OK] Blind benchmark kesz. Implementer NEM kapta meg."
  );

  console.log("[5] Binder Implementer dolgozik...");

  let implementation;
  try {
    implementation = await run(
    implementer,
    `
${MISSION}

RESEARCH COUNCIL REPORTS
========================
${reports}

BASELINE TARGETED TESTS
=======================
${baseline.output}

PREVIOUS JUDGE FEEDBACK
=======================
${previousJudge}

ROUND
=====
${round}

Start by reading the exact current research files with tools.

Implement a dependency-backed actor and numeric binding improvement.

You are REQUIRED to:
- inspect current binder code
- inspect relevant existing tests
- add/strengthen regression tests
- make actual research-only file changes if justified
- run targeted tests using the provided tool
- repair failures before finishing when possible

The held-out blind benchmark is intentionally unavailable to you.
`,
    { maxTurns: 50 }
    );
  } catch (error) {
    const message =
      error?.message ||
      error?.name ||
      String(error);

    console.log(
      "[ROLLBACK] Implementer megszakadt: " +
        message
    );

    await archiveChangedFiles(
      "round-" + round + "-failed-implementer"
    );

    await save(
      "round-" + round + "-implementer-error.txt",
      message
    );

    await rollbackRound();

    const recoveryTests =
      await runTargetedTestsInternal();

    await save(
      "round-" + round + "-rollback-tests.txt",
      JSON.stringify(
        recoveryTests,
        null,
        2
      )
    );

    console.log(
      recoveryTests.ok
        ? "[OK] Rollback utan targeted baseline PASS"
        : "[CRITICAL] Rollback utan targeted baseline FAIL"
    );

    previousJudge =
      "Implementer execution failed and was rolled back safely: " +
      message;

    finalVerdict =
      "VERDICT: NEEDS_ANOTHER_ROUND\n" +
      "Implementer execution failed; partial changes were rolled back.";

    if (
      round < MAX_ROUNDS &&
      recoveryTests.ok
    ) {
      continue;
    }

    break;
  }

  await save(
    `round-${round}-implementer.md`,
    implementation.finalOutput
  );

  console.log("[OK] Implementer kor befejezve.");

  console.log("[6] Fuggetlen targeted teszt...");

  const postTests = await runTargetedTestsInternal();

  await save(
    `round-${round}-tests.txt`,
    JSON.stringify(postTests, null, 2)
  );

  console.log(
    postTests.ok
      ? "[OK] TARGETED TESTS PASS"
      : "[FAIL] TARGETED TESTS FAIL"
  );

  if (!postTests.ok) {
    await archiveChangedFiles(
      "round-" + round + "-failed-tests"
    );

    await rollbackRound();

    const rollbackTests =
      await runTargetedTestsInternal();

    await save(
      "round-" + round + "-rollback-after-test-failure.txt",
      JSON.stringify(
        rollbackTests,
        null,
        2
      )
    );

    previousJudge =
      "The implementation caused targeted test failures. " +
      "The patch was archived and rolled back. " +
      "Study the failed test output and attempt a smaller, evidence-backed change.";

    finalVerdict =
      "VERDICT: NEEDS_ANOTHER_ROUND\n" +
      "Targeted tests failed; patch rolled back.";

    console.log(
      rollbackTests.ok
        ? "[OK] Failed patch rollback -> baseline PASS"
        : "[CRITICAL] Rollback baseline is not PASS"
    );

    if (
      round < MAX_ROUNDS &&
      rollbackTests.ok
    ) {
      continue;
    }

    break;
  }

  let changedContext = "";

  for (const file of [...changedFiles]) {
    try {
      changedContext +=
        `\n\n================ CHANGED FILE: ${file} ================\n` +
        (await readSafe(file, 50000));
    } catch {}
  }

  changedContext = changedContext.slice(0, 150000);

  console.log("[7] Independent Judge ertekel...");

  const judgeResult = await run(
    judge,
    `
${MISSION}

ROUND
=====
${round}

RESEARCH COUNCIL
================
${reports}

IMPLEMENTER REPORT
==================
${implementation.finalOutput}

ACTUAL CHANGED FILES
====================
${[...changedFiles].join("\n") || "NONE"}

CURRENT CHANGED SOURCE
======================
${changedContext || "NO CHANGED SOURCE"}

ACTUAL TARGETED TEST RESULT
===========================
PASS=${postTests.ok}

${postTests.output}

HELD-OUT BLIND BENCHMARK
========================
${blind.finalOutput}

Judge the implementation against the mission and held-out cases.
`,
    { maxTurns: 1 }
  );


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
  }

  await save(
    `round-${round}-judge.md`,
    finalVerdict
  );

  console.log("\n--------------- JUDGE ---------------");
  console.log(finalVerdict);
  console.log("-------------------------------------");

  if (
    /^VERDICT:\s*ACCEPT/im.test(finalVerdict) &&
    postTests.ok
  ) {
    accepted = true;
    console.log(
      `\n[ACCEPTED] UTOM Brain research round ${round}.`
    );
    break;
  }

  if (/^VERDICT:\s*REJECT/im.test(finalVerdict)) {
    console.log(
      "\n[REJECTED] Judge szerint ezt nem szabad tovabb automatikusan eroltetni."
    );
    break;
  }

  previousJudge = finalVerdict;

  if (round < MAX_ROUNDS) {
    console.log(
      "\n[REPAIR] Judge javitast kert. Kovetkezo autonom kor indul."
    );
  }
}


if (!accepted && runBackedUpFiles.size > 0) {
  console.log(
    "[RUN ROLLBACK] Final verdict not accepted; archiving and restoring run-start checkpoint."
  );

  await archiveRejectedRunState();
  await rollbackRunStart();

  changedFiles.clear();
  backedUpFiles.clear();
}

const finalTests = await runTargetedTestsInternal();

const finalReport = `
# UTOM Brain Agent Network Run

Run: ${stamp}

Model: ${MODEL}

Rounds allowed: ${MAX_ROUNDS}

Accepted: ${accepted}

Changed files:

${[...changedFiles].map((x) => `- ${x}`).join("\n") || "- none"}

Final targeted tests:

${finalTests.ok ? "PASS" : "FAIL"}

Final Judge:

${finalVerdict}
`;

await save("FINAL.md", finalReport);

console.log("\n==============================================");
console.log(" UTOM AGENT NETWORK COMPLETE");
console.log("==============================================");
console.log("ACCEPTED:", accepted ? "YES" : "NO");
console.log(
  "TARGETED TESTS:",
  finalTests.ok ? "PASS" : "FAIL"
);
console.log("CHANGED FILES:");

for (const file of changedFiles) {
  console.log(" -", file);
}

console.log("\nREPORT:");
console.log(path.join(RUN_DIR, "FINAL.md"));

console.log(
  "\nNincs commit, push, deploy, production build vagy full suite futtatva."
);




