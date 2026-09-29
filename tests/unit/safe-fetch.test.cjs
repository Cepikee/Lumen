"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const https = require("node:https");
const fs = require("node:fs");
const path = require("node:path");
const { isBlockedAddress, resolvePinnedTarget, fetchPinnedText } = require("../../lib/safe-fetch");

test("SSRF address policy blocks private IPv4, IPv6, mapped, link-local and mixed DNS", async () => {
  for (const address of ["127.0.0.1", "10.0.0.1", "172.16.0.1", "192.168.1.1", "169.254.169.254", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"]) assert.equal(isBlockedAddress(address), true, address);
  assert.equal(isBlockedAddress("93.184.216.34"), false);
  assert.equal((await resolvePinnedTarget("http://public.example/", { resolver: async () => [{ address: "93.184.216.34", family: 4 }] })).selected.address, "93.184.216.34");
  await assert.rejects(resolvePinnedTarget("http://localhost/"), /blocked/);
  await assert.rejects(resolvePinnedTarget("http://mixed.example/", { resolver: async () => [{ address: "93.184.216.34", family: 4 }, { address: "10.0.0.1", family: 4 }] }), /blocked/);
  await assert.rejects(resolvePinnedTarget("http://invalid.example/", { resolver: async () => [] }), /dns_unavailable/);
});

test("pinned runtime socket uses the validated address once and preserves Host", async () => {
  let hostHeader = "";
  const server = http.createServer((request, response) => { hostHeader = String(request.headers.host); response.setHeader("content-type", "text/plain"); response.end("fixture-ok"); });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  let resolutions = 0;
  try {
    const result = await fetchPinnedText(`http://public.example:${port}/`, { allowPrivateForTest: true, allowTestPort: true, resolver: async () => { resolutions++; return [{ address: resolutions === 1 ? "127.0.0.1" : "10.0.0.1", family: 4 }]; } });
    assert.equal(result.text, "fixture-ok");
    assert.equal(result.pinnedAddress, "127.0.0.1");
    assert.equal(resolutions, 1);
    assert.equal(hostHeader, `public.example:${port}`);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test("every redirect is revalidated and private redirect is blocked", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; return new Response(null, { status: 302, headers: { location: "http://127.0.0.1/private" } }); };
  await assert.rejects(fetchPinnedText("http://public.example/start", { resolver: async () => [{ address: "93.184.216.34", family: 4 }], fetchImpl }), /blocked/);
  assert.equal(calls, 1);
  assert.equal(fs.readFileSync(require.resolve("../../lib/safe-fetch"), "utf8").includes("rejectUnauthorized: false"), false);
});

test("public redirects are re-resolved and still use the pinned socket", async () => {
  const server = http.createServer((request, response) => {
    if (request.url === "/start") { response.writeHead(302, { location: "/final" }); response.end(); return; }
    response.setHeader("content-type", "text/plain"); response.end("redirect-ok");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  let resolutions = 0;
  try {
    const result = await fetchPinnedText(`http://public.example:${port}/start`, { allowPrivateForTest: true, allowTestPort: true, resolver: async () => { resolutions++; return [{ address: "127.0.0.1", family: 4 }]; } });
    assert.equal(result.text, "redirect-ok");
    assert.equal(result.url.pathname, "/final");
    assert.equal(resolutions, 2);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test("pinned fetch aborts a slow response at the configured timeout", async () => {
  const server = http.createServer((_request, response) => setTimeout(() => response.end("late"), 100));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  try {
    await assert.rejects(fetchPinnedText(`http://public.example:${port}/`, { allowPrivateForTest: true, allowTestPort: true, timeoutMs: 20, resolver: async () => [{ address: "127.0.0.1", family: 4 }] }), /aborted|timeout/i);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test("HTTPS keeps the original SNI and rejects an untrusted certificate", async () => {
  const fixture = path.join(__dirname, "..", "fixtures", "tls");
  let serverName = "";
  const server = https.createServer({
    key: fs.readFileSync(path.join(fixture, "test-only.key")),
    cert: fs.readFileSync(path.join(fixture, "test-only.crt")),
    SNICallback(name, callback) { serverName = name; callback(null, undefined); },
  }, (_request, response) => response.end("unexpected"));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  try {
    await assert.rejects(fetchPinnedText(`https://public.example:${port}/`, { allowPrivateForTest: true, allowTestPort: true, resolver: async () => [{ address: "127.0.0.1", family: 4 }] }), /fetch failed|certificate|self-signed/i);
    assert.equal(serverName, "public.example");
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test("internet-controlled article and feed fetch paths use the pinned helper", () => {
  const scraper = fs.readFileSync(path.join(__dirname, "..", "..", "pipeline", "scrapeArticle.js"), "utf8");
  const feed = fs.readFileSync(path.join(__dirname, "..", "..", "app", "api", "fetch-feed", "route.ts"), "utf8");
  const diagnostic = fs.readFileSync(path.join(__dirname, "..", "..", "test-444-feed.js"), "utf8");
  assert.match(scraper, /fetchPinnedText/);
  assert.doesNotMatch(scraper, /\bfetch\(url/);
  assert.match(feed, /fetchPinnedText/);
  assert.doesNotMatch(feed, /page\.goto|from "puppeteer"/);
  assert.match(diagnostic, /fetchPinnedText/);
  assert.doesNotMatch(diagnostic, /puppeteer|proxy-server/);
});
