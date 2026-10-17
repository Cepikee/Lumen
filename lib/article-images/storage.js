"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const { inspectImage, EXTENSION_BY_FORMAT } = require("./image-metadata");

function assertInside(root, candidate) {
  const relative = path.relative(root, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("unsafe_image_path");
}

const STORAGE_PATH = /^\d{4}\/\d{2}\/\d{2}\/[1-9]\d*-[a-f0-9]{12}\.(?:jpg|jpeg|png|webp)$/;
let optimizerWarningEmitted = false;

function assertStoragePath(storagePath) {
  if (typeof storagePath !== "string" || !STORAGE_PATH.test(storagePath)) throw new Error("unsafe_image_path");
}

function identityParts({ articleId, fingerprint, date = new Date() }) {
  if (!Number.isSafeInteger(Number(articleId)) || Number(articleId) <= 0 || !/^[a-f0-9]{64}$/.test(String(fingerprint))) throw new Error("invalid_image_identity");
  const stableDate = new Date(date);
  if (Number.isNaN(stableDate.getTime())) throw new Error("invalid_image_date");
  return {
    yyyy: String(stableDate.getUTCFullYear()),
    mm: String(stableDate.getUTCMonth() + 1).padStart(2, "0"),
    dd: String(stableDate.getUTCDate()).padStart(2, "0"),
    name: `${Number(articleId)}-${fingerprint.slice(0, 12)}`,
  };
}

function createImageStorage(config, dependencies = {}) {
  const root = path.resolve(config.storageRoot);
  const logger = dependencies.logger || (() => {});
  const loadSharp = dependencies.loadSharp || (() => require("sharp"));
  let optimizer = null;
  let optimizerUnavailable = false;
  function target(identity) {
    const { yyyy, mm, dd, name } = identityParts(identity);
    const extension = EXTENSION_BY_FORMAT[identity.format];
    if (!extension) throw new Error("unsupported_image_format");
    const storagePath = `${yyyy}/${mm}/${dd}/${name}.${extension}`;
    return { storagePath, absolutePath: path.resolve(root, storagePath) };
  }
  function candidates(identity) {
    return ["jpeg", "png", "webp"].map((format) => target({ ...identity, format }));
  }

  async function safeAbsolute(storagePath, { createParent = false } = {}) {
    assertStoragePath(storagePath);
    const absolute = path.resolve(root, storagePath);
    assertInside(root, absolute);
    await fs.mkdir(root, { recursive: true });
    if (createParent) await fs.mkdir(path.dirname(absolute), { recursive: true });
    const realRoot = await fs.realpath(root);
    const realParent = await fs.realpath(path.dirname(absolute));
    assertInside(realRoot, realParent);
    return absolute;
  }

  async function inspect(storagePath) {
    let absolute;
    try { absolute = await safeAbsolute(storagePath); } catch (error) {
      if (error?.code === "ENOENT") return null;
      throw error;
    }
    try {
      const file = await fs.lstat(absolute);
      if (!file.isFile() || file.isSymbolicLink() || file.size < 512 || file.size > 15 * 1024 * 1024) return null;
      const bytes = await fs.readFile(absolute);
      const metadata = inspectImage(bytes);
      const extension = path.extname(storagePath).toLowerCase();
      const validExtensions = metadata.format === "jpeg" ? new Set([".jpg", ".jpeg"]) : new Set([`.${metadata.format}`]);
      if (!validExtensions.has(extension) || metadata.width !== config.width || metadata.height !== config.height) return null;
      return { storagePath, mimeType: metadata.mimeType, width: metadata.width, height: metadata.height, byteSize: bytes.length };
    } catch { return null; }
  }

  async function findExisting(identity) {
    for (const candidate of candidates(identity)) {
      const existing = await inspect(candidate.storagePath);
      if (existing) return existing;
    }
    return null;
  }

  async function optionallyOptimize(bytes, metadata) {
    if (!config.optimizeWithSharp) return { bytes, metadata };
    if (optimizerUnavailable) return { bytes, metadata };
    try {
      optimizer ||= loadSharp();
      const output = await optimizer(bytes, { failOn: "error", limitInputPixels: 50_000_000 }).webp({ quality: config.quality }).toBuffer();
      if (!Buffer.isBuffer(output) || output.length < 512 || output.length > 15 * 1024 * 1024) throw new Error("invalid_optimized_image");
      const optimized = inspectImage(output);
      if (optimized.width !== config.width || optimized.height !== config.height) throw new Error("invalid_optimized_image");
      return { bytes: output, metadata: optimized };
    } catch (error) {
      optimizerUnavailable = true;
      if (!optimizerWarningEmitted) {
        optimizerWarningEmitted = true;
        logger({ event: "article_image_optimizer_unavailable", reason: String(error?.message || error).slice(0, 200), fallback: "original_raster" });
      }
      return { bytes, metadata };
    }
  }
  return {
    target,
    candidates,
    inspect,
    findExisting,
    async exists(storagePath) {
      return Boolean(await inspect(storagePath));
    },
    async save({ articleId, fingerprint, bytes, date = new Date(), declaredMimeType }) {
      if (!Buffer.isBuffer(bytes) || bytes.length < 512 || bytes.length > 15 * 1024 * 1024) throw new Error("invalid_image_bytes");
      let metadata = inspectImage(bytes, { declaredMimeType });
      if (metadata.width !== config.width || metadata.height !== config.height) throw new Error("invalid_image_dimensions");
      ({ bytes, metadata } = await optionallyOptimize(bytes, metadata));
      const relative = target({ articleId, fingerprint, date, format: metadata.format }).storagePath;
      const absolute = await safeAbsolute(relative, { createParent: true });
      const existing = await inspect(relative);
      if (existing) return existing;
      const temporary = `${absolute}.${process.pid}.${Date.now()}.tmp`;
      try {
        await fs.writeFile(temporary, bytes, { flag: "wx" });
        await fs.rename(temporary, absolute);
        return { storagePath: relative, mimeType: metadata.mimeType, width: metadata.width, height: metadata.height, byteSize: bytes.length };
      } catch (error) {
        await fs.rm(temporary, { force: true }).catch(() => {});
        throw error;
      }
    },
  };
}

module.exports = { createImageStorage, STORAGE_PATH };
