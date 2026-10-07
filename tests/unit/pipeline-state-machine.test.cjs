"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { REQUIRED_STEPS, createMysqlPipelineStore, createPipelineCoordinator } = require("../../pipeline/state-machine");

function memoryStore(clock) {
  const articles = new Map([[1, { status: "pending", heartbeat: null, claimToken: null, workerId: null }]]);
  const steps = new Map();
  const key = (articleId, stepName) => `${articleId}:${stepName}`;
  return {
    articles,
    steps,
    async quarantineStaleUncertain({ articleId, staleMs }) {
      const article = articles.get(articleId);
      const uncertain = [...steps.values()].some((step) => step.status === "uncertain");
      if (article?.status === "in_progress" && uncertain && clock() - article.heartbeat > staleMs) article.status = "needs_recovery";
    },
    async claimArticle({ articleId, workerId, claimToken, staleMs, maxArticleAttempts }) {
      const article = articles.get(articleId);
      if (!article) return false;
      const stale = article.status === "in_progress" && clock() - article.heartbeat > staleMs;
      const retryable = article.status === "failed" && clock() - article.heartbeat > staleMs && (article.attempts || 0) < maxArticleAttempts;
      if (article.status !== "pending" && !stale && !retryable) return false;
      Object.assign(article, { status: "in_progress", workerId, claimToken, heartbeat: clock() });
      article.attempts = (article.attempts || 0) + 1;
      return true;
    },
    async heartbeatArticle(claim) {
      const article = articles.get(claim.articleId);
      if (!article || article.claimToken !== claim.claimToken || article.workerId !== claim.workerId || article.status !== "in_progress") return false;
      article.heartbeat = clock();
      return true;
    },
    async claimStep({ articleId, stepName, workerId, claimToken, staleMs }) {
      const article = articles.get(articleId);
      if (!article || article.status !== "in_progress" || article.workerId !== workerId || article.claimToken !== claimToken) {
        return { claimed: false, status: "claim_lost", result_json: null };
      }
      const stepKey = key(articleId, stepName);
      const step = steps.get(stepKey) || { status: "pending", result_json: null, heartbeat: null };
      steps.set(stepKey, step);
      if (["done", "skipped"].includes(step.status)) return { claimed: false, ...step };
      const stale = step.status === "in_progress" && clock() - step.heartbeat > staleMs;
      if (step.status === "in_progress" && !stale) return { claimed: false, ...step };
      Object.assign(step, { status: "in_progress", workerId, claimToken, heartbeat: clock() });
      return { claimed: true, ...step };
    },
    async beginExternalStep({ articleId, stepName, workerId, claimToken, operationKey }) {
      const article = articles.get(articleId);
      const step = steps.get(key(articleId, stepName));
      if (!article || article.workerId !== workerId || article.claimToken !== claimToken || step?.claimToken !== claimToken) throw new Error("step_claim_lost");
      Object.assign(step, { status: "uncertain", operationKey, external: true });
    },
    async completeStep({ articleId, stepName, workerId, claimToken, status, result }) {
      const article = articles.get(articleId);
      const step = steps.get(key(articleId, stepName));
      if (!article || article.status !== "in_progress" || article.workerId !== workerId || article.claimToken !== claimToken || !step || step.workerId !== workerId || step.claimToken !== claimToken) throw new Error("step_claim_lost");
      Object.assign(step, { status, result_json: JSON.stringify(result) });
    },
    async failStep({ articleId, stepName, workerId, claimToken, error }) {
      const article = articles.get(articleId);
      if (article.workerId !== workerId || article.claimToken !== claimToken) throw new Error("step_claim_lost");
      Object.assign(steps.get(key(articleId, stepName)), { status: "failed", error });
    },
    async failArticle({ articleId, stepName, workerId, claimToken, error }) {
      const article = articles.get(articleId);
      if (article.workerId !== workerId || article.claimToken !== claimToken) throw new Error("article_claim_lost");
      Object.assign(article, { status: "failed", failedStep: stepName, error });
    },
    async markExternalUncertain({ articleId, stepName, workerId, claimToken, error }) {
      const article = articles.get(articleId);
      if (article.workerId !== workerId || article.claimToken !== claimToken) throw new Error("article_claim_lost");
      Object.assign(steps.get(key(articleId, stepName)), { status: "uncertain", error });
      Object.assign(article, { status: "needs_recovery", failedStep: stepName, error });
    },
    async getStepStates(articleId) { return [...steps.entries()].filter(([entry]) => entry.startsWith(`${articleId}:`)).map(([entry, value]) => ({ step_name: entry.split(":")[1], status: value.status })); },
    async completeArticle({ articleId, workerId, claimToken }) {
      const article = articles.get(articleId);
      if (article.status !== "in_progress" || article.workerId !== workerId || article.claimToken !== claimToken) throw new Error("article_claim_lost");
      article.status = "done";
      return true;
    },
  };
}

