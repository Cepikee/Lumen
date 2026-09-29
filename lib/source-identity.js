"use strict";

const SOURCES = Object.freeze([
  { sourceId: 1, key: "telex.hu", displayName: "Telex", aliases: ["telex", "telex.hu", "www.telex.hu"] },
  { sourceId: 2, key: "24.hu", displayName: "24.hu", aliases: ["24hu", "24.hu", "www.24.hu"] },
  { sourceId: 3, key: "index.hu", displayName: "Index", aliases: ["index", "index.hu", "www.index.hu"] },
  { sourceId: 4, key: "hvg.hu", displayName: "HVG", aliases: ["hvg", "hvg.hu", "www.hvg.hu"] },
  { sourceId: 5, key: "portfolio.hu", displayName: "Portfolio", aliases: ["portfolio", "portfolio.hu", "www.portfolio.hu"] },
  { sourceId: 6, key: "444.hu", displayName: "444.hu", aliases: ["444", "444hu", "444.hu", "www.444.hu"] },
  { sourceId: 7, key: "origo.hu", displayName: "Origo", aliases: ["origo", "origo.hu", "www.origo.hu"] },
]);

const BY_ALIAS = new Map(SOURCES.flatMap((source) => source.aliases.map((alias) => [alias, source])));

function normalizeSourceIdentity(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/\.$/, "");
  return BY_ALIAS.get(normalized) || null;
}

function sourceIdentityFromUrl(value) {
  try { return normalizeSourceIdentity(new URL(String(value)).hostname); } catch { return null; }
}

module.exports = { SOURCES, normalizeSourceIdentity, sourceIdentityFromUrl };
