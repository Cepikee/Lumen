"use strict";

const zlib = require("node:zlib");

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

function pngChunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const output = Buffer.alloc(12 + data.length);
  output.writeUInt32BE(data.length, 0);
  name.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([name, data])), 8 + data.length);
  return output;
}

function png(width = 1024, height = 576) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  const row = Buffer.alloc(width * 3 + 1);
  const pixels = Buffer.alloc(row.length * height);
  for (let offset = 0; offset < pixels.length; offset += row.length) row.copy(pixels, offset);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header), pngChunk("IDAT", zlib.deflateSync(pixels)), pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function jpeg(width = 1024, height = 576) {
  const app = Buffer.alloc(480);
  app.writeUInt16BE(480, 0);
  const frame = Buffer.alloc(17);
  frame.writeUInt16BE(17, 0);
  frame[2] = 8;
  frame.writeUInt16BE(height, 3);
  frame.writeUInt16BE(width, 5);
  frame[7] = 3;
  const scan = Buffer.alloc(12);
  scan.writeUInt16BE(12, 0);
  return Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), app, Buffer.from([0xff, 0xc0]), frame,
    Buffer.from([0xff, 0xda]), scan, Buffer.alloc(24, 0x55), Buffer.from([0xff, 0xd9])]);
}

function webp(width = 1024, height = 576) {
  const frame = Buffer.alloc(500);
  frame[3] = 0x9d;
  frame[4] = 0x01;
  frame[5] = 0x2a;
  frame.writeUInt16LE(width, 6);
  frame.writeUInt16LE(height, 8);
  const output = Buffer.alloc(12 + 8 + frame.length);
  output.write("RIFF", 0, "ascii");
  output.writeUInt32LE(output.length - 8, 4);
  output.write("WEBP", 8, "ascii");
  output.write("VP8 ", 12, "ascii");
  output.writeUInt32LE(frame.length, 16);
  frame.copy(output, 20);
  return output;
}

module.exports = { jpeg, png, webp };
