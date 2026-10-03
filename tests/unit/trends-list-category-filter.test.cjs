const fs=require('fs');
const s=fs.readFileSync('components/TrendsList.tsx','utf8');
if (!s.includes('.map((category) => category.trim().toLowerCase())')) throw new Error('case-insensitive category normalization missing');
if (!s.includes('t.category.trim().toLowerCase()')) throw new Error('category trim missing');
console.log('trends list category filter normalization regression: PASS');
