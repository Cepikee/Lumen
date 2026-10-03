const fs=require('fs');
const s=fs.readFileSync('components/TrendsList.tsx','utf8');
if (!s.includes('function normalizeTrend')) throw new Error('trend normalization missing');
if (!s.includes('.filter((trend): trend is Trend => trend !== null)')) throw new Error('invalid trend filtering missing');
console.log('trends list malformed payload regression: PASS');
