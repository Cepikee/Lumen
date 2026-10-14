import fs from "node:fs";

const file = "scripts/agents/utom-brain-autoresearch.mjs";
let s = fs.readFileSync(file, "utf8");

const backup =
  file +
  ".before-hardening-" +
  new Date().toISOString().replace(/[:.]/g, "-") +
  ".bak";

fs.copyFileSync(file, backup);

function requireText(text, label) {
  if (!s.includes(text)) {
    throw new Error("PATCH TARGET NOT FOUND: " + label);
  }
}

/* ---------------------------------------------------------
   1. HARDEN writeSafe + add transactional rollback helpers
--------------------------------------------------------- */

const writeStart = s.indexOf(
  "async function writeSafe(file, content) {"
);

const writeEnd = s.indexOf(
  "async function runTargetedTestsInternal() {"
);

if (writeStart < 0 || writeEnd < 0 || writeEnd <= writeStart) {
  throw new Error("writeSafe block not found");
}

const hardenedWrite = String.raw`
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

`;

s =
  s.slice(0, writeStart) +
  hardenedWrite +
  s.slice(writeEnd);

/* ---------------------------------------------------------
   2. Add file discovery tool so agent stops guessing names
--------------------------------------------------------- */

const walkMarker =
  "async function walk(dir, out = []) {";

requireText(walkMarker, "walk marker");

const listTool = String.raw`
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

`;

s = s.replace(
  walkMarker,
  listTool + walkMarker
);

/* ---------------------------------------------------------
   3. Give Implementer the discovery tool
--------------------------------------------------------- */

const toolsOld = String.raw`  tools: [
    readFileTool,
    writeFileTool,
    runTestsTool,
  ],`;

const toolsNew = String.raw`  tools: [
    listResearchFilesTool,
    readFileTool,
    writeFileTool,
    runTestsTool,
  ],`;

requireText(toolsOld, "implementer tools");

s = s.replace(
  toolsOld,
  toolsNew
);

/* ---------------------------------------------------------
   4. Tell agent not to guess filenames
--------------------------------------------------------- */

const workflowOld =
  "Workflow:\n\n1. Read the exact relevant research implementation.";

const workflowNew =
  "Workflow:\n\n0. FIRST call list_research_files. Never guess filenames that were not returned by that tool.\n1. Read the exact relevant research implementation.";

requireText(
  workflowOld,
  "implementer workflow"
);

s = s.replace(
  workflowOld,
  workflowNew
);

/* ---------------------------------------------------------
   5. Per-round transaction begins before Implementer
--------------------------------------------------------- */

const loopOld =
  "for (let round = 1; round <= MAX_ROUNDS; round++) {\n  console.log(";

const loopNew =
  "for (let round = 1; round <= MAX_ROUNDS; round++) {\n  await resetRoundTracking();\n  console.log(";

requireText(
  loopOld,
  "round loop"
);

s = s.replace(
  loopOld,
  loopNew
);

/* ---------------------------------------------------------
   6. Implementer: 12 -> 30 turns + rollback on exception
--------------------------------------------------------- */

const implStart =
  "  const implementation = await run(\n";

requireText(
  implStart,
  "implementer run start"
);

s = s.replace(
  implStart,
  "  let implementation;\n  try {\n    implementation = await run(\n"
);

const implEnd = String.raw`    { maxTurns: 12 }
  );

  await save(`;

const implEndNew = String.raw`    { maxTurns: 30 }
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

  await save(`;

requireText(
  implEnd,
  "implementer run end"
);

s = s.replace(
  implEnd,
  implEndNew
);

/* ---------------------------------------------------------
   7. External targeted test failure => archive + rollback
--------------------------------------------------------- */

const testsMarker = String.raw`  console.log(
    postTests.ok
      ? "[OK] TARGETED TESTS PASS"
      : "[FAIL] TARGETED TESTS FAIL"
  );

  let changedContext = "";`;

const testsReplacement = String.raw`  console.log(
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

  let changedContext = "";`;

requireText(
  testsMarker,
  "post-test marker"
);

s = s.replace(
  testsMarker,
  testsReplacement
);

/* ---------------------------------------------------------
   WRITE PATCHED RUNNER
--------------------------------------------------------- */

fs.writeFileSync(
  file,
  s,
  "utf8"
);

console.log("HARDENING PATCH OK");
console.log("Backup:", backup);
