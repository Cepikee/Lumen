"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const sharp = require("sharp");
const { createImageStorage } = require("../../lib/article-images/storage");

test("storage validates, converts and atomically writes a 16:9 WebP", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "utom-image-"));
  try {
    const input = await sharp({ create: { width: 640, height: 480, channels: 3, background: "#126699" } }).png().toBuffer();
    const storage = createImageStorage({ storageRoot: root, width: 1024, height: 576, quality: 82 });
    const result = await storage.save({ articleId: 12, fingerprint: "a".repeat(64), bytes: input, date: new Date("2026-10-17T12:00:00Z") });
    assert.equal(result.storagePath, "2026/10/17/12-aaaaaaaaaaaa.webp");
    assert.equal(result.mimeType, "image/webp");
    assert.equal(result.width, 1024);
    assert.equal(result.height, 576);
    assert.equal(await storage.exists(result.storagePath), true);
    assert.deepEqual(await storage.inspect(result.storagePath), result);
    await assert.rejects(storage.exists("../escape.webp"), /unsafe_image_path/);
    await assert.rejects(storage.exists("2026/10/17/not-fingerprinted.webp"), /unsafe_image_path/);
  } finally { await fs.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }); }
});

test("storage rejects invalid provider bytes", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "utom-image-"));
  try {
    const storage = createImageStorage({ storageRoot: root, width: 1024, height: 576, quality: 82 });
    await assert.rejects(storage.save({ articleId: 1, fingerprint: "a".repeat(64), bytes: Buffer.from("bad") }), /invalid_image_bytes/);
  } finally { await fs.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }); }
});
