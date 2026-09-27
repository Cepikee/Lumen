"use strict";

const TRACKING_PARAMS = new Set(["fbclid", "gclid", "mc_cid", "mc_eid", "ref", "source"]);

function canonicalizeArticleUrl(value) {
  let url;
  try { url = new URL(String(value)); } catch { return null; }
  if (!new Set(["http:", "https:"]).has(url.protocol)) return null;
  url.protocol = "https:";
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  url.port = "";
  url.hash = "";
  for (const name of [...url.searchParams.keys()]) {
    if (name.toLowerCase().startsWith("utm_") || TRACKING_PARAMS.has(name.toLowerCase())) url.searchParams.delete(name);
  }
  url.searchParams.sort();
  url.pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
  return url.toString();
}

module.exports = { canonicalizeArticleUrl };
