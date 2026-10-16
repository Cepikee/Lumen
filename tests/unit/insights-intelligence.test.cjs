const {test}=require('node:test');
const assert=require('node:assert/strict');
const I=require('../../lib/insights-intelligence');
const end=Date.parse('2026-10-25T12:00:00Z');
const options=(query='')=>I.queryOptions(new URLSearchParams(query),end);
const row=(id,overrides={})=>({id,title:'Hír',category:'Gazdaság',source:'Telex',publishedAt:new Date(end-3600000).toISOString(),summaryId:id,processedAt:new Date(end-1000).toISOString(),sentiment:-1,clickbait:60,keywords:'infláció,infláció',...overrides});
test('all rolling windows have exact UTC bounds including Budapest DST',()=>{
 for(const [period,ms] of Object.entries(I.PERIODS)){const o=options('period='+period);assert.equal(o.end-o.start,ms);assert.equal(o.start-o.previousStart,ms);}
 for(const q of ['period=bad','page=NaN','page=1.2','category= ','phase=bad','asOf=garbage'])assert.throws(()=>options(q));
});
test('missing summaries remain eligible, zero is measured, duplicates and malformed dates excluded',()=>{
 const rows=I.normalizeRows([row(1,{summaryId:null,clickbait:null}),row(2,{clickbait:0}),row(2),row(3,{publishedAt:'bad'})]);
 const s=I.buildSnapshot(rows,options());assert.equal(s.counts.current,2);assert.equal(s.quality.clickbait.analyzed,1);assert.equal(s.quality.clickbait.state,'partial');assert.equal(s.views.clickbait.sources[0].avg_clickbait,0);
});
test('drill-down and summary use identical category/source/keyword filters and half-open boundary',()=>{
 const rows=I.normalizeRows([row(1),row(2,{source:'hvg'}),row(3,{publishedAt:new Date(end).toISOString()})]);
 const o=options('category=GAZDASÁG&source=telex.hu&keyword=infláció');
 assert.equal(I.buildSnapshot(rows,o).counts.current,I.detail(rows,o).total);assert.equal(I.detail(rows,o).total,1);
});
test('missing historical baseline is not treated as zero growth and backlog is not publication growth',()=>{
 const rows=I.normalizeRows([row(1)]);
 const s=I.buildSnapshot(rows,options());assert.equal(s.highlights.length,0);assert.equal(s.movers.rising.length,0);assert.equal(s.counts.baselineAvailable,false);assert.equal(s.processing.olderPublished,0);assert.equal(s.counts.current,1);assert.equal(I.delta(10,0).percent,null);
});
test('unknown categories remain coverage gaps and never become chart categories',()=>{
 const rows=I.normalizeRows([row(1,{category:'ismeretlen'}),row(2,{category:' Gazdaság '})]);
 const s=I.buildSnapshot(rows,options());
 assert.equal(s.quality.category.analyzed,1);assert.equal(s.quality.category.missing,1);
 assert.deepEqual(Array.from(s.views.overview.categories,category=>category.category),['gazdaság']);
});
test('empty quality is none, invalid numbers do not become observations',()=>{
 const s=I.buildSnapshot(I.normalizeRows([row(1,{sentiment:'NaN',clickbait:Infinity})]),options());assert.equal(s.quality.sentiment.state,'none');assert.equal(s.sentimentChange.percentagePoints,null);
});
test('lifecycle is deterministic and does not claim a real-time peak',()=>{
 for(const [buckets,state] of [[[0,0,0,12],'new'],[[1,3,8,10],'slowing'],[[8,9,10,15],'rising'],[[10,12,10,3],'declining'],[[5,5,5,0],'fading'],[[0,0,1,0],'insufficient']])assert.equal(I.lifecycle(buckets),state);
});
test('no historical baseline or a single source cannot trigger an anomaly',()=>{
 const rows=I.normalizeRows(Array.from({length:30},(_,i)=>row(i+1)));
 assert.equal(I.buildSnapshot(rows,options()).intelligence.velocity.anomalous,false);
});
test('emergence requires a real cluster and several sources, not shared keywords',()=>{
 const raw=Array.from({length:9},(_,i)=>row(i+1,{source:['telex','hvg','index'][i%3],clusterId:5,clusterStart:new Date(end-3600000).toISOString(),firstSource:'telex'}));
 const intel=I.buildSnapshot(I.normalizeRows(raw),options()).intelligence;
 assert.equal(intel.emerging.length,1);assert.equal(intel.emerging[0].sources,3);assert.equal(intel.diversity.clusters,1);
 assert.equal(I.buildSnapshot(I.normalizeRows(raw.map(r=>({...r,clusterId:null}))),options()).intelligence.emerging.length,0);
});
test('top movers distinguish new and falling with actual previous source counts',()=>{
 const rows=I.normalizeRows([...Array.from({length:12},(_,i)=>row(i+1,{source:i%2?'hvg':'telex'})),row(99,{keywords:'más',publishedAt:new Date(end-50*3600000).toISOString()})]);
 const s=I.buildSnapshot(rows,options());assert.equal(s.movers.rising[0].isNew,true);assert.equal(s.highlights.length<=3,true);
 const old=I.normalizeRows(Array.from({length:12},(_,i)=>row(i+1,{source:i%2?'hvg':'telex',publishedAt:new Date(end-25*3600000).toISOString()})));
 assert.equal(I.buildSnapshot(old,options()).movers.falling[0].previous,12);
});
