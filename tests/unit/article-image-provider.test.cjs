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
  assert.equal(request.init.headers["Content-Type"], undefined);
  assert.ok(request.init.body instanceof FormData);
  assert.deepEqual(Object.fromEntries(request.init.body.entries()), { prompt: "safe prompt", width: "1024", height: "576" });
  assert.doesNotMatch(JSON.stringify(output), /secret-token/);
});

test("Cloudflare provider sends optional seed only when configured and no unsupported fields", async () => {
  const requests = [];
  const bytes = Buffer.alloc(600, 7).toString("base64");
  const fetch = async (_url, init) => { requests.push(init); return new Response(JSON.stringify({ result: { image: bytes } })); };
  await createCloudflareImageProvider(config, { fetch }).generate("first");
  await createCloudflareImageProvider({ ...config, seed: 42 }, { fetch }).generate("second");
  const absent = Object.fromEntries(requests[0].body.entries());
  const present = Object.fromEntries(requests[1].body.entries());
  assert.equal(absent.seed, undefined);
  assert.equal(present.seed, "42");
  for (const fields of [absent, present]) {
    assert.equal(fields.steps, undefined);
    assert.equal(fields.num_inference_steps, undefined);
    assert.equal(fields.output_format, undefined);
    assert.equal(fields.negative_prompt, undefined);
  }
});

test("Cloudflare provider classifies 429 and malformed responses", async () => {
  const throttled = createCloudflareImageProvider(config, { fetch: async () => new Response("busy", { status: 429, headers: { "retry-after": "2" } }) });
  await assert.rejects(throttled.generate("x"), (error) => error.code === "http_429" && error.retryable && error.retryAfterMs === 2000);
  const malformed = createCloudflareImageProvider(config, { fetch: async () => new Response("{}", { status: 200, headers: { "content-type": "application/json" } }) });
  await assert.rejects(malformed.generate("x"), (error) => error.code === "malformed_response" && !error.retryable);
});

test("Cloudflare provider parses bounded 400 diagnostics without leaking credentials or prompt", async () => {
  const prompt = "private editorial prompt";
  const provider = createCloudflareImageProvider(config, { fetch: async () => new Response(JSON.stringify({
    success: false, errors: [{ code: 10001, message: `invalid multipart for ${prompt} using secret-token` }],
  }), { status: 400, headers: { "content-type": "application/json", "cf-ray": "request-ray" } }) });
  await assert.rejects(provider.generate(prompt), (error) => {
    assert.equal(error.code, "http_400");
    assert.equal(error.retryable, false);
    assert.equal(error.providerErrorCode, "10001");
    assert.equal(error.requestId, "request-ray");
    assert.match(error.providerErrorMessage, /\[redacted\]/);
    assert.doesNotMatch(JSON.stringify(error), /secret-token|private editorial prompt/);
    return true;
  });
});

test("Cloudflare provider refuses to retain an oversized error body", async () => {
  const provider = createCloudflareImageProvider(config, { fetch: async () => new Response(JSON.stringify({ errors: [{ code: "huge", message: "x".repeat(70 * 1024) }] }), { status: 400 }) });
  await assert.rejects(provider.generate("safe"), (error) => error.code === "http_400" && error.providerErrorMessage === null);
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
