const fs = require('fs');
const source = fs.readFileSync('app/page.tsx', 'utf8');
if (!source.includes('Number.isFinite(Number(item.ai_clean)) ? Number(item.ai_clean) : 0')) {
  throw new Error('feed ai_clean must reject NaN and Infinity');
}
console.log('feed ai_clean numeric safety: PASS');
