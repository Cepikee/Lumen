"use strict";

if (process.env.RUN_CLOUDFLARE_IMAGE_SMOKE !== "1") {
  console.log("SKIP: set RUN_CLOUDFLARE_IMAGE_SMOKE=1 to authorize a real provider request.");
  process.exit(0);
}
if (process.env.IMAGE_GEN_ENABLED !== "true") throw new Error("IMAGE_GEN_ENABLED=true is required");
if (!process.env.CLOUDFLARE_ACCOUNT_ID || !(process.env.CLOUDFLARE_AI_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN)) throw new Error("Cloudflare image credentials are required");

const { runOnce } = require("../pipeline/image-worker");
runOnce({ maxJobs: 1 }).then((result) => console.log(JSON.stringify(result))).catch((error) => { console.error(error.message); process.exitCode = 1; });
