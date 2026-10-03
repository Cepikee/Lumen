const fs = require('fs');
const page = fs.readFileSync('app/insights/page.tsx', 'utf8');
const dns = fs.readFileSync('components/UtomDnsKategoria.tsx', 'utf8');

if (!page.includes('Number.isNaN(date.getTime()) ? ""')) {
  throw new Error('insights category cards must suppress invalid dates');
}
if (!dns.includes('Number.isFinite(value) && value >= 0 ? value : 0')) {
  throw new Error('DNS category chart must normalize invalid numeric values');
}
console.log('insights/dns number safety contract: PASS');
