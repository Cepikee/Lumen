"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { inspectImage } = require("../../lib/article-images/image-metadata");
const { createImageStorage } = require("../../lib/article-images/storage");
const fixtures = require("../helpers/image-fixtures.cjs");

const formats = [
  ["jpeg", "image/jpeg", "jpg", fixtures.jpeg],
  ["png", "image/png", "png", fixtures.png],
  ["webp", "image/webp", "webp", fixtures.webp],
];

for (const [format, mimeType, extension, fixture] of formats) {
  test(`${format} metadata and passthrough storage preserve the validated format`, async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "utom-image-"));
    try {
      const bytes = fixture();
      assert.deepEqual(inspectImage(bytes), { format, mimeType, width: 1024, height: 576 });
      const storage = createImageStorage({ storageRoot: root, width: 1024, height: 576, quality: 82, optimizeWithSharp: false });
      const result = await storage.save({ articleId: 12, fingerprint: "a".repeat(64), bytes, declaredMimeType: mimeType, date: "2026-10-17T12:00:00Z" });
      assert.equal(result.storagePath, `2026/10/17/12-aaaaaaaaaaaa.${extension}`);
      assert.equal(result.mimeType, mimeType);
      assert.deepEqual(await fs.readFile(path.join(root, result.storagePath)), bytes);
      assert.deepEqual(await storage.inspect(result.storagePath), result);
      assert.deepEqual(await storage.findExisting({ articleId: 12, fingerprint: "a".repeat(64), date: "2026-10-17T12:00:00Z" }), result);
      assert.deepEqual(await fs.readdir(path.dirname(path.join(root, result.storagePath))), [path.basename(result.storagePath)], "atomic temporary file must not remain");
    } finally { await fs.rm(root, { recursive: true, force: true }); }
  });

  test(`${format} rejects wrong dimensions and corrupt structure`, async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "utom-image-"));
    try {
      const storage = createImageStorage({ storageRoot: root, width: 1024, height: 576, optimizeWithSharp: false });
      await assert.rejects(storage.save({ articleId: 1, fingerprint: "b".repeat(64), bytes: fixture(640, 480) }), /invalid_image_dimensions/);
      const corrupt = fixture();
      corrupt[format === "png" ? 20 : format === "webp" ? 4 : 0] ^= 0xff;
      await assert.rejects(storage.save({ articleId: 1, fingerprint: "c".repeat(64), bytes: corrupt }), /invalid_image_bytes/);
    } finally { await fs.rm(root, { recursive: true, force: true }); }
  });
}

test("MIME/magic mismatch, huge dimensions and unsafe paths fail closed", async () => {
  assert.throws(() => inspectImage(fixtures.jpeg(), { declaredMimeType: "image/png" }), /image_mime_mismatch/);
  assert.throws(() => inspectImage(fixtures.webp(32768, 2000)), /invalid_image_bytes/);
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "utom-image-"));
  try {
    const storage = createImageStorage({ storageRoot: root, width: 1024, height: 576, optimizeWithSharp: false });
    await assert.rejects(storage.exists("../escape.webp"), /unsafe_image_path/);
    await assert.rejects(storage.exists("2026/10/17/not-fingerprinted.webp"), /unsafe_image_path/);
    await assert.rejects(storage.exists("C:/outside/1-aaaaaaaaaaaa.jpg"), /unsafe_image_path/);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("a symlink at a valid fingerprinted path is never inspected as an image", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "utom-image-"));
  const outside = path.join(os.tmpdir(), `utom-outside-${process.pid}.jpg`);
  try {
    await fs.writeFile(outside, fixtures.jpeg());
    const storage = createImageStorage({ storageRoot: root, width: 1024, height: 576, optimizeWithSharp: false });
    const target = storage.target({ articleId: 1, fingerprint: "d".repeat(64), date: "2026-10-17", format: "jpeg" });
    await fs.mkdir(path.dirname(target.absolutePath), { recursive: true });
    try { await fs.symlink(outside, target.absolutePath); } catch (error) {
      if (error?.code === "EPERM") return t.skip("host policy does not permit test symlinks");
      throw error;
    }
    assert.equal(await storage.inspect(target.storagePath), null);
  } finally { await fs.rm(root, { recursive: true, force: true }); await fs.rm(outside, { force: true }); }
});

test("symlink metadata is rejected before file bytes are read", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "utom-image-"));
  const originalLstat = fs.lstat;
  try {
    const storage = createImageStorage({ storageRoot: root, width: 1024, height: 576, optimizeWithSharp: false });
    const target = storage.target({ articleId: 4, fingerprint: "1".repeat(64), date: "2026-10-17", format: "jpeg" });
    await fs.mkdir(path.dirname(target.absolutePath), { recursive: true });
    fs.lstat = async () => ({ isFile: () => true, isSymbolicLink: () => true, size: fixtures.jpeg().length });
    assert.equal(await storage.inspect(target.storagePath), null);
  } finally { fs.lstat = originalLstat; await fs.rm(root, { recursive: true, force: true }); }
});

test("Sharp optimization is optional and unsupported CPU falls back to original JPEG", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "utom-image-"));
  const logs = [];
  let loaderCalls = 0;
  try {
    const bytes = fixtures.jpeg();
    const storage = createImageStorage({ storageRoot: root, width: 1024, height: 576, quality: 82, optimizeWithSharp: true }, {
      loadSharp: () => { loaderCalls += 1; throw new Error("Unsupported CPU: Prebuilt binaries for Linux x64 require v2 microarchitecture"); },
      logger: (entry) => logs.push(entry),
    });
    const result = await storage.save({ articleId: 2, fingerprint: "e".repeat(64), bytes, declaredMimeType: "image/jpeg", date: "2026-10-17" });
    assert.match(result.storagePath, /\.jpg$/);
    assert.equal(logs.length, 1);
    assert.equal(logs[0].fallback, "original_raster");
    await storage.save({ articleId: 3, fingerprint: "2".repeat(64), bytes, declaredMimeType: "image/jpeg", date: "2026-10-17" });
    assert.equal(loaderCalls, 1, "an unavailable optimizer must be capability-cached per worker");
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("available optional optimizer output is revalidated and stored as WebP", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "utom-image-"));
  try {
    const optimized = fixtures.webp();
    const fakeSharp = () => ({ webp: () => ({ toBuffer: async () => optimized }) });
    const storage = createImageStorage({ storageRoot: root, width: 1024, height: 576, quality: 82, optimizeWithSharp: true }, { loadSharp: () => fakeSharp });
    const result = await storage.save({ articleId: 3, fingerprint: "f".repeat(64), bytes: fixtures.png(), date: "2026-10-17" });
    assert.match(result.storagePath, /\.webp$/);
    assert.equal(result.mimeType, "image/webp");
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
