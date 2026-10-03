const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '../../components/FrameModal.tsx'),
  'utf8'
);

// The modal is mounted before the async auth probe finishes. Its selected
// value must follow the arriving user's existing frame instead of staying at
// the empty initial state.
assert.match(source, /useEffect\(\(\) => \{[\s\S]*setSelected\(user\?\.avatar_frame \|\| ""\);[\s\S]*\}, \[user\?\.avatar_frame\]\)/);

console.log('frame modal user sync regression: PASS');
