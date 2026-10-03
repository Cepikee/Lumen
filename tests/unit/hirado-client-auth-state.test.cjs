const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("components/HiradoClient.tsx", "utf8");

test("HiradoClient does not keep anonymous users in an endless loading state", () => {
  assert.match(source, /const \[userLoaded, setUserLoaded\] = useState\(false\)/);
  assert.match(source, /setUserLoaded\(true\)/);
  assert.match(source, /if \(!user\) \{/);
  assert.match(source, /A híradó megtekintéséhez be kell jelentkezni/);
});
