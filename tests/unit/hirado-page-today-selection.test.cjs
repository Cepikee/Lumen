const assert = require('node:assert/strict');
const fs = require('node:fs');

const page = fs.readFileSync('app/hirado/page.tsx', 'utf8');
const client = fs.readFileSync('components/HiradoClient.tsx', 'utf8');

// /hirado without an archive query must select the current Budapest business
// date, rather than silently opening the newest historical video.
assert.match(page, /import \{ parts \} from "@\/lib\/business-time"/);
assert.match(page, /SELECT id, file_url FROM videos WHERE date = \? ORDER BY id DESC LIMIT 1/);
assert.match(page, /\[today\]/);
assert.match(page, /Promise<\{ video\?: string \| string\[\] \}>/);

// An empty today response is a valid state and must not become an invalid
// response error or an endless loading state.
assert.match(client, /if \(json\?\.hasVideo === false\)/);
assert.match(client, /Ma még nincs elérhető híradó/);

console.log('hirado today selection and empty-state regression: PASS');
