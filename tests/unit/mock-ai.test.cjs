"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { mockAiResponse } = require("../../lib/ai/mockAi");

test("mock AI provides deterministic, visibly marked variants", () => {
  for (const task of ["short_summary", "long_summary", "category", "keywords", "clickbait", "malformed"]) {
    const response = mockAiResponse(task);
    assert.equal(response.isMock, true);
    assert.equal(response.marker, "UTOM_MOCK_TEST_DATA");
    assert.equal(response.task, task);
    assert.equal(typeof response.content, "string");
    assert.ok(response.content.length > 0);
  }
});

test("malformed mock supports parser error paths", () => {
  assert.throws(() => JSON.parse(mockAiResponse("malformed").content));
});
