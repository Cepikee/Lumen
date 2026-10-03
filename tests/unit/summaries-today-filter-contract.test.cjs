const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('app/api/summaries/route.ts', 'utf8');

// A combined today + source/category request must keep the business-day
// bounds in the filtered branch; otherwise the API silently returns history.
assert.match(source, /const todayFilter = searchParams\.get\("today"\) === "true"/);
assert.match(source, /if \(todayBounds\) \{[\s\S]*?s\.created_at >= \? AND s\.created_at < \?/);
assert.match(source, /params\.push\(mysqlUtc\(todayBounds\.start\), mysqlUtc\(todayBounds\.end\)\)/);
assert.match(source, /if \(todayFilter\) \{[\s\S]*?todayBounds!\.start/);

console.log('summaries today+filter contract regression: PASS');
