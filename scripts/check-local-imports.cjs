"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const extensions = [".js", ".jsx", ".ts", ".tsx", ".cjs", ".mjs"];
const ignored = new Set(["node_modules", ".next", ".git", "audit", "docs"]);
const missing = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    else if (extensions.includes(path.extname(entry.name))) inspect(fullPath);
  }
}

function resolves(base) {
  return fs.existsSync(base)
    || extensions.some((extension) => fs.existsSync(base + extension))
    || extensions.some((extension) => fs.existsSync(path.join(base, "index" + extension)));
}

function inspect(file) {
  const source = fs.readFileSync(file, "utf8");
  const pattern = /(?:from\s+|require\s*\(|import\s*\()["']([^"']+)["']/g;
  for (const match of source.matchAll(pattern)) {
    const specifier = match[1];
    if (!specifier.startsWith(".") && !specifier.startsWith("@/")) continue;
    const base = specifier.startsWith("@/")
      ? path.join(root, specifier.slice(2))
      : path.resolve(path.dirname(file), specifier);
    if (!resolves(base)) missing.push(`${path.relative(root, file)} -> ${specifier}`);
  }
}

walk(root);
if (missing.length) {
  console.error("Hiányzó helyi importok:\n" + missing.map((item) => `- ${item}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("Minden statikusan felismerhető helyi import feloldható.");
}
