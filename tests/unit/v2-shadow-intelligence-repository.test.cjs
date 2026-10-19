"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createShadowIntelligenceRepository, inputFingerprint, SHADOW_STEP } = require("../../lib/v2/shadow-intelligence-repository");

function fixtureArticle(overrides = {}) {
  return { id: 5, contentHash: "hash", urlCanonical: "https://example.test/5", updatedAt: "2026-10-18T10:00:00.000Z", ...overrides };
}

test("shadow fingerprint is stable and changes with canonical article input", () => {
  const first = inputFingerprint(fixtureArticle());
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(inputFingerprint(fixtureArticle()), first);
  assert.notEqual(inputFingerprint(fixtureArticle({ contentHash: "changed" })), first);
  assert.equal(SHADOW_STEP, "v2.shadow_intelligence");
});

test("completed shadow claim is reused without mutation", async () => {
  const calls = [];
  const pool = {
    async execute(sql, params) {
      calls.push({ sql, params });
      if (/INSERT IGNORE INTO v2_processing_steps/.test(sql)) return [{ affectedRows: 0 }];
      if (/SELECT status,output_ref/.test(sql)) return [[{ status: "completed", outputRef: "existing", freshHeartbeat: 0 }]];
      throw new Error("unexpected_sql");
    },
    async getConnection() { throw new Error("not_used"); },
  };
  const result = await createShadowIntelligenceRepository(pool).claim(fixtureArticle());
  assert.deepEqual(result.status, "completed");
  assert.equal(result.outputRef, "existing");
  assert.equal(calls.length, 2);
  assert.equal(calls.some((call) => /^\s*UPDATE/.test(call.sql)), false);
});

test("shadow completion and failure updates are fenced by fingerprint and claim token", async () => {
  const calls = [];
  const pool = {
    async execute(sql, params) { calls.push({ sql, params }); return [{ affectedRows: 1 }]; },
    async getConnection() { throw new Error("not_used"); },
  };
  const repository = createShadowIntelligenceRepository(pool);
  await repository.complete({ articleId: 5, fingerprint: "a".repeat(64), claimToken: "claim", outputRef: "result" });
  await repository.fail({ articleId: 5, fingerprint: "a".repeat(64), claimToken: "claim", error: new Error("safe") });
  assert.match(calls[0].sql, /status='processing' AND claim_token=\?/);
  assert.match(calls[1].sql, /status='processing' AND claim_token=\?/);
  assert.equal(calls[0].params.at(-1), "claim");
  assert.equal(calls[1].params.at(-1), "claim");
});
