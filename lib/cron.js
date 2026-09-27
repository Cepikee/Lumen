// lib/cron.js
//
// S-02: A régi, hat Ollama-példányos hírfeldolgozó letiltva.
//
// Ez a worker korábban a kész cikkeket is visszatehette
// pending állapotba, és párhuzamosan futhatott a
// pipeline/cron.js feldolgozóval.
//
// A fő hírfeldolgozó: pipeline/cron.js
// Az időzített API-indító: lib/cron.ts
//
// Ezt a fájlt nem használjuk új cikkek feldolgozására.

"use strict";

const DISABLED_MESSAGE =
  "A régi lib/cron.js worker le van tiltva. " +
  "Ne indítsd el párhuzamosan a pipeline/cron.js feldolgozóval.";

async function runLegacyWorker() {
  throw new Error(DISABLED_MESSAGE);
}

if (require.main === module) {
  console.error("[S-02] " + DISABLED_MESSAGE);
  process.exitCode = 1;
}

module.exports = { runLegacyWorker };