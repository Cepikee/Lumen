// Manual, opt-in 444.hu feed diagnostic. This file does not run during app startup.
"use strict";

const { fetchPinnedText } = require("./lib/safe-fetch");

async function main() {
  const result = await fetchPinnedText("https://444.hu/feed", {
    timeoutMs: 20_000,
    maxRedirects: 5,
    maxBytes: 5 * 1024 * 1024,
    headers: {
      "User-Agent": "UtomFeedDiagnostic/1.0 (+https://utom.hu)",
      Accept: "application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.1",
    },
  });
  if (!/<rss\b|<feed\b/i.test(result.text)) throw new Error("feed_response_is_not_rss_or_atom");
  console.log(`feed_diagnostic ok bytes=${Buffer.byteLength(result.text)} host=444.hu`);
}

main().catch((error) => {
  console.error(`feed_diagnostic failed code=${error instanceof Error ? error.message : "unknown"}`);
  process.exitCode = 1;
});