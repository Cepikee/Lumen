"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const Module = require("node:module");
const fixtures = require("../helpers/image-fixtures.cjs");

test("worker and full ready path survive the production unsupported-CPU Sharp failure", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "utom-legacy-cpu-"));
  const previous = Object.fromEntries(["IMAGE_GEN_ENABLED", "IMAGE_GEN_OPTIMIZE_WITH_SHARP", "IMAGE_GEN_STORAGE_ROOT", "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_AI_API_TOKEN"].map((key) => [key, process.env[key]]));
  const originalLoad = Module._load;
  const completed = [];
  let claimed = false;
  try {
    Object.assign(process.env, {
      IMAGE_GEN_ENABLED: "true", IMAGE_GEN_OPTIMIZE_WITH_SHARP: "true", IMAGE_GEN_STORAGE_ROOT: root,
      CLOUDFLARE_ACCOUNT_ID: "test-account", CLOUDFLARE_AI_API_TOKEN: "test-token",
    });
    Module._load = function patched(request, parent, isMain) {
      if (request === "sharp") throw new Error("Unsupported CPU: Prebuilt binaries for Linux x64 require v2 microarchitecture");
      return originalLoad.call(this, request, parent, isMain);
    };
    const workerPath = require.resolve("../../pipeline/image-worker");
    delete require.cache[workerPath];
    const { runOnce } = require(workerPath);
    assert.equal(typeof runOnce, "function", "worker module must load without Sharp");
    const repository = {
      enqueueCompleted: async () => 1,
      claim: async () => { if (claimed) return null; claimed = true; return { articleId: 44, workerId: "legacy", claimToken: "token" }; },
      load: async () => ({ id: 44, title: "Biztonságos tesztcikk", short_summary: "A szolgáltatás adatot közölt.", category: "Tech", force_revision: 0, retry_count: 0, image_created_at: "2026-10-17T00:00:00Z" }),
      savePrompt: async () => {}, findClusterReady: async () => null, heartbeat: async () => {}, reserveBudget: async () => true,
      complete: async (_claim, details) => completed.push(details),
    };
    const result = await runOnce({ pool: {}, repository, provider: { generate: async () => ({ bytes: fixtures.jpeg(), mimeType: "image/jpeg" }) }, maxJobs: 1 });
    assert.equal(result.processed, 1);
    assert.equal(completed.at(-1).imageStatus, "ready");
    assert.equal(completed.at(-1).mimeType, "image/jpeg");
    assert.match(completed.at(-1).storagePath, /^2026\/10\/17\/44-[a-f0-9]{12}\.jpg$/);
    assert.deepEqual(await fs.readFile(path.join(root, completed.at(-1).storagePath)), fixtures.jpeg());
  } finally {
    Module._load = originalLoad;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await fs.rm(root, { recursive: true, force: true });
  }
});
