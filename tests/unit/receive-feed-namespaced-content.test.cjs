const assert = require('node:assert/strict');
const fs = require('node:fs');
const cheerio = require('cheerio');

const source = fs.readFileSync('app/api/receive-feed/route.ts', 'utf8');
assert.match(source, /find\("content\\\\:encoded"\)/);

const xml = '<rss><item><content:encoded><![CDATA[Teljes cikk]]></content:encoded><description>Rövid leírás</description></item></rss>';
const $ = cheerio.load(xml, { xmlMode: true });
const item = $('item');
const content = item.find('content\\:encoded').first().text() ||
  item.find('encoded').first().text() ||
  item.find('description').first().text() || '';

assert.equal(content, 'Teljes cikk');
console.log('receive-feed namespaced content regression: PASS');
