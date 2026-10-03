const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('app/api/insights/category/[category]/route.ts', 'utf8');
assert.match(source, /const trendSql = `\s*SELECT DATE\(a\.published_at\) AS day, COUNT\(DISTINCT a\.id\) AS cnt[\s\S]*?JOIN summaries s ON s\.article_id = a\.id[\s\S]*?NOT EXISTS \(/);
assert.match(source, /const trendSql = `[\s\S]*?GROUP BY DATE\(a\.published_at\)/);

console.log('category insight trend relation regression: PASS');
