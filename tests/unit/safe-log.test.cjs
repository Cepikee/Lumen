"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { appendOperationalLog } = require("../../lib/safe-log");

test("operational logger remains non-throwing without or with an invalid file destination", () => {
  const messages = [];
  const logger = { error: (value) => messages.push(String(value)) };
  assert.deepEqual(appendOperationalLog("feed.log", "fallback\n", { directory: "", console: logger }), { console: true, file: false });
  const fileInsteadOfDirectory = path.join(os.tmpdir(), `utom-log-file-${process.pid}`);
  fs.writeFileSync(fileInsteadOfDirectory, "x");
  assert.deepEqual(appendOperationalLog("feed.log", "still-running\n", { directory: fileInsteadOfDirectory, console: logger }), { console: true, file: false });
  fs.rmSync(fileInsteadOfDirectory);
  assert.ok(messages.some((value) => value.includes("still-running")));
});

test("operational logger writes to an explicitly configured directory", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "utom-log-"));
  try {
    const result = appendOperationalLog("feed.log", "fixture\n", { directory, console: { error() {} } });
    assert.deepEqual(result, { console: true, file: true });
    assert.equal(fs.readFileSync(path.join(directory, "feed.log"), "utf8"), "fixture\n");
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
