const fs = require('fs');
const source = fs.readFileSync('app/api/insights/category/[category]/route.ts', 'utf8');
const matches = source.match(/DATE\(a\.published_at\) < \?/g) || [];
if (matches.length < 3) throw new Error('category insights queries must exclude future dates');
if (!source.includes('const endDateStr = new Date().toISOString().slice(0, 10)')) throw new Error('category end date missing');
console.log('category insight period upper-bound regression: PASS');
