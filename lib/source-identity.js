"use strict";

const SOURCES = Object.freeze([
  { sourceId: 1, key: "telex.hu", displayName: "Telex", homepageUrl: "https://telex.hu", feedUrl: "https://telex.hu/rss", aliases: ["telex", "telex.hu", "www.telex.hu"] },
  { sourceId: 2, key: "24.hu", displayName: "24.hu", homepageUrl: "https://24.hu", feedUrl: "https://24.hu/feed", aliases: ["24hu", "24.hu", "www.24.hu"] },
  { sourceId: 3, key: "index.hu", displayName: "Index", homepageUrl: "https://index.hu", feedUrl: "https://index.hu/24ora/rss/", aliases: ["index", "index.hu", "www.index.hu"] },
  { sourceId: 4, key: "hvg.hu", displayName: "HVG", homepageUrl: "https://hvg.hu", feedUrl: "https://hvg.hu/rss", aliases: ["hvg", "hvg.hu", "www.hvg.hu"] },
  { sourceId: 5, key: "portfolio.hu", displayName: "Portfolio", homepageUrl: "https://www.portfolio.hu", feedUrl: "https://www.portfolio.hu/rss/all.xml", aliases: ["portfolio", "portfolio.hu", "www.portfolio.hu"] },
  { sourceId: 6, key: "444.hu", displayName: "444.hu", homepageUrl: "https://444.hu", feedUrl: "https://444.hu/feed", aliases: ["444", "444hu", "444.hu", "www.444.hu"] },
  { sourceId: 7, key: "origo.hu", displayName: "Origo", homepageUrl: "https://www.origo.hu", feedUrl: "https://www.origo.hu/publicapi/hu/rss/origo/articles", aliases: ["origo", "origo.hu", "www.origo.hu"] },
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
