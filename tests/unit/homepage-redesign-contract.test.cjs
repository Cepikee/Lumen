const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const read=file=>fs.readFileSync(file,"utf8");
const page=read("app/page.tsx");
const layout=read("components/HomeFeedLayout.tsx");
const card=read("components/FeedItemCard.tsx");
const css=read("components/HomeFeedLayout.module.css");

test("home category and source filters are URL-backed",()=>{
 assert.match(page,/useSearchParams/);
 assert.match(page,/searchParams\.get\("source"\)/);
 assert.match(page,/searchParams\.get\("category"\)/);
 assert.match(page,/router\.push\(query\.size/);
 assert.match(page,/setSourceFilters\(urlSource \? \[urlSource\] : \[\]\)/);
});
test("desktop home is a sticky three-column feed and mobile removes side rails",()=>{
 assert.match(css,/grid-template-columns:220px minmax\(0,760px\) 300px/);
 assert.match(css,/position:sticky/);
 assert.match(css,/@media\(max-width:767px\)/);
 assert.match(css,/\.left,\.right\{display:none\}/);
});
test("rails use only loaded feed and existing keyword API data",()=>{
 assert.match(layout,/for\(const item of items\)/);
 assert.match(layout,/trending-keywords\?period=24h/);
 assert.match(layout,/A jelenleg betöltött hírekből/);
 assert.doesNotMatch(layout,/comment|upvote|popularity|térkép/i);
});
test("feed card has safe fallbacks and compact content limits",()=>{
 assert.match(card,/Cím nélkül/);
 assert.match(card,/még nem érhető el rövid összefoglaló/);
 assert.match(card,/item\.url\?\.trim\(\)/);
 assert.match(card,/role="link"/);
 assert.match(read("components/NewsFeedCard.module.css"),/-webkit-line-clamp:2/);
});
