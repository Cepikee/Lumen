"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeSourceIdentity, sourceIdentityFromUrl } = require("../../lib/source-identity");
const { parsePublicationTime, resolvePublicationTime, toMysqlUtc } = require("../../lib/publication-time");

test("source aliases resolve to one canonical internal identity", () => {
  for (const alias of ["24hu", "24.hu", "www.24.hu"]) {
    assert.equal(normalizeSourceIdentity(alias)?.key, "24.hu");
    assert.equal(normalizeSourceIdentity(alias)?.sourceId, 2);
  }
  assert.equal(sourceIdentityFromUrl("https://www.24.hu/story")?.key, "24.hu");
  assert.equal(normalizeSourceIdentity("unknown.example"), null);
});

test("publication parser accepts explicit timezone formats and normalizes to UTC", () => {
  assert.equal(toMysqlUtc(parsePublicationTime("Sun, 25 Oct 2026 02:30:00 +0200")), "2026-10-25 00:30:00");
  assert.equal(toMysqlUtc(parsePublicationTime("2026-10-25T00:30:00Z")), "2026-10-25 00:30:00");
  assert.equal(toMysqlUtc(parsePublicationTime("2026-10-25T01:30:00+01:00")), "2026-10-25 00:30:00");
});

test("ambiguous, invalid, null, and epoch-like publication values are rejected", () => {
  for (const value of [null, "", "not-a-date", "2026-10-25 02:30:00", "1970-01-01T00:00:00Z"]) {
    assert.equal(parsePublicationTime(value), null);
  }
});

test("publication resolution uses explicit feed time before safe ingestion fallback", () => {
  const fallback = new Date("2026-09-28T10:00:00Z");
  const feed = resolvePublicationTime([{ value: "2026-09-28T11:00:00+02:00", source: "feed_explicit" }], fallback);
  assert.equal(feed.mysqlUtc, "2026-09-28 09:00:00");
  assert.equal(feed.source, "feed_explicit");
  const invalid = resolvePublicationTime([{ value: "ambiguous", source: "feed_explicit" }], fallback);
  assert.equal(invalid.mysqlUtc, "2026-09-28 10:00:00");
  assert.equal(invalid.source, "ingested_at_fallback");
});
