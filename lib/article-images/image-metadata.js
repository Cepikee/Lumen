"use strict";

const MIME_BY_FORMAT = Object.freeze({ jpeg: "image/jpeg", png: "image/png", webp: "image/webp" });
const EXTENSION_BY_FORMAT = Object.freeze({ jpeg: "jpg", png: "png", webp: "webp" });
const FORMAT_BY_MIME = Object.freeze({ "image/jpeg": "jpeg", "image/jpg": "jpeg", "image/png": "png", "image/webp": "webp" });
const MAX_DIMENSION = 32_768;
const MAX_PIXELS = 50_000_000;

function invalid() { throw new Error("invalid_image_bytes"); }

function checked(format, width, height, declaredMimeType) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1
      || width > MAX_DIMENSION || height > MAX_DIMENSION || width * height > MAX_PIXELS) invalid();
  const normalizedMime = String(declaredMimeType || "").split(";", 1)[0].trim().toLowerCase();
  if (normalizedMime && (!FORMAT_BY_MIME[normalizedMime] || FORMAT_BY_MIME[normalizedMime] !== format)) throw new Error("image_mime_mismatch");
  return { format, mimeType: MIME_BY_FORMAT[format], width, height };
}

function inspectJpeg(bytes, declaredMimeType) {
  if (bytes.length < 16 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff
      || bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) invalid();
  const sof = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  let dimensions = null;
  while (offset < bytes.length - 2) {
    if (bytes[offset] !== 0xff) invalid();
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) invalid();
    const marker = bytes[offset++];
    if (marker === 0xd9) break;
    if (marker === 0x00 || marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) invalid();
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) invalid();
    if (sof.has(marker)) {
      if (length < 8 || dimensions) invalid();
      dimensions = { width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3) };
    }
    if (marker === 0xda) {
      if (!dimensions || bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) invalid();
      return checked("jpeg", dimensions.width, dimensions.height, declaredMimeType);
    }
    offset += length;
  }
  invalid();
}

let crcTable;
function crc32(bytes) {
  if (!crcTable) {
    crcTable = Array.from({ length: 256 }, (_, value) => {
      let crc = value;
      for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
      return crc >>> 0;
    });
  }
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function inspectPng(bytes, declaredMimeType) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (bytes.length < 45 || !bytes.subarray(0, 8).equals(signature)) invalid();
  let offset = 8;
  let dimensions = null;
  let sawData = false;
  let sawEnd = false;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (length > bytes.length || end > bytes.length) invalid();
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const expectedCrc = bytes.readUInt32BE(offset + 8 + length);
    if (crc32(bytes.subarray(offset + 4, offset + 8 + length)) !== expectedCrc) invalid();
    if (!dimensions) {
      if (type !== "IHDR" || length !== 13) invalid();
      dimensions = { width: bytes.readUInt32BE(offset + 8), height: bytes.readUInt32BE(offset + 12) };
    } else if (type === "IHDR") invalid();
    if (type === "IDAT") sawData = true;
    if (type === "IEND") {
      if (length !== 0 || end !== bytes.length) invalid();
      sawEnd = true;
      break;
    }
    offset = end;
  }
  if (!dimensions || !sawData || !sawEnd) invalid();
  return checked("png", dimensions.width, dimensions.height, declaredMimeType);
}

function readUInt24LE(bytes, offset) { return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16); }

function inspectWebp(bytes, declaredMimeType) {
  if (bytes.length < 30 || bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP"
      || bytes.readUInt32LE(4) + 8 !== bytes.length) invalid();
  let offset = 12;
  let dimensions = null;
  while (offset + 8 <= bytes.length) {
    const type = bytes.toString("ascii", offset, offset + 4);
    const length = bytes.readUInt32LE(offset + 4);
    const data = offset + 8;
    const end = data + length;
    if (length > bytes.length || end > bytes.length) invalid();
    if (type === "VP8X") {
      if (length !== 10) invalid();
      if (!dimensions) dimensions = { width: readUInt24LE(bytes, data + 4) + 1, height: readUInt24LE(bytes, data + 7) + 1 };
    } else if (type === "VP8L") {
      if (length < 5 || bytes[data] !== 0x2f) invalid();
      const bits = bytes.readUInt32LE(data + 1);
      const parsed = { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
      if (dimensions && (dimensions.width !== parsed.width || dimensions.height !== parsed.height)) invalid();
      dimensions = parsed;
    } else if (type === "VP8 ") {
      if (length < 10 || bytes[data + 3] !== 0x9d || bytes[data + 4] !== 0x01 || bytes[data + 5] !== 0x2a) invalid();
      const parsed = { width: bytes.readUInt16LE(data + 6) & 0x3fff, height: bytes.readUInt16LE(data + 8) & 0x3fff };
      if (dimensions && (dimensions.width !== parsed.width || dimensions.height !== parsed.height)) invalid();
      dimensions = parsed;
    }
    offset = end + (length % 2);
    if (offset > bytes.length) invalid();
  }
  if (!dimensions || offset !== bytes.length) invalid();
  return checked("webp", dimensions.width, dimensions.height, declaredMimeType);
}

function inspectImage(bytes, options = {}) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 12 || bytes.length > 15 * 1024 * 1024) invalid();
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return inspectJpeg(bytes, options.declaredMimeType);
  if (bytes[0] === 0x89 && bytes.toString("ascii", 1, 4) === "PNG") return inspectPng(bytes, options.declaredMimeType);
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return inspectWebp(bytes, options.declaredMimeType);
  invalid();
}

module.exports = { inspectImage, MIME_BY_FORMAT, EXTENSION_BY_FORMAT };
