// lib/checkPlagiarism.js
import crypto from "crypto";

// Egyszerű hash generálás (SHA256)
function getHash(text) {
  return crypto.createHash("sha256").update(text || "", "utf8").digest("hex");
}

// Hamming distance két hex string között
function hammingDistance(a, b) {
  let dist = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) dist++;
  }
  return dist + Math.abs(a.length - b.length);
}

// Similarity score (0–1)
export function checkPlagiarism(original, generated) {
  const originalHash = getHash(original);
  const generatedHash = getHash(generated);

  const distance = hammingDistance(originalHash, generatedHash);
  const similarity = 1 - distance / originalHash.length;

  return similarity; // 0 = teljesen különböző, 1 = teljesen azonos
}
