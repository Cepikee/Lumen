const fs = require('fs');
const source = fs.readFileSync('components/WhatHappenedTodayKulcsszavak.tsx', 'utf8');
if (!source.includes('Number.isFinite(count) && count >= 0 ? count : 0')) {
  throw new Error('keyword chart must normalize invalid counts');
}
if (!source.includes('.filter((item) => item.keyword.length > 0)')) {
  throw new Error('keyword chart must remove empty labels');
}
console.log('keyword chart numeric safety: PASS');
