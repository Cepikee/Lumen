"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

function assertInside(root, candidate) {
  const relative = path.relative(root, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("unsafe_image_path");
}

const STORAGE_PATH = /^\d{4}\/\d{2}\/\d{2}\/[1-9]\d*-[a-f0-9]{12}\.webp$/;

function assertStoragePath(storagePath) {
  if (typeof storagePath !== "string" || !STORAGE_PATH.test(storagePath)) throw new Error("unsafe_image_path");
}

function createImageStorage(config) {
  const root = path.resolve(config.storageRoot);
  function target({ articleId, fingerprint, date = new Date() }) {
    if (!Number.isSafeInteger(Number(articleId)) || Number(articleId) <= 0 || !/^[a-f0-9]{64}$/.test(String(fingerprint))) {
      throw new Error("invalid_image_identity");
    }
    const stableDate = new Date(date);
    if (Number.isNaN(stableDate.getTime())) throw new Error("invalid_image_date");
    const yyyy = String(stableDate.getUTCFullYear());
    const mm = String(stableDate.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(stableDate.getUTCDate()).padStart(2, "0");
    const storagePath = `${yyyy}/${mm}/${dd}/${Number(articleId)}-${fingerprint.slice(0, 12)}.webp`;
    return { storagePath, absolutePath: path.resolve(root, storagePath) };
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
      const bytes = await fs.readFile(absolute);
      if (bytes.length > 15 * 1024 * 1024) return null;
      const metadata = await sharp(bytes, { failOn: "error", limitInputPixels: 50_000_000 }).metadata();
      const stat = { size: bytes.length };
      if (metadata.format !== "webp" || metadata.width !== config.width || metadata.height !== config.height || stat.size < 512) return null;
      return { storagePath, mimeType: "image/webp", width: metadata.width, height: metadata.height, byteSize: stat.size };
    } catch { return null; }
  }
  return {
    target,
    inspect,
    async exists(storagePath) {
      return Boolean(await inspect(storagePath));
    },
    async save({ articleId, fingerprint, bytes, date = new Date(), storagePath }) {
      if (!Buffer.isBuffer(bytes) || bytes.length < 512 || bytes.length > 15 * 1024 * 1024) throw new Error("invalid_image_bytes");
      const relative = storagePath || target({ articleId, fingerprint, date }).storagePath;
      const absolute = await safeAbsolute(relative, { createParent: true });
      const existing = await inspect(relative);
      if (existing) return existing;
      const temporary = `${absolute}.${process.pid}.${Date.now()}.tmp`;
      try {
        const output = await sharp(bytes, { failOn: "error", limitInputPixels: 50_000_000 })
          .rotate().resize(config.width, config.height, { fit: "cover", position: "attention" })
          .webp({ quality: config.quality }).toBuffer({ resolveWithObject: true });
        if (output.info.width !== config.width || output.info.height !== config.height || output.data.length < 512) throw new Error("invalid_transformed_image");
        await fs.writeFile(temporary, output.data, { flag: "wx" });
        await fs.rename(temporary, absolute);
        return { storagePath: relative, mimeType: "image/webp", width: output.info.width, height: output.info.height, byteSize: output.data.length };
      } catch (error) {
        await fs.rm(temporary, { force: true }).catch(() => {});
        throw error;
      }
    },
  };
}

module.exports = { createImageStorage };
