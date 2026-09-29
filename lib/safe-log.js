"use strict";

const fs = require("node:fs");
const path = require("node:path");

function appendOperationalLog(filename, line, options = {}) {
  const logger = options.console || console;
  logger.error(String(line).trim());
  const directory = String(options.directory ?? process.env.UTOM_LOG_DIR ?? "").trim();
  if (!directory) return { console: true, file: false };
  try {
    fs.mkdirSync(directory, { recursive: true });
    fs.appendFileSync(path.join(directory, filename), String(line));
    return { console: true, file: true };
  } catch (error) {
    logger.error(`[operational-log] file logging unavailable: ${error instanceof Error ? error.message : String(error)}`);
    return { console: true, file: false };
  }
}

module.exports = { appendOperationalLog };
