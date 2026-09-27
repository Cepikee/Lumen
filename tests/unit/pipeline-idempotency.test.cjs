"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { existingClusterId, parseValidEmbedding, speedHistoryEventKey, uniqueKeywords } = require("../../pipeline/idempotency");
const { withClusterAdvisoryLock } = require("../../pipeline/clusterArticles");
const { externalOperationKey } = require("../../pipeline/operation-identity");

test("valid stored embedding is reusable while empty or malformed data is not", () => {
  assert.deepEqual(parseValidEmbedding("[0.1,0.2]"), [0.1, 0.2]);
  assert.equal(parseValidEmbedding("[]"), null);
  assert.equal(parseValidEmbedding("not-json"), null);
  assert.equal(parseValidEmbedding([0.1, Number.NaN]), null);
});

test("existing cluster assignment is stable and reusable", () => {
  assert.equal(existingClusterId(42), 42);
  assert.equal(existingClusterId("42"), 42);
  assert.equal(existingClusterId(null), null);
  assert.equal(existingClusterId(-1), null);
});

test("speed history event identity is deterministic", () => {
  assert.equal(speedHistoryEventKey(4, "telex", 12.34), speedHistoryEventKey(4, "telex", 12.3));
  assert.notEqual(speedHistoryEventKey(4, "telex", 12.3), speedHistoryEventKey(5, "telex", 12.3));
});

test("external operation identity is deterministic and input-sensitive", () => {
  const base = { articleId: 7, stepName: "embedding", inputVersion: "abc", model: "m1" };
  assert.equal(externalOperationKey(base), externalOperationKey(base));
  assert.notEqual(externalOperationKey(base), externalOperationKey({ ...base, inputVersion: "changed" }));
});

test("trend keywords count once per article regardless of case or whitespace", () => {
  assert.deepEqual(uniqueKeywords(["Gazdaság", " gazdaság ", "Tech", "tech"]), ["Gazdaság", "Tech"]);
});

test("cluster creation is serialized across concurrent workers", async () => {
  const waiters = [];
  let held = false;
  const connection = {
    async execute(sql) {
      if (sql.includes("GET_LOCK")) {
        if (held) await new Promise((resolve) => waiters.push(resolve));
        held = true;
        return [[{ acquired: 1 }]];
      }
      if (sql.includes("RELEASE_LOCK")) {
        held = false;
        waiters.shift()?.();
        return [[{ released: 1 }]];
      }
      throw new Error("unexpected SQL");
    },
  };
  const clusters = [];
  async function assign() {
    return withClusterAdvisoryLock(connection, async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      if (clusters.length === 0) clusters.push({ id: 1 });
      return clusters[0].id;
    });
  }
  const [a, b] = await Promise.all([assign(), assign()]);
  assert.deepEqual([a, b], [1, 1]);
  assert.equal(clusters.length, 1);
});
