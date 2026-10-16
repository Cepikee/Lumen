const {test}=require("node:test");
const assert=require("node:assert/strict");
const load=require("../helpers/insights-loader.cjs");
const Q=load("lib/insights-quality.ts");

test("very small sentiment and clickbait samples are not visualized as statistics",()=>{
  const sentiment=Q.sentimentQuality(2,271,7);
  assert.equal(sentiment.canVisualize,false); // suppresses both headline KPI and donut
  assert.equal(Q.sourceClickbaitQuality(1,1).canVisualize,false);
  assert.equal(Q.sourceClickbaitQuality(5,20).canVisualize,true);
});
test("unknown categories are data-quality gaps and sparse series stay hidden",()=>{
  for(const value of [null,""," ","ismeretlen","UNKNOWN","n/a"])assert.equal(Q.isKnownCategory(value),false);
  assert.equal(Q.isKnownCategory("Gazdaság"),true);
  assert.equal(Q.categoryQuality(2,271,7).canVisualize,false);
  assert.equal(Q.sentimentQuality(30,30,1).canVisualize,false);
  assert.equal(Q.hasEnoughTrendBuckets([1,2]),false);
  assert.equal(Q.hasEnoughTrendBuckets([1,2,3]),true);
  assert.equal(Q.hasEnoughTimelinePoints([{total:1}]),false);
});
test("advanced UI hides implementation flags and renders one selected panel shell",()=>{
  const fs=require("node:fs");
  const source=fs.readFileSync("components/InsightsSourceIntelligence.tsx","utf8");
  const dashboard=fs.readFileSync("components/InsightsDashboard.tsx","utf8");
  assert.match(source,/role="tablist"/);
  assert.equal((source.match(/role="tabpanel"/g)||[]).length,1);
  assert.match(source,/active==="cycle"/);
  assert.doesNotMatch(source,/UTOM_INSIGHTS_V2_EVENTS|v2Events\.reason/);
  assert.ok(dashboard.indexOf('aria-label="Kategóriák rendezése"')>dashboard.indexOf('aria-label="Kategóriák részletes elemzése"'));
  assert.ok(dashboard.indexOf('aria-label="Kategóriák rendezése"')>dashboard.indexOf('</header>'));
});
test("one article is not a propagation signal",()=>{
  assert.equal(Q.isPropagationCluster({count:1,sources:1}),false);
  assert.equal(Q.isPropagationCluster({count:2,sources:1}),true);
});
