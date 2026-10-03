const fs = require('fs');
const source = fs.readFileSync('components/Header.tsx', 'utf8');
if (!source.includes('const isLanding = pathname.startsWith("/landing")')) {
  throw new Error('header must derive landing state without an early hook return');
}
const early = source.indexOf('if (pathname.startsWith("/landing")) return null;');
if (early !== -1) throw new Error('header still has a pre-hook conditional return');
if (!source.includes('if (isLanding) return null;')) throw new Error('header landing return missing');
console.log('header hooks order regression: PASS');
