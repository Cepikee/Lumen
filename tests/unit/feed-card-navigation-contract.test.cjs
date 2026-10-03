const fs = require("fs");
const source = fs.readFileSync("components/FeedItemCard.tsx", "utf8");
if (!source.includes('role="link"')) throw new Error("feed card must remain keyboard navigable");
if (!source.includes('router.push(`/cikk/${item.id}`)')) throw new Error("feed card must navigate to article detail");
if (source.includes('<Link href={`/cikk/${item.id}`}')) throw new Error("feed card must not nest an anchor around its external article link");
console.log("feed nested-link navigation regression: PASS");
