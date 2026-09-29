"use strict";

const [url, body] = process.argv.slice(2);
fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: Buffer.from(body, "base64url").toString("utf8") })
  .then(async (response) => console.log(JSON.stringify({ status: response.status, body: await response.json() })))
  .catch((error) => { console.error(error.message); process.exitCode = 1; });