test("completeArticle publishes the completed article and clears its claim state", async () => {
  const calls = [];
  const pool = {
    async execute(sql, params) {
      calls.push({ sql: sql.replace(/\s+/g, " ").trim(), params });
      return [{ affectedRows: 1 }, []];
    },
  };
  const store = createMysqlPipelineStore(pool);

  await store.completeArticle({ articleId: 41, workerId: "worker-a", claimToken: "claim-a" });

  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /SET status='done', processed=1, worker_id=NULL, claim_token=NULL, heartbeat_at=NULL, failed_step=NULL, last_processing_error=NULL/);
  assert.deepEqual(calls[0].params, [41, "worker-a", "claim-a"]);
});

test("two workers competing for one article produce exactly one winner", async () => {
  let time = new Date("2026-09-27T12:00:00Z");
  const store = memoryStore(() => time);
  const a = createPipelineCoordinator(store, { workerId: "a", now: () => time });
  const b = createPipelineCoordinator(store, { workerId: "b", now: () => time });
  const [claimA, claimB] = await Promise.all([a.claimArticle(1), b.claimArticle(1)]);
  assert.equal([claimA, claimB].filter(Boolean).length, 1);
});

test("active claim cannot be stolen, stale claim can be recovered", async () => {
  let time = new Date("2026-09-27T12:00:00Z");
  const store = memoryStore(() => time);
  const a = createPipelineCoordinator(store, { workerId: "a", now: () => time, staleMs: 60_000 });
  const b = createPipelineCoordinator(store, { workerId: "b", now: () => time, staleMs: 60_000 });
  assert.ok(await a.claimArticle(1));
  assert.equal(await b.claimArticle(1), null);
  time = new Date(time.getTime() + 60_001);
  assert.ok(await b.claimArticle(1));
});

test("done step is reused and a later failure preserves its result", async () => {
  const time = new Date("2026-09-27T12:00:00Z");
  const store = memoryStore(() => time);
  const machine = createPipelineCoordinator(store, { workerId: "a", now: () => time });
  const claim = await machine.claimArticle(1);
  let paidCalls = 0;
  await machine.runStep(claim, "short_summary", async () => ({ summary: `paid-${++paidCalls}` }));
  await assert.rejects(machine.runStep(claim, "long_summary", async () => { throw new Error("later failure"); }));
  store.articles.get(1).heartbeat = new Date(time.getTime() - 15 * 60_000 - 1);
  const nextClaim = await machine.claimArticle(1);
  const reused = await machine.runStep(nextClaim, "short_summary", async () => ({ summary: `paid-${++paidCalls}` }));
  assert.equal(reused.reused, true);
  assert.equal(reused.result.summary, "paid-1");
  assert.equal(paidCalls, 1);
});

test("invalid or incomplete article cannot be marked done", async () => {
  const time = new Date("2026-09-27T12:00:00Z");
  const store = memoryStore(() => time);
  const machine = createPipelineCoordinator(store, { workerId: "a", now: () => time });
  const claim = await machine.claimArticle(1);
  await machine.runStep(claim, "scrape", async () => ({ skipped: true }), { optional: true });
  await assert.rejects(machine.finishArticle(claim), /required_steps_incomplete/);
  assert.notEqual(store.articles.get(1).status, "done");
});

test("optional step failure is recorded as skipped without failing the article", async () => {
  const time = new Date("2026-09-27T12:00:00Z");
  const store = memoryStore(() => time);
  const machine = createPipelineCoordinator(store, { workerId: "a", now: () => time });
  const claim = await machine.claimArticle(1);
  const result = await machine.runStep(
    claim,
    "sentiment",
    async () => { throw new Error("provider unavailable"); },
    { optional: true },
  );
  assert.equal(result.status, "skipped");
  assert.equal(store.steps.get("1:sentiment").status, "skipped");
  assert.equal(store.articles.get(1).status, "in_progress");
});

