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
 assert.match(page,/searchParams\.get\("view"\)/);
 assert.match(page,/updateHomeView/);
 assert.match(layout,/aria-pressed=\{view === item\}/);
 assert.match(layout,/aria-label="Kategóriák nézet"/);
 assert.match(layout,/aria-label="Források nézet"/);
 assert.doesNotMatch(layout,/scrollIntoView/);
});
test("desktop home is a sticky three-column feed and mobile removes side rails",()=>{
 assert.match(css,/grid-template-columns:250px minmax\(0,1fr\) 360px/);
 assert.doesNotMatch(css,/max-width:1640px/);
 assert.match(css,/position:sticky/);
 assert.match(css,/border-right:1px solid rgba\(42,88,119,.66\)/);
 assert.match(css,/@media\(max-width:767px\)/);
 assert.match(css,/\.left,\.right\{display:none\}/);
});
test("rails use only loaded feed and existing keyword API data",()=>{
 assert.match(layout,/for \(const item of items\)/);
 assert.match(layout,/trending-keywords\?period=24h/);
 assert.match(layout,/sources\.map/);
 assert.doesNotMatch(layout,/comment|upvote|popularity|térkép/i);
});
test("feed card has safe fallbacks and compact content limits",()=>{
 assert.match(card,/Cím nélkül/);
 assert.match(card,/még nem érhető el rövid összefoglaló/);
 assert.match(card,/item\.url\?\.trim\(\)/);
 assert.match(card,/role="link"/);
 assert.match(read("components/NewsFeedCard.module.css"),/-webkit-line-clamp:2/);
});
test("visual polish keeps an image-less compact feed and branded source metadata",()=>{
 const cardCss=read("components/NewsFeedCard.module.css");
 const header=read("components/Header.tsx");
 const globalCss=read("app/globals.css");
 assert.match(card,/imageUrl\?<div className=\{styles\.thumbnail\}/);
 assert.match(card,/image_url\?:string\|null/);
 assert.match(card,/safeImage\(item\.image_url\)/);
 assert.match(card,/sourceBadge\(item\)/);
 assert.match(card,/sourceDomain\(item\)/);
 assert.match(cardCss,/font-size:clamp\(17px,1\.25vw,19px\)/);
 assert.doesNotMatch(header,/header-brand-word/);
 assert.match(globalCss,/\.header-home \.header-logo-img \{ width: 118px; height: 44px; object-fit:cover/);
 assert.match(globalCss,/\.header-home \.nav-link\[aria-current="page"\]::after/);
});
