"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

test("AI client cannot make a network request in offline mode", async () => {
  const previousFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    throw new Error("network access attempted");
  };
  process.env.UTOM_OFFLINE_MODE = "true";
  process.env.AI_PROVIDER = "openai";
  process.env.REAL_AI_ENABLED = "true";
  process.env.OPENAI_API_KEY = "test-only-placeholder";

  try {
    const { generateAi } = require("../../lib/ai/client");
    const response = await generateAi({ task: "category", prompt: "ignored" });
    assert.equal(response.content, "Tech");
    assert.equal(response.isMock, true);
    assert.equal(calls, 0);
  } finally {
    global.fetch = previousFetch;
    delete process.env.UTOM_OFFLINE_MODE;
    delete process.env.AI_PROVIDER;
    delete process.env.REAL_AI_ENABLED;
    delete process.env.OPENAI_API_KEY;
  }
});
