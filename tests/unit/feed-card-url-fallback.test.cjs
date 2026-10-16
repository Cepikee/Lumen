const fs = require('fs');
const source = fs.readFileSync('components/FeedItemCard.tsx', 'utf8');
if (!/item\.url\?\.trim\(\)\?<a/.test(source)) {
  throw new Error('feed card must not render an empty href');
}
if (!source.includes('const summary=typeof item.content==="string"?item.content:""')) {
  throw new Error('feed card needs a non-link title fallback');
}
console.log('feed card URL fallback: PASS');
