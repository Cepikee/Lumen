"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createCloudflareImageProvider } = require("../../lib/article-images/provider");

const config = { accountId: "account", apiToken: "secret-token", model: "@cf/black-forest-labs/flux-2-klein-4b", width: 1024, height: 576, timeoutMs: 1000 };

test("Cloudflare provider decodes a JSON base64 image without leaking auth", async () => {
  let request;
  const bytes = Buffer.alloc(600, 7);
  const provider = createCloudflareImageProvider(config, { fetch: async (url, init) => {
    request = { url, init };
    return new Response(JSON.stringify({ result: { image: bytes.toString("base64") } }), { status: 200, headers: { "content-type": "application/json" } });
  } });
  const output = await provider.generate("safe prompt");
  assert.deepEqual(output.bytes, bytes);
  assert.match(request.url, /accounts\/account\/ai\/run/);
  assert.equal(request.init.headers.Authorization, "Bearer secret-token");
  assert.doesNotMatch(JSON.stringify(output), /secret-token/);
});

test("Cloudflare provider classifies 429 and malformed responses", async () => {
  const throttled = createCloudflareImageProvider(config, { fetch: async () => new Response("busy", { status: 429, headers: { "retry-after": "2" } }) });
  await assert.rejects(throttled.generate("x"), (error) => error.code === "http_429" && error.retryable && error.retryAfterMs === 2000);
  const malformed = createCloudflareImageProvider(config, { fetch: async () => new Response("{}", { status: 200, headers: { "content-type": "application/json" } }) });
  await assert.rejects(malformed.generate("x"), (error) => error.code === "malformed_response" && !error.retryable);
});

test("Cloudflare provider maps aborted requests to retryable timeout", async () => {
  const provider = createCloudflareImageProvider({ ...config, timeoutMs: 5 }, { fetch: (_url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
  }) });
  await assert.rejects(provider.generate("x"), (error) => error.code === "timeout" && error.retryable);
});

test("Cloudflare provider bounds JSON bodies even when content-length is absent", async () => {
  const oversized = new ReadableStream({
    start(controller) {
      const chunk = new Uint8Array(1024 * 1024);
      for (let index = 0; index < 16; index += 1) controller.enqueue(chunk);
      controller.close();
    },
  });
  const provider = createCloudflareImageProvider(config, { fetch: async () => new Response(oversized, { status: 200, headers: { "content-type": "application/json" } }) });
  await assert.rejects(provider.generate("x"), (error) => error.code === "image_too_large");
});

test("provider preserves declared MIME for direct and data-URL image responses", async () => {
  const direct = createCloudflareImageProvider(config, { fetch: async () => new Response(Buffer.alloc(600), { status: 200, headers: { "content-type": "image/jpeg; charset=binary" } }) });
  assert.equal((await direct.generate("x")).mimeType, "image/jpeg");
  const encoded = Buffer.alloc(600, 3).toString("base64");
  const json = createCloudflareImageProvider(config, { fetch: async () => new Response(JSON.stringify({ result: { image: `data:image/png;base64,${encoded}` } }), { status: 200, headers: { "content-type": "application/json" } }) });
  assert.equal((await json.generate("x")).mimeType, "image/png");
});
