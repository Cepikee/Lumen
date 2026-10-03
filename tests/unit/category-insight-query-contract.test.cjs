const fs = require('fs');
const assert = require('assert');

const route = fs.readFileSync('app/api/insights/category/[category]/route.ts', 'utf8');

// Category pagination must expose one row per article even when historical
// summary rows exist for the same article.
assert.match(route, /JOIN summaries s ON s\.article_id = a\.id\s+AND NOT EXISTS/);
assert.match(route, /newer_s\.created_at > s\.created_at/);
assert.match(route, /newer_s\.created_at = s\.created_at AND newer_s\.id > s\.id/);

// The total and source breakdown must count the same summary-backed article
// population that the paginated list renders, with canonical source groups.
assert.match(route, /COUNT\(DISTINCT a\.id\) AS articleCount/);
assert.match(route, /COUNT\(DISTINCT NULLIF\(LOWER\(TRIM\(a\.source\)\), ''\)\) AS sourceCount/);
assert.match(route, /COALESCE\(NULLIF\(LOWER\(TRIM\(a\.source\)\), ''\), 'ismeretlen'\) AS source/);
assert.match(route, /COUNT\(DISTINCT a\.id\) AS cnt/);

// The trend query must retain its article alias after the aggregate query
// changes; otherwise the route fails at runtime with an unknown-column error.
assert.match(route, /FROM articles a\s+JOIN summaries s ON s\.article_id = a\.id\s+AND NOT EXISTS[\s\S]*\$\{trendWhere\}\s+AND DATE\(a\.published_at\)/);

console.log('category insight query contract tests passed');
