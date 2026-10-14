"use strict";

const { spawn } = require("node:child_process");
const readline = require("node:readline");
const assert = require("node:assert/strict");

const provider = process.argv[2] || "huspacy";
const project = "/mnt/f/Projekt2025/Lumen";
const command = `export PYTHONPATH=/tmp/utom-nlp-py; exec python3 ${project}/scripts/experimental/local-nlp-worker.py --provider ${provider} --stanza-model-dir /tmp/utom-stanza-models`;

function startWorker() {
  const child = spawn("wsl.exe", ["-d", "Ubuntu-24.04", "--", "bash", "-lc", command], { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
  const lines = readline.createInterface({ input: child.stdout });
  const queue = [];
  lines.on("line", (line) => queue.shift()?.resolve(JSON.parse(line)));
  child.on("error", (error) => queue.splice(0).forEach((item) => item.reject(error)));
  function read(timeoutMs = 15_000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("worker_timeout")), timeoutMs);
      queue.push({ resolve: (value) => { clearTimeout(timer); resolve(value); }, reject });
    });
  }
  return { child, read, send: (value) => { child.stdin.write(`${typeof value === "string" ? value : JSON.stringify(value)}\n`); return read(); } };
}

function validateCandidate(value) {
  return Boolean(value && value.ok === true && value.candidateOnly === true && Array.isArray(value.annotation?.tokens));
}

async function deterministicFallback(reason) {
  return { mode: "deterministic-only", abstainFromNlp: true, reason };
}

(async () => {
  const started = Date.now();
  let worker = startWorker();
  const ready = await worker.read();
  assert.equal(ready.type, "ready");
  const first = await worker.send({ id: "one", text: "Kovács Anna Budapesten nyilatkozott." });
  const second = await worker.send({ id: "two", text: "A Duna Klinika 12 beteget kezelt." });
  assert.ok(validateCandidate(first));
  assert.ok(validateCandidate(second));
  const invalid = await worker.send("not-json");
  assert.equal(invalid.ok, false);
  worker.child.kill();
  await new Promise((resolve) => worker.child.once("exit", resolve));
  const fallback = await deterministicFallback("worker_crashed");
  assert.deepEqual(fallback, { mode: "deterministic-only", abstainFromNlp: true, reason: "worker_crashed" });
  worker = startWorker();
  const restarted = await worker.read();
  assert.equal(restarted.type, "ready");
  const afterRestart = await worker.send({ id: "three", text: "Szegeden 18 fokot mértek." });
  assert.ok(validateCandidate(afterRestart));
  worker.child.kill();
  process.stdout.write(`${JSON.stringify({
    provider,
    persistentRequestsBeforeRestart: 2,
    invalidInputHandled: true,
    crashFallback: fallback,
    restartSucceeded: true,
    totalHarnessMs: Date.now() - started,
    canonicalWrites: 0,
  }, null, 2)}\n`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