test("zombie worker is fenced from heartbeat, step update, and final commit", async () => {
  let time = new Date("2026-09-27T12:00:00Z");
  const store = memoryStore(() => time);
  const a = createPipelineCoordinator(store, { workerId: "a", now: () => time, staleMs: 60_000 });
  const b = createPipelineCoordinator(store, { workerId: "b", now: () => time, staleMs: 60_000 });
  const oldClaim = await a.claimArticle(1);
  await a.runStep(oldClaim, "scrape", async () => ({ ok: true }));
  time = new Date(time.getTime() + 60_001);
  const newClaim = await b.claimArticle(1);
  assert.ok(newClaim);
  await assert.rejects(a.heartbeat(oldClaim), /article_claim_lost/);
  await assert.rejects(store.completeStep({ ...oldClaim, stepName: "scrape", status: "done", result: {} }), /step_claim_lost/);
  await assert.rejects(store.completeArticle(oldClaim), /article_claim_lost/);
});

test("external operation failure becomes uncertain and cannot be reclaimed automatically", async () => {
  let time = new Date("2026-09-27T12:00:00Z");
  const store = memoryStore(() => time);
  const a = createPipelineCoordinator(store, { workerId: "a", now: () => time, staleMs: 60_000 });
  const b = createPipelineCoordinator(store, { workerId: "b", now: () => time, staleMs: 60_000 });
  const claim = await a.claimArticle(1);
  await assert.rejects(
    a.runStep(claim, "short_summary", async () => { throw new Error("crash after provider acceptance"); }, { external: true, operationKey: "op-1" }),
    /external_operation_uncertain/,
  );
  assert.equal(store.steps.get("1:short_summary").status, "uncertain");
  assert.equal(store.articles.get(1).status, "needs_recovery");
  time = new Date(time.getTime() + 60_001);
  assert.equal(await b.claimArticle(1), null);
});

test("uncertain required step prevents article completion", async () => {
  const time = new Date("2026-09-27T12:00:00Z");
  const store = memoryStore(() => time);
  const machine = createPipelineCoordinator(store, { workerId: "a", now: () => time });
  const claim = await machine.claimArticle(1);
  store.steps.set("1:embedding", { status: "uncertain" });
  await assert.rejects(machine.finishArticle(claim), /required_steps_incomplete:.*embedding/);
});

for (const blockedStatus of ["pending", "in_progress", "failed", "uncertain"]) {
  test(`${blockedStatus} required step prevents article done`, async () => {
    const time = new Date("2026-09-27T12:00:00Z");
    const store = memoryStore(() => time);
    const machine = createPipelineCoordinator(store, { workerId: "a", now: () => time });
    const claim = await machine.claimArticle(1);
    for (const step of REQUIRED_STEPS) store.steps.set(`1:${step}`, { status: "done" });
    store.steps.set("1:cluster", { status: blockedStatus });
    await assert.rejects(machine.finishArticle(claim), /required_steps_incomplete:cluster/);
    assert.equal(store.articles.get(1).status, "in_progress");
  });
}

test("external result save failure leaves the pre-call uncertain checkpoint", async () => {
  const time = new Date("2026-09-27T12:00:00Z");
  const store = memoryStore(() => time);
  const originalComplete = store.completeStep;
  store.completeStep = async (args) => {
    if (args.stepName === "embedding") throw new Error("db connection lost");
    return originalComplete(args);
  };
  const machine = createPipelineCoordinator(store, { workerId: "a", now: () => time });
  const claim = await machine.claimArticle(1);
  await assert.rejects(
    machine.runStep(claim, "embedding", async () => ({ vectorLength: 1536 }), { external: true, operationKey: "embedding-op" }),
    /external_operation_uncertain/,
  );
  assert.equal(store.steps.get("1:embedding").status, "uncertain");
  assert.equal(store.articles.get(1).status, "needs_recovery");
});

test("step result and done state are committed by one atomic store mutation", async () => {
  const time = new Date("2026-09-27T12:00:00Z");
  const store = memoryStore(() => time);
  const machine = createPipelineCoordinator(store, { workerId: "a", now: () => time });
  const claim = await machine.claimArticle(1);
  await machine.runStep(claim, "scrape", async () => ({ contentLength: 900 }));
  const step = store.steps.get("1:scrape");
  assert.equal(step.status, "done");
  assert.deepEqual(JSON.parse(step.result_json), { contentLength: 900 });
});

test("article becomes done only when every required step is done", async () => {
  const time = new Date("2026-09-27T12:00:00Z");
  const store = memoryStore(() => time);
  const machine = createPipelineCoordinator(store, { workerId: "a", now: () => time });
  const claim = await machine.claimArticle(1);
  for (const step of REQUIRED_STEPS) await machine.runStep(claim, step, async () => ({ step }));
  await machine.runStep(claim, "sentiment", async () => ({ sentiment: 0 }), { optional: true });
  await machine.finishArticle(claim);
  assert.equal(store.articles.get(1).status, "done");
});
