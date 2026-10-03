const fs = require('fs');
const source = fs.readFileSync('app/insights/category/[category]/page.tsx', 'utf8');
if (!source.includes('Number.isFinite(Number(it.sources))')) throw new Error('category sources must be finite');
if (!source.includes('!Number.isNaN(publishedAt.getTime())')) throw new Error('category date must reject invalid dates');
console.log('category insight number/date safety: PASS');
