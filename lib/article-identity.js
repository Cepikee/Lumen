"use strict";

const TRACKING_PARAMS = new Set([
  "fbclid", "gclid", "dclid", "gbraid", "wbraid", "msclkid", "igshid",
  "mc_cid", "mc_eid", "mkt_tok", "vero_conv", "vero_id", "_hsenc", "_hsmi",
  "oly_anon_id", "oly_enc",
]);

function normalizePercentEncoding(value) {
  return value.replace(/%[0-9a-f]{2}/gi, (encoded) => {
    const character = String.fromCharCode(Number.parseInt(encoded.slice(1), 16));
    return /[A-Za-z0-9._~-]/.test(character) ? character : encoded.toUpperCase();
  });
}

function canonicalizeArticleUrl(value) {
  let url;
  try { url = new URL(String(value)); } catch { return null; }
  if (!new Set(["http:", "https:"]).has(url.protocol)) return null;
  if (url.username || url.password) return null;
  url.protocol = "https:";
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  if (url.port === "80" || url.port === "443") url.port = "";
  url.hash = "";
  for (const name of [...url.searchParams.keys()]) {
    if (name.toLowerCase().startsWith("utm_") || TRACKING_PARAMS.has(name.toLowerCase())) url.searchParams.delete(name);
  }
  const sortedParams = [...url.searchParams.entries()].sort(([aKey, aValue], [bKey, bValue]) =>
    aKey.localeCompare(bKey) || aValue.localeCompare(bValue));
  url.search = "";
  for (const [name, paramValue] of sortedParams) url.searchParams.append(name, paramValue);
  url.pathname = normalizePercentEncoding(url.pathname).replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
  return url.toString();
}

module.exports = { TRACKING_PARAMS, canonicalizeArticleUrl };
