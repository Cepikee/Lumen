"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { projectRelatedNews } = require("../../lib/v2/related-news-projection");
const { adaptOptionalRelatedProjection } = require("../../lib/v2/runtime-related-news");

test("related projection preserves legacy ordering and canonical IDs", () => {
  const output = projectRelatedNews({
    currentSummaryId: 10,
    currentArticleId: 100,
    rows: [
      { id: 11, article_id: 101, title: "  First ", url: "https://example.test/1", created_at: "2026-10-03T10:00:00Z", source: "24hu", source_id: 2 },
      { id: 12, article_id: 101, title: "duplicate", url: "https://example.test/duplicate" },
      { id: 13, article_id: 100, title: "self" },
      { id: 10, article_id: 999, title: "summary self" },
    ],
  });
  assert.equal(output.contractVersion, "v2.related-news.1");
  assert.deepEqual(output.items, [{
    summaryId: 11,
    articleId: 101,
    title: "First",
    url: "https://example.test/1",
    createdAt: "2026-10-03T10:00:00Z",
    source: "24.hu",
    sourceId: 2,
  }]);
  assert.ok(Object.isFrozen(output));
  assert.ok(Object.isFrozen(output.items));
});

test("related projection falls back from an empty joined source label to the legacy source", () => {
  const output = projectRelatedNews({ rows: [{ id: 2, source_name: "  ", source: "HVG" }] });
  assert.equal(output.items[0].source, "hvg.hu");
});

test("related projection distinguishes unresolved, empty and malformed snapshots", () => {
  assert.equal(projectRelatedNews({ currentSummaryId: 1, rows: null }).items, null);
  assert.deepEqual(projectRelatedNews({ currentSummaryId: 1, rows: [] }).items, []);
  assert.throws(() => projectRelatedNews({ currentSummaryId: 1, rows: "bad" }), /invalid_related_snapshot/);
  const malformed = projectRelatedNews({ currentSummaryId: 1, rows: [null, {}, { id: "bad" }, { id: 2, article_id: "bad" }] });
  assert.deepEqual(malformed.items, [{ summaryId: 2, articleId: null, title: null, url: null, createdAt: null, source: null, sourceId: null }]);
});

test("related runtime projection is inert OFF and runs exactly once ON", () => {
  let calls = 0;
  assert.equal(adaptOptionalRelatedProjection({ rows: [] }, { enabled: false, project: () => { calls += 1; } }), undefined);
  const result = adaptOptionalRelatedProjection({ rows: [] }, { enabled: true, project: (snapshot) => { calls += 1; assert.deepEqual(snapshot, { rows: [] }); return { ok: true }; } });
  assert.equal(calls, 1);
  assert.deepEqual(result, { ok: true });
});

test("related route invokes one projection after its single legacy query and keeps array response", () => {
  const source = fs.readFileSync("app/api/related/route.ts", "utf8");
  assert.equal((source.match(/adaptOptionalRelatedProjection\(/g) || []).length, 1);
  assert.match(source, /return NextResponse\.json\(rows\)/);
  assert.equal((source.match(/await pool\.query\(/g) || []).length, 1);
});
