const fs = require('fs');
const source = fs.readFileSync('components/FeedItemCard.tsx', 'utf8');
if (!source.includes('{url.trim() ? (')) {
  throw new Error('feed card must not render an empty href');
}
if (!source.includes('<span className={`line-clamp-2 font-semibold')) {
  throw new Error('feed card needs a non-link title fallback');
}
console.log('feed card URL fallback: PASS');
