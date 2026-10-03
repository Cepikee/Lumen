const fs = require('fs');
const source = fs.readFileSync('app/insights/page.tsx', 'utf8');
if (!source.includes('Number.isFinite(parsed) ? parsed : fallback')) {
  throw new Error('insights category numbers must reject NaN and Infinity');
}
if (!source.includes('Math.max(0, finiteInsightNumber(it.articleCount))')) {
  throw new Error('insights article counts must not be negative');
}
console.log('insights category numeric safety: PASS');
