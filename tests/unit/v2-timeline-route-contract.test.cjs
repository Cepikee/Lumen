"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const load = require("../helpers/insights-loader.cjs");
const contract = require("../../lib/v2/read-model-contract");

test("article timeline API returns HTTP 200 with an empty collection", async () => {
  let genericReads = 0;
  const route = load("app/api/v2/timelines/[ownerType]/[ownerId]/route.ts", {
    "@/lib/db": { db: {} },
    "@/lib/v2/feature-flags": { isV2Enabled: () => true },
    "@/lib/v2/read-model-contract": contract,
    "@/lib/v2/temporal-graph-repository": {
      async readArticleTimelineItems() { return { items: [], nextCursor: null }; },
      async readTimelineItems() { genericReads += 1; throw new Error("unexpected_generic_read"); },
    },
  }, { Buffer, Promise });
  const response = await route.GET({ url: "http://local/api/v2/timelines/article/7" }, { params: Promise.resolve({ ownerType: "article", ownerId: "7" }) });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data.items, []);
  assert.equal(response.body.data.nextCursor, null);
  assert.equal(genericReads, 0);
});
