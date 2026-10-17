"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { runContinuous } = require("../../pipeline/image-worker");

function config(overrides = {}) {
  return {
    enabled: true, provider: "cloudflare", accountId: "test", apiToken: "test", model: "test-model",
    concurrency: 1, workerIdleMs: 5, staleMs: 60_000, maxRetries: 2,
    circuitFailures: 3, circuitCooldownMs: 300_000,
    minArticleId: 0, backfillExisting: false,
    ...overrides,
  };
}

function queueRepository(ids = []) {
  const queue = [...ids];
  const claims = [];
  const heartbeats = [];
  return {
    queue,
    claims,
    heartbeats,
    async enqueueCompleted() { return 0; },
    async claim({ workerId, claimToken }) {
      const articleId = queue.shift();
      if (articleId == null) return null;
      if (claims.some((claim) => claim.articleId === articleId)) throw new Error("duplicate_claim");
      const claim = { articleId, workerId, claimToken };
      claims.push(claim);
      return claim;
    },
    async heartbeat(claim) { heartbeats.push(claim.articleId); },
  };
}

function harness({ ids = [], configOverrides = {}, process, wait } = {}) {
  const signalEmitter = new EventEmitter();
  const repository = queueRepository(ids);
  const events = [];
  return {
    signalEmitter,
    repository,
    events,
    dependencies: {
      config: config(configOverrides), pool: {}, repository, signalEmitter,
      service: { process: process || (async () => ({ status: "ready" })) },
      logger: (entry) => events.push(entry),
      wait: wait || (async () => signalEmitter.emit("SIGTERM")),
      workerId: "continuous-test-worker",
    },
  };
}

test("continuous worker drains a 20-job backlog without idle gaps and then stops cleanly", async () => {
  const processed = [];
  let idleCalls = 0;
  const h = harness({
    ids: Array.from({ length: 20 }, (_, index) => index + 1),
    process: async (claim) => { processed.push(claim.articleId); return { status: "ready" }; },
    wait: async () => { idleCalls += 1; h.signalEmitter.emit("SIGTERM"); },
  });
  const result = await runContinuous(h.dependencies);
  assert.deepEqual(processed, Array.from({ length: 20 }, (_, index) => index + 1));
  assert.equal(result.processed, 20);
  assert.equal(idleCalls, 1, "the worker must not sleep between pending jobs");
  assert.equal(new Set(h.repository.claims.map((claim) => claim.articleId)).size, 20);
  assert.ok(h.events.some((entry) => entry.event === "article_image_worker_started"));
  const started = h.events.find((entry) => entry.event === "article_image_worker_started");
  assert.equal(started.minArticleId, 0);
  assert.equal(started.backfillExisting, false);
  assert.ok(h.events.some((entry) => entry.event === "article_image_worker_stopped"));
});

test("an article arriving during idle is picked up on the next poll", async () => {
  const processed = [];
  let waits = 0;
  const h = harness({
    process: async (claim) => { processed.push(claim.articleId); return { status: "ready" }; },
    wait: async (ms) => {
      assert.equal(ms, 5);
      waits += 1;
      if (waits === 1) h.repository.queue.push(41);
      else h.signalEmitter.emit("SIGTERM");
    },
  });
  await runContinuous(h.dependencies);
  assert.deepEqual(processed, [41]);
  assert.equal(waits, 2);
});

test("configured concurrency is bounded and every queued article is claimed once", async () => {
  let active = 0;
  let maxActive = 0;
  const h = harness({
    ids: Array.from({ length: 20 }, (_, index) => index + 1),
    configOverrides: { concurrency: 2 },
    process: async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setImmediate(resolve));
      active -= 1;
      return { status: "ready" };
    },
  });
  const result = await runContinuous(h.dependencies);
  assert.equal(result.processed, 20);
  assert.equal(maxActive, 2);
  assert.equal(new Set(h.repository.claims.map((claim) => claim.articleId)).size, 20);
});

test("one job exception is isolated and the next pending job is processed", async () => {
  const processed = [];
  const h = harness({
    ids: [1, 2],
    process: async (claim) => {
      if (claim.articleId === 1) throw new Error("injected_job_failure");
      processed.push(claim.articleId);
      return { status: "ready" };
    },
  });
  const result = await runContinuous(h.dependencies);
  assert.deepEqual(processed, [2]);
  assert.equal(result.processed, 1);
  assert.ok(h.events.some((entry) => entry.event === "article_image_failed" && entry.articleId === 1));
});

test("SIGTERM during an active job finishes it and prevents another claim", async () => {
  const processed = [];
  const h = harness({
    ids: [1, 2],
    process: async (claim) => {
      processed.push(claim.articleId);
      h.signalEmitter.emit("SIGTERM");
      await new Promise((resolve) => setImmediate(resolve));
      return { status: "ready" };
    },
  });
  const result = await runContinuous(h.dependencies);
  assert.deepEqual(processed, [1]);
  assert.equal(h.repository.queue.length, 1);
  assert.equal(result.signal, "SIGTERM");
});

test("SIGINT interrupts idle immediately without claiming work", async () => {
  const h = harness({ wait: async (_ms, signal) => { assert.equal(signal.aborted, false); h.signalEmitter.emit("SIGINT"); } });
  const result = await runContinuous(h.dependencies);
  assert.equal(result.signal, "SIGINT");
  assert.equal(h.repository.claims.length, 0);
});

test("active generation receives lease heartbeats", async () => {
  const h = harness({
    ids: [9],
    process: async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
      h.signalEmitter.emit("SIGTERM");
      return { status: "ready" };
    },
  });
  h.dependencies.heartbeatMs = 5;
  await runContinuous(h.dependencies);
  assert.ok(h.repository.heartbeats.length >= 2);
  assert.ok(h.repository.heartbeats.every((id) => id === 9));
});

test("transient database loop failures use bounded backoff and do not kill the worker", async () => {
  const h = harness();
  let attempts = 0;
  const waits = [];
  h.repository.enqueueCompleted = async () => {
    attempts += 1;
    if (attempts < 3) throw new Error("mysql_temporarily_unavailable");
    return 0;
  };
  h.dependencies.wait = async (ms) => {
    waits.push(ms);
    if (attempts >= 3) h.signalEmitter.emit("SIGTERM");
  };
  await runContinuous(h.dependencies);
  assert.deepEqual(waits, [10, 20, 5]);
  assert.equal(h.events.filter((entry) => entry.event === "article_image_worker_loop_failed").length, 2);
});

test("disabled mode remains idle until a shutdown signal and invalid enabled config fails startup", async () => {
  const disabled = harness({ configOverrides: { enabled: false } });
  disabled.dependencies.wait = async (ms) => { assert.equal(ms, 60_000); disabled.signalEmitter.emit("SIGTERM"); };
  const report = await runContinuous(disabled.dependencies);
  assert.equal(report.reason, "disabled");

  const invalid = harness({ configOverrides: { apiToken: "" } });
  await assert.rejects(runContinuous(invalid.dependencies), /image_worker_startup_failed:missing_provider_credentials/);
  assert.equal(invalid.signalEmitter.listenerCount("SIGTERM"), 0);
  assert.equal(invalid.signalEmitter.listenerCount("SIGINT"), 0);

  const missingCutoff = harness({ configOverrides: { minArticleId: null } });
  await assert.rejects(runContinuous(missingCutoff.dependencies), /image_worker_startup_failed:image_rollout_cutoff_required/);
  assert.equal(missingCutoff.signalEmitter.listenerCount("SIGTERM"), 0);
});
