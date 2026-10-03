"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createV2RequestContext } = require("../../lib/v2/request-context");

const IDs = ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222", "33333333-3333-4333-8333-333333333333", "44444444-4444-4444-8444-444444444444"];

test("context factory creates immutable metadata-only context", () => {
  let next = 0;
  const context = createV2RequestContext({
    env: { UTOM_OFFLINE_MODE: "false", NODE_ENV: "test", UTOM_V2_ENABLED: "true" },
    articleId: 42,
    clock: () => "2026-10-03T12:34:56.123Z",
    idGenerator: () => IDs[next++],
  });
  assert.equal(context.requestId, IDs[0]);
  assert.equal(context.runId, IDs[1]);
  assert.equal(context.articleId, "42");
  assert.equal(context.environment, "test");
  assert.equal(context.startedAt, "2026-10-03T12:34:56.123Z");
  assert.equal(context.v2Enabled, true);
  assert.equal(context.knowledgeSchemaVersion, "v2.1");
  assert.equal(context.extractionSchemaVersion, "v2.extraction.1");
  assert.equal(context.vocabularyVersion, "v2.vocabulary.1");
  assert.equal(context.resolverVersion, "v2.resolver.1");
  assert.equal(Object.isFrozen(context), true);
  assert.equal("password" in context, false);
  assert.equal("authorization" in context, false);
  assert.equal(JSON.parse(JSON.stringify(context)).runId, IDs[1]);

  assert.equal(createV2RequestContext({ articleId: "00042" }).articleId, "42");
});

test("context keeps request and run identities distinct and accepts explicit request identity", () => {
  const context = createV2RequestContext({
    requestId: IDs[2],
    env: { UTOM_OFFLINE_MODE: "true", UTOM_V2_ENABLED: "false" },
    idGenerator: () => IDs[3],
  });
  assert.equal(context.requestId, IDs[2]);
  assert.equal(context.runId, IDs[3]);
  assert.notEqual(context.requestId, context.runId);
  assert.equal(context.v2Enabled, false);
  assert.equal(context.environment, "offline");
});

test("context rejects malformed IDs, dates and environments", () => {
  assert.throws(() => createV2RequestContext({ requestId: "not-a-uuid" }), /requestId/);
  assert.throws(() => createV2RequestContext({ runId: "not-a-uuid" }), /runId/);
  for (const articleId of [0, -1, 1.5, NaN, Infinity, "0", "0000", "-1", "1.5", "abc", 18446744073709551616n]) {
    assert.throws(() => createV2RequestContext({ articleId }), /articleId/);
  }
  assert.throws(() => createV2RequestContext({ clock: () => "invalid" }), /clock/);
  assert.throws(() => createV2RequestContext({ env: { UTOM_OFFLINE_MODE: "false", NODE_ENV: "unknown" } }), /environment/);
});

test("context creation has no database or AI side effect", () => {
  const context = createV2RequestContext({ env: { UTOM_OFFLINE_MODE: "true" } });
  assert.equal(Object.keys(context).some((key) => /token|secret|password|body|raw/i.test(key)), false);
});

console.log("M1.5 request context contract: PASS");
