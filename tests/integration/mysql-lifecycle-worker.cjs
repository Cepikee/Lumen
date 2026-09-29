"use strict";

const { runPipelineWorker, shutdownPipelineResources } = require("../../pipeline/cron");

let stopping = false;
async function stop(signal) {
  if (stopping) return;
  stopping = true;
  try {
    await shutdownPipelineResources();
    if (process.send) process.send({ event: "stopped", signal });
    process.disconnect?.();
    process.exit(0);
  } catch (error) {
    console.error(error.stack || error.message);
    process.exit(1);
  }
}

process.once("SIGTERM", () => stop("SIGTERM"));
process.once("SIGINT", () => stop("SIGINT"));
process.on("message", (message) => {
  if (message?.signal === "SIGTERM") process.emit("SIGTERM");
  if (message?.signal === "SIGINT") process.emit("SIGINT");
});

runPipelineWorker().catch(async (error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
  await stop("startup_failure");
});
