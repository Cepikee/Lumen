const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync('components/Felolvasas.tsx','utf8');

test('speech reader guards unsupported browser APIs', () => {
  assert.match(source, /speechSupported\s*=\s*typeof window !== "undefined"/);
  assert.match(source, /if \(!text \|\| !speechSupported\) return/);
  assert.match(source, /disabled=\{!speechSupported \|\| !text\}/);
});

test('speech reader resets active playback when video changes or has no id', () => {
  assert.match(source, /setIsReading\(false\);/);
  assert.match(source, /utterRef\.current = null;/);
  assert.match(source, /if \(!videoId \|\| videoId <= 0\)/);
});
